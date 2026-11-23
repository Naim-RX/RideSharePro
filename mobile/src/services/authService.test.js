import { createAuthService, confirmationMessage } from './authService';
import { makeAuthClient } from '../test/authClient';

const values = { fullName: ' Test Rider ', email: 'RIDER@example.com ', mobile: '+880 1712-345678', password: 'Secure123', confirmPassword: 'Secure123', gender: 'undisclosed', role: 'biker' };

test('registration sends email credentials and profile metadata, never SMS credentials or client table writes', async () => {
  const client = makeAuthClient({ role: 'biker' });
  const result = await createAuthService(client).register(values);
  expect(client.auth.signUp).toHaveBeenCalledWith({ email: 'rider@example.com', password: 'Secure123', options: { data: { full_name: 'Test Rider', mobile: '+8801712345678', gender: 'undisclosed', role: 'biker' } } });
  expect(client.from).not.toHaveBeenCalled();
  expect(result.message).toBe(confirmationMessage);
  expect(result.session).toBeNull();
});

test('public admin registration is rejected before reaching Auth', async () => {
  const client = makeAuthClient();
  await expect(createAuthService(client).register({ ...values, role: 'admin' })).rejects.toMatchObject({ code: 'invalid_registration' });
  expect(client.auth.signUp).not.toHaveBeenCalled();
});

test('auto-confirmed signup returns the session instead of requiring email confirmation', async () => {
  const client = makeAuthClient();
  const session = client.buildSession();
  client.auth.signUp.mockResolvedValue({ data: { user: client.user, session }, error: null });
  expect(await createAuthService(client).register({ ...values, role: 'customer' })).toEqual({ session, message: '' });
});

test('obfuscated duplicate signup does not claim an account was created', async () => {
  const client = makeAuthClient();
  client.auth.signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
  expect((await createAuthService(client).register(values)).message).toBe(confirmationMessage);
});

test('maps duplicate, invalid credentials, unconfirmed email, database setup and network failures', async () => {
  const client = makeAuthClient();
  const service = createAuthService(client);
  for (const code of ['invalid_credentials', 'email_not_confirmed']) {
    client.auth.signInWithPassword.mockResolvedValueOnce({ data: null, error: { code } });
    await expect(service.login(values)).rejects.toMatchObject({ code });
  }
  client.auth.signUp.mockResolvedValueOnce({ data: null, error: { code: 'user_already_exists' } });
  await expect(service.register(values)).rejects.toMatchObject({ code: 'user_already_exists' });
  client.auth.signUp.mockResolvedValueOnce({ data: null, error: { message: 'Database error saving new user' } });
  await expect(service.register(values)).rejects.toMatchObject({ code: 'profile_setup' });
  client.auth.signInWithPassword.mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(service.login(values)).rejects.toMatchObject({ code: 'network' });
});

test('profile authority comes from the database, not editable metadata', async () => {
  const client = makeAuthClient({ role: 'customer' });
  const result = await createAuthService(client).loadProfile(client.buildSession());
  expect(client.user.user_metadata.role).toBe('admin');
  expect(result.profile.role).toBe('customer');
  expect(result.phase).toBe('authenticated');
  expect(client.auth.getUser).toHaveBeenCalled();
});

test('suspended, missing and incomplete profiles never become authenticated', async () => {
  const suspended = makeAuthClient({ status: 'suspended' });
  expect((await createAuthService(suspended).loadProfile(suspended.buildSession())).phase).toBe('suspended');
  const missing = makeAuthClient({ profileMissing: true });
  await expect(createAuthService(missing).loadProfile(missing.buildSession())).rejects.toMatchObject({ code: 'profile_missing' });
  const incomplete = makeAuthClient();
  incomplete.profile.mobile = null;
  await expect(createAuthService(incomplete).loadProfile(incomplete.buildSession())).rejects.toMatchObject({ code: 'profile_incomplete' });
});

test('resends signup confirmation using email only and handles delivery rate limits', async () => {
  const client = makeAuthClient();
  const service = createAuthService(client);
  expect(await service.resendConfirmation(' RIDER@example.com ')).toContain('If confirmation is needed');
  expect(client.auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'rider@example.com' });
  client.auth.resend.mockResolvedValueOnce({ error: { code: 'over_email_send_rate_limit' } });
  await expect(service.resendConfirmation('rider@example.com')).rejects.toMatchObject({ code: 'over_email_send_rate_limit' });
});
