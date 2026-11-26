import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
for(const file of ['mobile/.env','mobile/.env.auth-test'])if(existsSync(file))process.loadEnvFile(file);
const make=()=>createClient(process.env.EXPO_PUBLIC_SUPABASE_URL,process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const customer=make(),biker=make(),anon=make();let original,rideId,channel;
const payload=()=>({p_request_key:crypto.randomUUID(),p_pickup_place_id:'fare-test-pickup',p_destination_place_id:'fare-test-destination',p_pickup_label:'Fare test pickup',p_destination_label:'Fare test destination',p_routing_mode:'DRIVE',p_expected_fare:180});
let resolveEvent;const events=[];
async function join(){
  await customer.realtime.setAuth((await customer.auth.getSession()).data.session.access_token);
  channel=customer.channel(`fare-test-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table:'bids',filter:`ride_id=eq.${rideId}`},event=>{events.push(event.new);resolveEvent?.();});
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('channel join timeout')),20000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(t);resolve();}if(status==='CHANNEL_ERROR'){clearTimeout(t);reject(new Error('channel error'));}});});
}
async function waitEvent(predicate){
  for(let i=0;i<4;i++){
    if(events.some(predicate))return;
    let timer;await new Promise(resolve=>{resolveEvent=()=>{clearTimeout(timer);resolve();};timer=setTimeout(resolve,5000);});
  }
  assert.ok(events.some(predicate),'expected bid event not received');
}
try{
  for(const [role,client]of[['CUSTOMER',customer],['BIKER',biker]]){const r=await client.auth.signInWithPassword({email:process.env[`AUTH_TEST_${role}_EMAIL`],password:process.env[`AUTH_TEST_${role}_PASSWORD`]});assert.ok(!r.error,'test login failed');}
  const snapshot=await biker.from('biker_profiles').select('is_online,motorcycle_model,plate_number').single();assert.ok(!snapshot.error);original=snapshot.data;
  if(!original.motorcycle_model || !original.plate_number)assert.ok(!(await biker.rpc('update_my_motorcycle',{p_model:'Fare test motorcycle',p_plate:`FARE-${crypto.randomUUID().slice(0,8)}`})).error);
  assert.ok(!(await biker.rpc('set_biker_availability',{p_online:true})).error);
  const existing=await customer.from('rides').select('id').in('status',['open','assigned','in_progress']).limit(1);assert.ok(!existing.error);
  if(existing.data.length)console.log('NOT RUN: live bid tests; pre-existing active customer ride left unchanged');
  else{
    const created=await customer.rpc('post_customer_ride',payload());assert.ok(!created.error);rideId=created.data;
    assert.equal((await anon.rpc('list_customer_bids',{p_ride_id:rideId})).error?.code,'42501');
    assert.equal((await biker.rpc('list_customer_bids',{p_ride_id:rideId})).error?.code,'42501');
    for(const p_amount of [0,-1,1.234])assert.equal((await biker.rpc('submit_bid',{p_ride_id:rideId,p_amount})).error?.code,'22023');
    await join();const first=await biker.rpc('submit_bid',{p_ride_id:rideId,p_amount:150});assert.ok(!first.error);await waitEvent(e=>e.id===first.data);
    console.log('PASS: valid bid and actual customer Realtime INSERT; invalid fares/unauthorized access denied');
    const repeats=await Promise.all([biker.rpc('submit_bid',{p_ride_id:rideId,p_amount:150}),biker.rpc('submit_bid',{p_ride_id:rideId,p_amount:150})]);assert.ok(repeats.every(r=>!r.error && r.data===first.data));
    const compare=await customer.rpc('list_customer_bids',{p_ride_id:rideId});assert.ok(!compare.error && compare.data.length===1 && compare.data[0].biker_name);assert.ok(!('mobile' in compare.data[0]));
    const direct=await biker.from('bids').update({amount:1}).eq('id',first.data);assert.equal(direct.error?.code,'42501');
    console.log('PASS: concurrent duplicate bids preserve one record; private comparison and direct-write denial');
    await customer.removeChannel(channel);channel=null;
    assert.ok(!(await biker.rpc('submit_bid',{p_ride_id:rideId,p_amount:145})).error);
    await join();const refreshed=await customer.rpc('list_customer_bids',{p_ride_id:rideId});assert.equal(Number(refreshed.data[0].amount),145);
    console.log('PASS: reconnect and authoritative refresh recover an update missed while disconnected');
    const [bid,close]=await Promise.all([biker.rpc('submit_bid',{p_ride_id:rideId,p_amount:140}),customer.rpc('transition_ride',{p_ride_id:rideId,p_status:'cancelled'})]);
    assert.ok(!close.error);assert.ok(!bid.error || bid.error.code==='42501');
    const mine=await biker.rpc('list_my_bids');assert.ok(!mine.error);assert.equal(mine.data.find(r=>r.ride_id===rideId).status,'withdrawn');
    assert.equal((await biker.rpc('submit_bid',{p_ride_id:rideId,p_amount:130})).error?.code,'42501');
    await waitEvent(e=>e.id===first.data && e.status==='withdrawn');
    console.log('PASS: concurrent bid/ride-close leaves no pending bid; closed ride rejects bids; withdrawal reaches customer Realtime');
    const fresh=await customer.rpc('post_customer_ride',payload());assert.ok(!fresh.error);rideId=fresh.data;
    const [creation,closing]=await Promise.all([biker.rpc('submit_bid',{p_ride_id:rideId,p_amount:155}),customer.rpc('transition_ride',{p_ride_id:rideId,p_status:'cancelled'})]);
    assert.ok(!closing.error && (!creation.error || creation.error.code==='42501'));
    const final=await customer.rpc('list_customer_bids',{p_ride_id:rideId});assert.ok(!final.error && final.data.length<=1 && final.data.every(b=>b.status==='withdrawn'));
    console.log('PASS: first-bid creation versus ride closing leaves zero pending bids');
  }
}catch(e){console.error('FAIL: '+e.message);process.exitCode=1;}
finally{
  if(channel)await customer.removeChannel(channel);
  if(rideId){
    const record=await customer.from('rides').select('status').eq('id',rideId).single();
    if(record.error){console.error('FAIL: could not verify test ride cleanup');process.exitCode=1;}
    else if(['open','assigned'].includes(record.data.status)){
      const r=await customer.rpc('transition_ride',{p_ride_id:rideId,p_status:'cancelled'});if(r.error){console.error('FAIL: test ride cleanup');process.exitCode=1;}else console.log('PASS: verification-created ride cancelled');
    }else console.log('PASS: verification-created ride already closed; no repeated transition');
  }
  if(original){await biker.rpc('set_biker_availability',{p_online:false});const v=await biker.rpc('update_my_motorcycle',{p_model:original.motorcycle_model,p_plate:original.plate_number});const a=await biker.rpc('set_biker_availability',{p_online:original.is_online});if(v.error||a.error){console.error('FAIL: biker restoration');process.exitCode=1;}else console.log('PASS: original biker settings restored');}
  await customer.auth.signOut({scope:'local'});await biker.auth.signOut({scope:'local'});
}
