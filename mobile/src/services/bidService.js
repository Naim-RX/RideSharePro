import { getSupabase } from './supabase';

function errorMessage(error) {
  return error?.code==='42501' ? new Error('These bids are not accessible with your current account.') : new Error('Could not load bids. Check your connection and try again.');
}
export function createBidService(client=getSupabase()) {
  return {
    async incoming(rideId,cursor=null) {
      const {data,error}=await client.rpc('list_customer_bids',{p_ride_id:rideId,p_after_amount:cursor?.amount ?? null,p_after_id:cursor?.id || null});
      if(error) throw errorMessage(error); return data || [];
    },
    async mine(cursor=null) {
      const {data,error}=await client.rpc('list_my_bids',{p_before:cursor?.created_at || null,p_before_id:cursor?.id || null});
      if(error) throw errorMessage(error); return data || [];
    },
    async ride(rideId,userId) {
      const {data,error}=await client.from('rides').select('id,status,pickup_label,destination_label,expected_fare').eq('id',rideId).eq('customer_id',userId).maybeSingle();
      if(error || !data) throw errorMessage(error || {code:'42501'}); return data;
    },
  };
}
export function subscribeBids(userId,rideId,onChange,onStatus,client=getSupabase()) {
  let disposed=false,timer;
  const refresh=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!disposed)onChange();},250);};
  let channel=client.channel(`bids:${userId}:${rideId || 'mine'}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'bids',filter:rideId?`ride_id=eq.${rideId}`:`biker_id=eq.${userId}`},refresh)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:`id=eq.${userId}`},refresh);
  if(rideId) channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'ride_availability_events',filter:`id=eq.${rideId}`},refresh);
  void(async()=>{
    try {
      const {data,error}=await client.auth.getSession();
      if(disposed)return;
      if(error || data.session?.user.id!==userId){onStatus?.(false);return;}
      await client.realtime.setAuth(data.session.access_token);
      if(!disposed)channel.subscribe(status=>{
        if(disposed)return;
        if(status==='SUBSCRIBED'){onStatus?.(true);refresh();}
        if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))onStatus?.(false);
      });
    }catch{if(!disposed)onStatus?.(false);}
  })();
  return()=>{disposed=true;clearTimeout(timer);void client.removeChannel(channel);};
}
export function comparisonCard(bid) {
  return {bikerName:bid.biker_name,motorcycleLabel:bid.motorcycle_model,status:bid.status,
    ratingLabel:bid.rating_count>0?`${Number(bid.average_rating).toFixed(1)} / 5 (${bid.rating_count})`:'Not yet rated',
    fareLabel:`BDT ${Number(bid.amount).toFixed(2)}`};
}
