import { createClient } from 'npm:@supabase/supabase-js@2.119.2';
import { googleRequest, MapError, validateRequest } from './core.mjs';

// Gateway JWT checking is disabled only because this handler verifies the bearer
// token with Auth itself (supports current asymmetric signing keys).
Deno.serve(async (request: Request) => {
  const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '60' } : {}) },
  });
  try {
    if (request.method !== 'POST') return reply(405, { error: 'POST required.' });
    const authorization = request.headers.get('Authorization') || '';
    if (!/^Bearer \S+$/.test(authorization)) return reply(401, { error: 'Sign in to use maps.' });
    const url = Deno.env.get('SUPABASE_URL')!;
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await service.auth.getUser(authorization.slice(7));
    if (error || !user) return reply(401, { error: 'Session expired. Sign in again.' });
    const { data: profile } = await service.from('profiles').select('role,account_status').eq('id', user.id).maybeSingle();
    if (!['customer','biker'].includes(profile?.role) || profile?.account_status !== 'active') return reply(403, { error: 'An active authorized account is required.' });
    // Stream bound also protects against missing/forged Content-Length headers.
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: 'Request body required.' });
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return reply(413, { error: 'Request too large.' }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let parsed;
    try { parsed = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply(400, { error: 'Invalid JSON.' }); }
    if (profile.role === 'biker' && parsed?.action !== 'biker_route') return reply(403, { error: 'This map operation is not permitted.' });
    const body = validateRequest(parsed);
    if ((profile.role === 'biker') !== (body.action === 'biker_route')) return reply(403, { error: 'This map operation is not permitted.' });
    let routePoints;
    if (body.action === 'biker_route') {
      const result = await service.rpc('get_biker_route_points', { p_user_id: user.id, p_ride_id: body.rideId });
      if (result.error || !result.data) return reply(403, { error: 'Go online and choose an available ride.' });
      routePoints = result.data;
    }
    const { data: allowed, error: budgetError } = await service.rpc('consume_maps_budget', { p_user_id: user.id, p_action: routePoints ? 'route' : body.action });
    if (budgetError) return reply(503, { error: 'Map authorization unavailable. Try again.' });
    if (!allowed) return reply(429, { error: 'Too many map requests. Wait one minute.' });
    const key = Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY');
    if (!key) return reply(503, { error: 'Google Maps is not configured yet.' });
    return reply(200, await googleRequest(routePoints ? { action: 'route', ...routePoints } : body, key));
  } catch (error) {
    if (error instanceof MapError) return reply(error.status, { error: error.message });
    return reply(500, { error: 'Map request failed. Try again.' });
  }
});
