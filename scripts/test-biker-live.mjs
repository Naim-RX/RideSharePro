import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
for(const file of ['mobile/.env','mobile/.env.auth-test']) if(existsSync(file)) process.loadEnvFile(file);
const sdk=()=>createClient(process.env.EXPO_PUBLIC_SUPABASE_URL,process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const biker=sdk(),customer=sdk(),anon=sdk(); let rideId,original,bikerId,channel;
const check=(condition,message)=>assert.ok(condition,message);
try {
  for(const [role,client] of [['BIKER',biker],['CUSTOMER',customer]]) {
    const result=await client.auth.signInWithPassword({email:process.env[`AUTH_TEST_${role}_EMAIL`],password:process.env[`AUTH_TEST_${role}_PASSWORD`]}); check(!result.error,'test login failed');
  }
  bikerId=(await biker.auth.getUser()).data.user.id;
  const status=await biker.from('biker_profiles').select('is_online,motorcycle_model,plate_number').eq('id',bikerId).single(); check(!status.error,'status read failed'); original=status.data;
  if(!original.motorcycle_model || !original.plate_number) check(!(await biker.rpc('update_my_motorcycle',{p_model:'Verification motorcycle',p_plate:`DEV-${crypto.randomUUID().slice(0,8)}`})).error,'vehicle setup failed');
  check(!(await biker.rpc('set_biker_availability',{p_online:false})).error,'offline change failed');
  check((await biker.rpc('list_biker_rides')).error?.code==='42501','offline discovery not rejected');
  check((await anon.rpc('list_biker_rides')).error?.code==='42501','anonymous discovery not rejected');
  check((await customer.rpc('list_biker_rides')).error?.code==='42501','customer discovery not rejected');
  console.log('PASS: offline, anonymous and customer discovery denied');
  check(!(await biker.rpc('set_biker_availability',{p_online:true})).error,'online change failed');
  const notifications=await biker.from('ride_availability_events').select('id').limit(1);check(!notifications.error,'notification SELECT denied');
  await biker.realtime.setAuth((await biker.auth.getSession()).data.session.access_token);
  const initial=await biker.rpc('list_biker_rides'); check(!initial.error && initial.data.length<=20,'limited discovery failed');
  for(const row of initial.data) check(!('customer_id' in row) && !('request_key' in row),'private projection leaked');
  console.log('PASS: persisted availability and limited private-data-free discovery');
  const active=await customer.from('rides').select('id').in('status',['open','assigned','in_progress']).limit(1); check(!active.error,'customer rides unavailable');
  if(active.data.length) { console.log('NOT RUN: creation/Realtime/bid checks; existing customer active ride left unchanged'); }
  else {
    let eventResolve; const events=[];
    const eventPromise=new Promise(resolve=>{eventResolve=resolve;});
    channel=biker.channel(`biker-live-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table:'ride_availability_events'},payload=>{events.push(payload.new);if(payload.new.id===rideId)eventResolve();});
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Realtime subscription timeout')),20000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}if(status==='CHANNEL_ERROR'){clearTimeout(timer);reject(new Error('Realtime channel error'));}});});
    const created=await customer.rpc('post_customer_ride',{p_request_key:crypto.randomUUID(),p_pickup_place_id:'development-pickup',p_destination_place_id:'development-destination',p_pickup_label:'Biker test pickup',p_destination_label:'Biker test destination',p_routing_mode:'DRIVE',p_expected_fare:180});
    check(!created.error,'test ride creation failed');rideId=created.data;
    if(!events.some(e=>e.id===rideId)) await Promise.race([eventPromise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Realtime event timeout')),20000))]);
    const event=events.find(e=>e.id===rideId);check(event && !('customer_id' in event) && !('pickup_label' in event),'notification leaked private data');
    console.log('PASS: live ride availability Realtime notification with minimal payload');
    const detail=await biker.rpc('get_biker_ride',{p_ride_id:rideId});check(!detail.error && detail.data.length===1,'authorized details unavailable');
    const raw=await biker.from('rides').select('id,request_key,customer_id').eq('id',rideId);check(!raw.error && raw.data.length===0,'private raw ride row visible');
    const bids=await Promise.all([biker.rpc('submit_bid',{p_ride_id:rideId,p_amount:170}),biker.rpc('submit_bid',{p_ride_id:rideId,p_amount:170})]);
    check(bids.every(b=>!b.error) && bids[0].data===bids[1].data,'duplicate bid not unique');
    check((await biker.rpc('submit_bid',{p_ride_id:rideId,p_amount:1.234})).error?.code==='22023','precision not rejected');
    check(!(await biker.rpc('set_biker_availability',{p_online:false})).error,'offline update failed');
    check((await biker.rpc('submit_bid',{p_ride_id:rideId,p_amount:160})).error?.code==='42501','offline bid accepted');
    console.log('PASS: minimal ride details, raw-row privacy, unique bids and offline/invalid-fare denial');
    check(!(await biker.rpc('set_biker_availability',{p_online:true})).error,'online restoration failed');
    await biker.removeChannel(channel);channel=null;
    console.log('PASS: live Realtime channel removed');
  }
} catch(e) { console.error('FAIL: '+e.message);process.exitCode=1; }
finally {
  if(channel) await biker.removeChannel(channel);
  if(rideId){const result=await customer.rpc('transition_ride',{p_ride_id:rideId,p_status:'cancelled'});if(result.error){console.error('FAIL: test ride cleanup');process.exitCode=1;}else console.log('PASS: cancelled verification-created ride only');}
  if(original && bikerId){
    await biker.rpc('set_biker_availability',{p_online:false});
    const vehicle=await biker.rpc('update_my_motorcycle',{p_model:original.motorcycle_model,p_plate:original.plate_number});
    const availability=await biker.rpc('set_biker_availability',{p_online:original.is_online});
    if(vehicle.error || availability.error){console.error('FAIL: could not restore test motorcycle/availability');process.exitCode=1;} else console.log('PASS: restored original test biker settings');
  }
  await biker.auth.signOut({scope:'local'});await customer.auth.signOut({scope:'local'});
}
