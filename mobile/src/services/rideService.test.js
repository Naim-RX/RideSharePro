import { createRideService, validateDraft, validateFare } from './rideService';
jest.mock('./supabase', () => ({ getSupabase: jest.fn() }));
const draft = { requestKey: '10000000-0000-4000-8000-000000000001', pickupPlaceId: 'pickup', destinationPlaceId: 'destination', pickupLabel: 'Campus gate', destinationLabel: 'Library', mode: 'TWO_WHEELER', fare: '125.50' };
function setup() {
  const map = new Map();
  const storage = { getItem: jest.fn(async k => map.get(k) || null), setItem: jest.fn(async (k,v) => { map.set(k,v); }), removeItem: jest.fn(async k => { map.delete(k); }) };
  const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn(async () => ({ data: null, error: null })) };
  const client = { rpc: jest.fn(), from: jest.fn(() => query) };
  return { storage, client, query, service: createRideService(client, storage) };
}
test('validates BDT strictly without rounding invalid input', () => {
  for (const value of ['', '0', '-2', '1.234', 'NaN', '1e3', '1000000', '2,000']) expect(validateFare(value)).toBe(false);
  for (const value of ['0.01', '125', '999999.99']) expect(validateFare(value)).toBe(true);
  expect(validateDraft({ ...draft, pickupPlaceId: null })).toBe(false);
  expect(validateDraft({ ...draft, destinationPlaceId: draft.pickupPlaceId })).toBe(false);
});
test('persists before RPC and clears only after confirmed creation', async () => {
  const { client, storage, service } = setup();
  client.rpc.mockImplementation(async () => { expect(storage.setItem).toHaveBeenCalled(); return { data: 'ride-id', error: null }; });
  expect(await service.submit('customer', draft)).toBe('ride-id');
  expect(client.rpc).toHaveBeenCalledWith('post_customer_ride', expect.objectContaining({ p_request_key: draft.requestKey, p_expected_fare: '125.50' }));
  expect(client.rpc.mock.calls[0][1]).not.toHaveProperty('customer_id');
  expect(await service.pending('customer')).toBeNull();
});
test('network failure survives a service restart and retries the identical request', async () => {
  const { client, storage, service } = setup();
  client.rpc.mockResolvedValueOnce({ error: { message: 'fetch failed' } }).mockResolvedValueOnce({ data: 'same-ride', error: null });
  await expect(service.submit('customer', draft)).rejects.toThrow('retry the same request');
  const restarted = createRideService(client, storage);
  expect(await restarted.pending('customer')).toEqual(draft);
  await expect(restarted.submit('customer', { ...draft, fare: '200' })).rejects.toThrow('previous request');
  await restarted.submit('customer', await restarted.pending('customer'));
  expect(client.rpc.mock.calls[0]).toEqual(client.rpc.mock.calls[1]);
  expect(await restarted.pending('other-customer')).toBeNull();
});
test('reconciles a committed response lost in transit without posting again', async () => {
  const { client, query, service } = setup();
  client.rpc.mockResolvedValue({ error: { message: 'timeout' } });
  await expect(service.submit('customer', draft)).rejects.toThrow();
  query.maybeSingle.mockResolvedValue({ data: { id: 'committed' }, error: null });
  expect(await service.reconcile('customer')).toBeNull(); expect(client.rpc).toHaveBeenCalledTimes(1);
  expect(query.eq).toHaveBeenCalledWith('customer_id', 'customer');
});
test('does not send invalid fields and clears definitive database rejection', async () => {
  const { client, service } = setup();
  await expect(service.submit('customer', { ...draft, fare: '0' })).rejects.toThrow(); expect(client.rpc).not.toHaveBeenCalled();
  client.rpc.mockResolvedValue({ error: { code: '23505' } });
  await expect(service.submit('customer', draft)).rejects.toThrow('active ride'); expect(await service.pending('customer')).toBeNull();
});
