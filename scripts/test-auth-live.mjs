import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { validateSupabaseConfig } from '../mobile/src/services/supabaseConfig.mjs';
import { createAuthService } from '../mobile/src/services/authService.js';
import { createAuthController } from '../mobile/src/services/authController.js';

if (existsSync('mobile/.env')) process.loadEnvFile('mobile/.env');
if (existsSync('mobile/.env.auth-test')) process.loadEnvFile('mobile/.env.auth-test');
const config = validateSupabaseConfig(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const mode = process.argv[2];
if (!['register', 'verify'].includes(mode)) throw new Error('Choose register or verify.');
const selectedRole = process.argv[3];
if (selectedRole && !['customer', 'biker'].includes(selectedRole)) throw new Error('Choose customer or biker.');
const report = (role, name, status, code) => console.log(JSON.stringify({ role, test: name, status, ...(code ? { code } : {}) }));
const ensure = (condition, code) => { if (!condition) { const error = new Error(code); error.code = code; throw error; } };
function createTestClient(storage) {
  return createClient(config.url, config.publishableKey, {
    auth: { persistSession: Boolean(storage), storage, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, options) => fetch(input, { ...options, signal: AbortSignal.timeout(20000) }) },
  });
}

let failures = 0;
for (const role of selectedRole ? [selectedRole] : ['customer', 'biker']) {
  const email = process.env[`AUTH_TEST_${role.toUpperCase()}_EMAIL`];
  const password = process.env[`AUTH_TEST_${role.toUpperCase()}_PASSWORD`];
  if (!email || !password) { report(role, 'test account configuration', 'NOT RUN', 'missing_test_account'); failures++; continue; }
  const values = {
    fullName: `Auth Test ${role === 'customer' ? 'Customer' : 'Biker'}`, email, password, confirmPassword: password,
    mobile: role === 'customer' ? '01700000901' : '01700000902', gender: 'undisclosed', role,
  };
  const store = new Map();
  const storage = { getItem: async (key) => store.get(key) ?? null, setItem: async (key, value) => { store.set(key, value); }, removeItem: async (key) => { store.delete(key); } };
  const client = createTestClient(mode === 'verify' ? storage : undefined);
  const service = createAuthService(client);
  let controller;
  try {
    if (mode === 'register') {
      const result = await service.register(values);
      report(role, 'email/password registration', 'PASS');
      report(role, 'email confirmation branch', result.session ? 'AUTO-CONFIRMED' : 'AWAITING USER CONFIRMATION');
      if (result.session) await client.auth.signOut({ scope: 'local' });
      continue;
    }
    let state;
    controller = createAuthController(client, (next) => { state = next; });
    await controller.start();
    await controller.login({ email, password });
    const deadline = Date.now() + 20000;
    while (!['authenticated', 'blocked', 'suspended'].includes(state.phase) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100));
    ensure(state.phase === 'authenticated', state.error?.code || 'profile_not_ready');
    ensure(state.profile.role === role, 'unexpected_database_role');
    ensure(/^\+?\d{10,15}$/.test(state.profile.mobile || ''), 'mobile_profile_missing');
    report(role, 'confirmed login and trusted profile role', 'PASS');
    controller.stop();
    controller = undefined;

    const resumed = createTestClient(storage);
    const restored = await resumed.auth.getSession();
    ensure(!restored.error && restored.data.session?.user.id === state.profile.id, 'session_restore_failed');
    ensure((await createAuthService(resumed).loadProfile(restored.data.session)).phase === 'authenticated', 'restored_profile_denied');
    report(role, 'SDK session restoration from persisted storage adapter', 'PASS');
    const refresh = await resumed.auth.refreshSession();
    ensure(!refresh.error && refresh.data.session?.user.id === state.profile.id, 'token_refresh_failed');
    report(role, 'refresh-token rotation', 'PASS');

    const directRoleChange = await resumed.from('profiles').update({ role: 'admin', account_status: 'active' }).eq('id', state.profile.id);
    ensure(directRoleChange.error?.code === '42501', 'role_mutation_not_denied');
    report(role, 'direct role/account-status mutation denied', 'PASS');
    const identity = await resumed.auth.getUser();
    const originalMetadata = identity.data.user.user_metadata;
    const changed = await resumed.auth.updateUser({ data: { role: 'admin' } });
    ensure(!changed.error, 'metadata_test_failed');
    try {
      const verified = await createAuthService(resumed).loadProfile(refresh.data.session);
      ensure(verified.profile.role === role, 'metadata_privilege_escalation');
      report(role, 'editable metadata cannot grant administrator', 'PASS');
    } finally {
      const restoredMetadata = await resumed.auth.updateUser({ data: { ...originalMetadata, role: originalMetadata?.role || role } });
      ensure(!restoredMetadata.error, 'metadata_restore_failed');
    }
    const duplicate = await createAuthService(createTestClient()).register(values).then(() => 'obfuscated', (error) => error.code);
    ensure(['obfuscated', 'user_already_exists', 'email_exists'].includes(duplicate), 'unexpected_duplicate_response');
    report(role, 'duplicate-account response handled', 'PASS');
    await resumed.auth.signOut({ scope: 'local' });
    ensure(!(await resumed.auth.getSession()).data.session, 'logout_retained_session');
    ensure(!(await createTestClient(storage).auth.getSession()).data.session, 'logout_retained_storage');
    report(role, 'logout clears persisted session', 'PASS');
  } catch (error) {
    failures++;
    report(role, mode, 'FAIL', error.code || 'operation_failed');
  } finally {
    controller?.stop();
    await client.removeAllChannels();
  }
}
if (mode === 'verify') {
  const invalid = await createTestClient().auth.signInWithPassword({ email: `nonexistent-${randomUUID()}@example.invalid`, password: randomUUID() });
  if (invalid.error?.code === 'invalid_credentials') report('anonymous', 'invalid credentials rejected', 'PASS');
  else { failures++; report('anonymous', 'invalid credentials rejected', 'FAIL', invalid.error?.code || 'unexpected_auth_response'); }
}
process.exitCode = failures ? 1 : 0;
