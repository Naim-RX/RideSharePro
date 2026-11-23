import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { validateSupabaseConfig } from './supabaseConfig.mjs';
import { fetchWithTimeout } from './fetchWithTimeout';

let client;
let appStateSubscription;

// A single project-scoped client; credentials are validated only when initialized.
export function getSupabase() {
  if (client) return client;
  const config = validateSupabaseConfig(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  client = createClient(config.url, config.publishableKey, {
    global: { fetch: fetchWithTimeout },
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // SDK 2.119 coordinates refresh/logout safely by default; legacy locks are deprecated.
    },
  });
  function updateRefresh(state) {
    if (state === 'active') client?.auth.startAutoRefresh();
    else client?.auth.stopAutoRefresh();
  }
  updateRefresh(AppState.currentState);
  appStateSubscription = AppState.addEventListener('change', updateRefresh);
  return client;
}

// Call during a future application teardown, not during ordinary screen changes.
export function disposeSupabase() {
  appStateSubscription?.remove();
  appStateSubscription = undefined;
  client?.auth.stopAutoRefresh();
  client?.auth.dispose?.();
  client?.removeAllChannels();
  client = undefined;
}
