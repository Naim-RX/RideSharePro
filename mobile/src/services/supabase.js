import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { validateSupabaseConfig } from './supabaseConfig.mjs';

let client;
let appStateSubscription;

// Lazy: the UI foundation still runs without a configured backend or any network call.
export function getSupabase() {
  if (client) return client;
  const config = validateSupabaseConfig(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  client = createClient(config.url, config.publishableKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
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
  client?.removeAllChannels();
  client = undefined;
}
