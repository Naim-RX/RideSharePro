import {comparisonCard,createBidService,subscribeBids} from './bidService';
jest.mock('./supabase',()=>({getSupabase:jest.fn()}));
test('incoming bids and own offers use authorized paginated RPCs',async()=>{
  const client={rpc:jest.fn().mockResolvedValue({data:[],error:null})};const service=createBidService(client);
  await service.incoming('ride',{amount:125,id:'bid'});await service.mine();
  expect(client.rpc).toHaveBeenCalledWith('list_customer_bids',{p_ride_id:'ride',p_after_amount:125,p_after_id:'bid'});
  expect(client.rpc).toHaveBeenCalledWith('list_my_bids',{p_before:null,p_before_id:null});
  client.rpc.mockResolvedValue({error:{code:'42501'}});await expect(service.incoming('other')).rejects.toThrow('not accessible');
});
test('rating cards distinguish genuine ratings from unrated bikers',()=>{
  expect(comparisonCard({biker_name:'Biker',amount:125,status:'pending',rating_count:0})).toMatchObject({ratingLabel:'Not yet rated',fareLabel:'BDT 125.00'});
  expect(comparisonCard({biker_name:'Biker',amount:100,rating_count:3,average_rating:4.33}).ratingLabel).toBe('4.3 / 5 (3)');
});
test('bid subscription filters by ride, refreshes after reconnect and ignores callbacks after cleanup',async()=>{
  jest.useFakeTimers();let status;const callbacks=[];
  const channel={on:jest.fn((event,filter,handler)=>{callbacks.push(handler);return channel;}),subscribe:jest.fn(fn=>{status=fn;return channel;})};
  const client={channel:()=>channel,auth:{getSession:async()=>({data:{session:{user:{id:'user'},access_token:'test-token'}}})},realtime:{setAuth:jest.fn().mockResolvedValue()},removeChannel:jest.fn().mockResolvedValue()};
  const refresh=jest.fn();const connection=jest.fn();const stop=subscribeBids('user','ride',refresh,connection,client);
  await Promise.resolve();await Promise.resolve();status('SUBSCRIBED');jest.advanceTimersByTime(250);
  status('CHANNEL_ERROR');status('SUBSCRIBED');callbacks[0]();jest.advanceTimersByTime(250);
  expect(refresh).toHaveBeenCalledTimes(2);expect(channel.on.mock.calls[0][1].filter).toBe('ride_id=eq.ride');
  callbacks[0]();stop();jest.advanceTimersByTime(500);status('SUBSCRIBED');expect(refresh).toHaveBeenCalledTimes(2);expect(client.removeChannel).toHaveBeenCalledWith(channel);jest.useRealTimers();
});
