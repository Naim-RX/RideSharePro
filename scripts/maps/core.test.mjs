import test from 'node:test';
import assert from 'node:assert/strict';
import { googleRequest, validateRequest } from '../../supabase/functions/google-maps/core.mjs';
const token = '10000000-0000-4000-8000-000000000001';
const route = { action: 'route', origin: { latitude: 23, longitude: 90 }, destination: { latitude: 24, longitude: 91 } };
test('validates actions, coordinates, place IDs, and session tokens', () => {
  for (const body of [null, {}, { ...route, origin: { latitude: '23', longitude: 90 } }, { ...route, destination: route.origin }, { action: 'details', placeId: '../secret', sessionToken: token }, { action: 'autocomplete', input: 'Campus', sessionToken: 'bad' }]) assert.throws(() => validateRequest(body));
  assert.equal(validateRequest(route).action, 'route');
});
test('autocomplete forwards the session and returns only predictions', async () => {
  const data = await googleRequest({ action: 'autocomplete', input: 'Campus', sessionToken: token }, 'test-only', async (url, options) => {
    assert.equal(JSON.parse(options.body).sessionToken, token);
    assert.ok(url.startsWith('https://places.googleapis.com/'));
    return Response.json({ suggestions: [{ placePrediction: { placeId: 'abc', text: { text: 'Campus' } } }, { queryPrediction: {} }] });
  });
  assert.deepEqual(data.suggestions, [{ placeId: 'abc', label: 'Campus' }]);
});
test('unsupported motorcycle routes fall back to an explicitly labeled driving estimate', async () => {
  const modes = [];
  const data = await googleRequest(route, 'test-only', async (_, options) => {
    modes.push(JSON.parse(options.body).travelMode);
    return modes.length === 1 ? Response.json({ error: { message: 'TWO_WHEELER travel mode is not supported' } }, { status: 400 }) : Response.json({ routes: [{ distanceMeters: 1200, duration: '180s', polyline: { encodedPolyline: 'test' } }] });
  });
  assert.deepEqual(modes, ['TWO_WHEELER', 'DRIVE']); assert.equal(data.mode, 'DRIVE');
});
test('quota and permission errors never trigger driving retries or leak Google error text', async () => {
  for (const status of [403, 429]) {
    let calls = 0;
    await assert.rejects(googleRequest(route, 'test-only', async () => { calls++; return Response.json({ error: { message: 'private-key-diagnostic' } }, { status }); }), error => !error.message.includes('private-key-diagnostic'));
    assert.equal(calls, 1);
  }
});
test('no road route produces a clear error after the driving fallback', async () => {
  await assert.rejects(googleRequest(route, 'test-only', async () => Response.json({ routes: [] })), /No road route/);
});
test('biker route requests require a ride UUID and use server-provided place waypoints', async () => {
  assert.throws(()=>validateRequest({action:'biker_route',rideId:'../other'}));
  assert.equal(validateRequest({action:'biker_route',rideId:token}).rideId,token);
  const result=await googleRequest({action:'route',origin:{placeId:'pickup'},destination:{placeId:'destination'}},'test-only',async(_,options)=>{
    const body=JSON.parse(options.body);assert.deepEqual(body.origin,{placeId:'pickup'});
    return Response.json({routes:[{distanceMeters:1000,duration:'120s',polyline:{encodedPolyline:'test'},legs:[{startLocation:{latLng:{latitude:23,longitude:90}},endLocation:{latLng:{latitude:24,longitude:91}}}]}]});
  });
  assert.deepEqual(result.pickup,{latitude:23,longitude:90});assert.equal(result.mode,'TWO_WHEELER');
});
