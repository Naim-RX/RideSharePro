import { jest } from '@jest/globals';

export function makeAuthClient({ role = 'customer', status = 'active', session: initialSession = null, profileMissing = false } = {}) {
  let session = initialSession;
  let listener;
  const user = { id: 'test-user-id', email: 'test@example.invalid', user_metadata: { role: 'admin' } };
  const profile = profileMissing ? null : { id: user.id, full_name: 'Test Account', mobile: '01712345678', gender: 'undisclosed', role, account_status: status };
  const buildSession = () => ({ access_token: 'synthetic-access-token', refresh_token: 'synthetic-refresh-token', user });
  const query = (table) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => ({ data: table === 'profiles' ? profile : { id: user.id }, error: null })),
  });
  const client = {
    user, profile, buildSession,
    from: jest.fn(query),
    emit(event, nextSession) { session = nextSession; listener?.(event, session); },
    auth: {
      getSession: jest.fn(async () => ({ data: { session }, error: null })),
      getUser: jest.fn(async () => ({ data: { user }, error: null })),
      onAuthStateChange: jest.fn((callback) => { listener = callback; return { data: { subscription: { unsubscribe: jest.fn(() => { listener = undefined; }) } } }; }),
      signInWithPassword: jest.fn(async () => { session = buildSession(); listener?.('SIGNED_IN', session); return { data: { session, user }, error: null }; }),
      signUp: jest.fn(async () => ({ data: { user, session: null }, error: null })),
      resend: jest.fn(async () => ({ error: null })),
      signOut: jest.fn(async () => { session = null; listener?.('SIGNED_OUT', null); return { error: null }; }),
    },
  };
  return client;
}

export const settleAuth = () => new Promise((resolve) => setTimeout(resolve, 0));
