export class MapError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = () => { throw new MapError(400, 'Invalid map request.'); };
export function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) bad();
  const { action, sessionToken, input, placeId, origin, destination, rideId } = body;
  if (action === 'autocomplete' || action === 'details') {
    if (typeof sessionToken !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionToken)) bad();
    if (action === 'autocomplete' && (typeof input !== 'string' || input.trim().length < 3 || input.length > 200)) bad();
    if (action === 'details' && (typeof placeId !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(placeId))) bad();
  } else if (action === 'route') {
    for (const point of [origin, destination]) {
      if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) bad();
    }
    if (origin.latitude === destination.latitude && origin.longitude === destination.longitude) throw new MapError(400, 'Choose different pickup and destination locations.');
  } else if (action === 'biker_route') {
    if (typeof rideId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rideId)) bad();
  } else bad();
  return { action, sessionToken, input, placeId, origin, destination, rideId };
}

export async function googleRequest(body, key, fetcher = fetch) {
  async function request(url, payload, mask) {
    let response;
    try {
      response = await fetcher(url, {
        method: payload ? 'POST' : 'GET', signal: AbortSignal.timeout(12000),
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': mask },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
    } catch { throw new MapError(504, 'Google Maps timed out. Try again.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new MapError(response.status === 429 ? 429 : 502, response.status === 429 ? 'Map quota reached. Try again later.' : 'Google Maps is unavailable. Check configuration or try again.');
      error.unsupportedMode = response.status === 400 && /two.wheel|travel.?mode/i.test(data.error?.message || '') && /support|available/i.test(data.error?.message || '');
      throw error;
    }
    return data;
  }
  if (body.action === 'autocomplete') {
    const data = await request('https://places.googleapis.com/v1/places:autocomplete', { input: body.input.trim(), sessionToken: body.sessionToken, languageCode: 'en' }, 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text');
    return { suggestions: (data.suggestions || []).filter(s => s.placePrediction).slice(0, 5).map(s => ({ placeId: s.placePrediction.placeId, label: s.placePrediction.text.text })) };
  }
  if (body.action === 'details') {
    const data = await request(`https://places.googleapis.com/v1/places/${encodeURIComponent(body.placeId)}?sessionToken=${encodeURIComponent(body.sessionToken)}`, null, 'id,formattedAddress,location,attributions');
    if (!data.location) throw new MapError(404, 'This place has no selectable location.');
    return { placeId: data.id, label: data.formattedAddress, ...data.location, attributions: data.attributions || [] };
  }
  const compute = mode => request('https://routes.googleapis.com/directions/v2:computeRoutes', {
    origin: body.origin.placeId ? { placeId: body.origin.placeId } : { location: { latLng: body.origin } }, destination: body.destination.placeId ? { placeId: body.destination.placeId } : { location: { latLng: body.destination } },
    travelMode: mode, polylineQuality: 'OVERVIEW', polylineEncoding: 'ENCODED_POLYLINE',
  }, 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation');
  let data; let mode = 'TWO_WHEELER';
  try { data = await compute(mode); } catch (error) { if (!error.unsupportedMode) throw error; mode = 'DRIVE'; data = await compute(mode); }
  if (!data.routes?.length && mode === 'TWO_WHEELER') { mode = 'DRIVE'; data = await compute(mode); }
  const route = data.routes?.[0];
  if (!route) throw new MapError(404, 'No road route found. Choose other locations.');
  const durationSeconds = Number(route.duration?.replace(/s$/, ''));
  if (!Number.isFinite(route.distanceMeters) || !Number.isFinite(durationSeconds) || !route.polyline?.encodedPolyline) throw new MapError(502, 'Google returned an incomplete route.');
  return { distanceMeters: route.distanceMeters, durationSeconds, encodedPolyline: route.polyline.encodedPolyline, mode,
    ...(route.legs?.length ? { pickup: route.legs[0].startLocation?.latLng, destination: route.legs.at(-1).endLocation?.latLng } : {}) };
}
