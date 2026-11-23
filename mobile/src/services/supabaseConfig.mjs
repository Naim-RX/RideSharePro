export function validateSupabaseConfig(urlValue, keyValue) {
  const url = (urlValue || '').trim();
  const publishableKey = (keyValue || '').trim();
  if (!url || !publishableKey) {
    throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in mobile/.env.');
  }
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Supabase project URL is invalid.'); }
  const localHosts = ['localhost', '127.0.0.1', '10.0.2.2'];
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && localHosts.includes(parsed.hostname))) {
    throw new Error('Supabase URL must use HTTPS, except a local development endpoint.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) {
    throw new Error('Use only the Supabase project origin, without credentials, paths, or query strings.');
  }
  // New projects supply publishable keys. Reject both server secrets and legacy JWT keys.
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new Error('Use a Supabase publishable key beginning sb_publishable_. Never use a secret or service-role key.');
  }
  return { url: parsed.origin, publishableKey };
}
