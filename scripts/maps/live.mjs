// Uses only existing owned test accounts; never prints credentials or Google content.
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
for (const file of ['mobile/.env', 'mobile/.env.auth-test']) if (existsSync(file)) process.loadEnvFile(file);
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
async function call(body, token) {
  const response = await fetch(`${url}/functions/v1/google-maps`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) });
  return { status: response.status, data: await response.json() };
}
let failed = false;
try {
  assert.equal((await call({ action: 'route' })).status, 401);
  assert.equal((await call({}, 'invalid-token')).status, 401);
  console.log('PASS: anonymous and invalid-token requests rejected');
  for (const role of ['biker', 'customer']) {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    try {
      const { data, error } = await client.auth.signInWithPassword({ email: process.env[`AUTH_TEST_${role.toUpperCase()}_EMAIL`], password: process.env[`AUTH_TEST_${role.toUpperCase()}_PASSWORD`] });
      assert.ok(!error && data.session, 'test account login failed');
      const token = data.session.access_token;
      assert.equal((await call({}, token)).status, role === 'biker' ? 403 : 400);
      console.log(`PASS: ${role} authorization/validation`);
      if (role === 'biker') continue;
      const sessionToken = crypto.randomUUID();
      const predictions = await call({ action: 'autocomplete', input: 'University of Dhaka', sessionToken }, token);
      if (predictions.status === 503) { console.log('NOT RUN: live Google API requests; server configuration unavailable'); continue; }
      assert.equal(predictions.status, 200, `autocomplete HTTP ${predictions.status}`);
      assert.ok(predictions.data.suggestions?.length, 'no autocomplete suggestions');
      const place = await call({ action: 'details', placeId: predictions.data.suggestions[0].placeId, sessionToken }, token);
      assert.equal(place.status, 200, `details HTTP ${place.status}`);
      assert.ok(Number.isFinite(place.data.latitude));
      const route = await call({ action: 'route', origin: { latitude: place.data.latitude, longitude: place.data.longitude }, destination: { latitude: 23.7776, longitude: 90.4008 } }, token);
      assert.equal(route.status, 200, `route HTTP ${route.status}`);
      assert.ok(route.data.distanceMeters > 0 && route.data.durationSeconds > 0 && route.data.encodedPolyline);
      console.log(`PASS: live autocomplete, session-linked details, road route (${route.data.mode})`);
      const sdk = await client.functions.invoke('google-maps', { body: { action: 'route', origin: { latitude: 23.733, longitude: 90.398 }, destination: { latitude: 23.751, longitude: 90.39 } } });
      assert.ok(!sdk.error && sdk.data?.encodedPolyline, 'session-aware SDK invocation failed');
      console.log('PASS: authenticated Supabase SDK function invocation');
    } finally { await client.auth.signOut({ scope: 'local' }); }
  }
} catch (error) { console.error(`FAIL: ${error.message}`); failed = true; }
process.exitCode = failed ? 1 : 0;
