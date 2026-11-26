import { existsSync } from 'node:fs';
import { validateSupabaseConfig } from '../mobile/src/services/supabaseConfig.mjs';

if (existsSync('mobile/.env')) process.loadEnvFile('mobile/.env');
try {
  const { url, publishableKey } = validateSupabaseConfig(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: publishableKey }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Auth settings request failed (HTTP ${response.status}).`);
  const settings = await response.json();
  console.log(JSON.stringify({
    reachable: true,
    emailPasswordEnabled: settings.external?.email === true,
    signupAllowed: settings.disable_signup !== true,
    emailConfirmationRequired: settings.mailer_autoconfirm === false,
    phoneProviderEnabled: settings.external?.phone === true,
  }, null, 2));
} catch {
  console.error('FAIL: could not read public Auth settings. Check configuration and network access.');
  process.exitCode = 1;
}
