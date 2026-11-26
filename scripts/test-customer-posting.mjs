import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
for (const file of ['mobile/.env', 'mobile/.env.auth-test']) if (existsSync(file)) process.loadEnvFile(file);
const url = process.env.EXPO_PUBLIC_SUPABASE_URL; const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, options) => fetch(input, { ...options, signal: AbortSignal.timeout(30000) }) } });
const customer = client(); const biker = client(); const anonymous = client(); let created;
const payload = { p_request_key: crypto.randomUUID(), p_pickup_place_id: 'development-pickup', p_destination_place_id: 'development-destination', p_pickup_label: 'Development test pickup', p_destination_label: 'Development test destination', p_routing_mode: 'DRIVE', p_expected_fare: '125.50' };
try {
  for (const [role, sdk] of [['CUSTOMER', customer], ['BIKER', biker]]) {
    const { error } = await sdk.auth.signInWithPassword({ email: process.env[`AUTH_TEST_${role}_EMAIL`], password: process.env[`AUTH_TEST_${role}_PASSWORD`] }); assert.ok(!error, `${role.toLowerCase()} test login failed`);
  }
  assert.equal((await anonymous.rpc('post_customer_ride', payload)).error?.code, '42501');
  assert.equal((await biker.rpc('post_customer_ride', payload)).error?.code, '42501');
  console.log('PASS: anonymous and biker posting denied');
  for (const invalid of [{ p_expected_fare: '0' }, { p_expected_fare: '1.234' }, { p_pickup_place_id: null }]) assert.ok((await customer.rpc('post_customer_ride', { ...payload, ...invalid })).error, 'invalid payload accepted');
  console.log('PASS: invalid fares and missing location denied');
  const current = await customer.from('rides').select('id').in('status', ['open','assigned','in_progress']).limit(1); assert.ok(!current.error);
  if (current.data.length) { console.log('NOT RUN: live creation; test account already has an active ride, which was left unchanged'); }
  else {
    const results = await Promise.all([customer.rpc('post_customer_ride', payload), customer.rpc('post_customer_ride', payload)]);
    for (const result of results) { if (result.data) created = result.data; assert.ok(!result.error, `posting failed: ${result.error?.code}`); }
    assert.equal(results[0].data, results[1].data);
    console.log('PASS: concurrent duplicate submissions create one ride');
    const record = await customer.from('rides').select('*').eq('id', created).single(); assert.ok(!record.error);
    const identity = await customer.auth.getUser();
    assert.equal(record.data.customer_id, identity.data.user.id); assert.equal(record.data.status, 'open'); assert.equal(record.data.pickup_latitude, null); assert.equal(record.data.distance_meters, null);
    const forged = await customer.from('rides').update({ customer_id: crypto.randomUUID() }).eq('id', created); assert.equal(forged.error?.code, '42501');
    console.log('PASS: persisted open ride, server-derived owner, permitted storage and ownership-edit denial');
    const repeatChanged = await customer.rpc('post_customer_ride', { ...payload, p_expected_fare: '200' }); assert.equal(repeatChanged.error?.code, '22023');
    console.log('PASS: changed-payload replay rejected');
  }
} catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 1; }
finally {
  if (created) {
    const result = await customer.rpc('transition_ride', { p_ride_id: created, p_status: 'cancelled' });
    if (result.error) { console.error('FAIL: could not cancel the verification-created ride'); process.exitCode = 1; }
    else console.log('PASS: cancelled only the ride created by this verification');
  }
  await customer.auth.signOut({ scope: 'local' }); await biker.auth.signOut({ scope: 'local' });
}
