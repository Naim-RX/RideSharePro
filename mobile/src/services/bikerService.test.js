import { createBikerService, subscribeBiker } from './bikerService';
jest.mock('./supabase', () => ({ getSupabase: jest.fn() }));
test('non-editable bid rejection must not report missing motorcycle details', async () => {
  const rpc=jest.fn().mockResolvedValue({error:{code:'23514'}});
  await expect(createBikerService({rpc}).bid('ride','150')).rejects.toThrow('can no longer be changed');
});
test('availability and pagination use checked RPCs with a bounded cursor', async () => {
  const rpc = jest.fn().mockResolvedValue({ data:[],error:null }); const service = createBikerService({ rpc });
  await service.availability(true); await service.list(false,{ created_at:'2026-11-26T00:00:00Z',id:'ride' });
  expect(rpc).toHaveBeenCalledWith('set_biker_availability',{p_online:true});
  expect(rpc).toHaveBeenCalledWith('list_biker_rides',{p_history:false,p_before:'2026-11-26T00:00:00Z',p_before_id:'ride'});
});
test('bid validation prevents invalid requests and permission errors remain controlled', async () => {
  const rpc = jest.fn().mockResolvedValue({ error:{code:'42501'} }); const service = createBikerService({rpc});
  await expect(service.bid('ride','1.234')).rejects.toThrow('two decimal'); expect(rpc).not.toHaveBeenCalled();
  await expect(service.bid('ride','150')).rejects.toThrow('active biker');
});
test('Realtime invalidations debounce, reconnect refreshes and disposal cancels pending work', async () => {
  jest.useFakeTimers(); const callbacks = []; let status;
  const channel = { on:jest.fn((kind,filter,handler)=>{callbacks.push(handler);return channel;}),subscribe:jest.fn(handler=>{status=handler;return channel;}) };
  const client = {channel:jest.fn(()=>channel),removeChannel:jest.fn().mockResolvedValue('ok'),auth:{getSession:jest.fn().mockResolvedValue({data:{session:{user:{id:'biker'},access_token:'test-token'}}})},realtime:{setAuth:jest.fn().mockResolvedValue(undefined)}};
  const changed = jest.fn(); const connection=jest.fn(); const stop=subscribeBiker('biker',changed,connection,client);
  await Promise.resolve(); await Promise.resolve();
  expect(client.realtime.setAuth).toHaveBeenCalledWith('test-token');
  status('SUBSCRIBED'); callbacks[0](); callbacks[0](); jest.advanceTimersByTime(350);
  expect(changed).toHaveBeenCalledTimes(1); expect(connection).toHaveBeenCalledWith(true);
  status('CHANNEL_ERROR'); expect(connection).toHaveBeenLastCalledWith(false);
  callbacks[1](); stop(); jest.advanceTimersByTime(500); status('SUBSCRIBED');
  expect(changed).toHaveBeenCalledTimes(1); expect(client.removeChannel).toHaveBeenCalledWith(channel);
  expect(channel.on.mock.calls[0][1].table).toBe('ride_availability_events');
  expect(channel.on.mock.calls[1][1].filter).toBe('id=eq.biker'); jest.useRealTimers();
});
