import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { validateSupabaseConfig } from '../mobile/src/services/supabaseConfig.mjs';

if (existsSync('mobile/.env')) process.loadEnvFile('mobile/.env');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.log('NOT RUN: create the new Supabase project and populate mobile/.env first.');
  process.exitCode = 2;
} else {
  try {
    const config = validateSupabaseConfig(url, key);
    const client = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, options) => fetch(input, { ...options, signal: AbortSignal.timeout(15000) }) },
    });
    const { data, error } = await client.rpc('backend_health');
    if (error || data?.application !== 'RideShare Pro' || data?.schema_version !== '20261120000300') {
      throw new Error('Health RPC failed or migrations are missing. Check the project URL, publishable key, and migration deployment.');
    }
    // The publishable key alone is anonymous. Every app table must reject reads.
    for (const table of ['profiles', 'biker_profiles', 'rides', 'bids', 'ratings', 'complaints', 'admin_audit_logs', 'ride_availability_events']) {
      const result = await client.from(table).select('id').limit(1);
      if (!result.error || result.error.code !== '42501') {
        throw new Error(`Anonymous table-access check failed for ${table}.`);
      }
    }
    console.log('PASS: hosted health RPC and anonymous denial on all eight application tables.');
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
