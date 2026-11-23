import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { afterEach } from '@jest/globals';
import { getSupabase, disposeSupabase } from './supabase';
import { validateSupabaseConfig } from './supabaseConfig.mjs';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const originalKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  disposeSupabase();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  else process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('requires explicit public configuration before creating a client', () => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  expect(() => getSupabase()).toThrow('Set EXPO_PUBLIC_SUPABASE_URL');
  expect(createClient).not.toHaveBeenCalled();
});

test('rejects server secrets, legacy JWT keys, insecure hosted URLs and embedded credentials', () => {
  for (const key of ['sb_secret_NOT_A_REAL_KEY', 'eyJhbGciOiJIUzI1NiJ9.fake.signature', 'service_role']) {
    expect(() => validateSupabaseConfig('https://example.supabase.co', key)).toThrow('publishable key');
  }
  for (const url of ['http://example.supabase.co', 'https://name:password@example.supabase.co', 'https://example.supabase.co/rest/v1', 'not-a-url']) {
    expect(() => validateSupabaseConfig(url, 'sb_publishable_SYNTHETIC_TEST_KEY')).toThrow();
  }
});

test('allows HTTPS projects and the Android emulator local-development origin', () => {
  expect(validateSupabaseConfig('https://example.supabase.co/', 'sb_publishable_SYNTHETIC_TEST_KEY').url).toBe('https://example.supabase.co');
  expect(validateSupabaseConfig('http://10.0.2.2:54321', 'sb_publishable_SYNTHETIC_TEST_KEY').url).toBe('http://10.0.2.2:54321');
});

test('creates one persisted client and manages refresh once per application lifecycle', () => {
  const client = {
    auth: { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() },
    removeAllChannels: jest.fn(),
  };
  createClient.mockReturnValue(client);
  const remove = jest.fn();
  let onState;
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    onState = callback;
    return { remove };
  });
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_SYNTHETIC_TEST_KEY';
  expect(getSupabase()).toBe(client);
  expect(getSupabase()).toBe(client);
  expect(createClient).toHaveBeenCalledTimes(1);
  expect(subscription).toHaveBeenCalledTimes(1);
  expect(createClient.mock.calls[0][2].auth).toEqual({
    storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
  });
  onState('active');
  expect(client.auth.startAutoRefresh).toHaveBeenCalled();
  onState('background');
  expect(client.auth.stopAutoRefresh).toHaveBeenCalled();
  disposeSupabase();
  expect(remove).toHaveBeenCalledTimes(1);
});
