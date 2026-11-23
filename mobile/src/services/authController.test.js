import { createAuthController } from './authController';
import { makeAuthClient, settleAuth } from '../test/authClient';

test('restores a persisted session and checks the database profile before protected navigation', async () => {
  const client = makeAuthClient({ role: 'biker' });
  client.emit('INITIAL_SESSION', client.buildSession());
  const states = [];
  const controller = createAuthController(client, (state) => states.push(state));
  await controller.start();
  expect(states.at(-1).phase).toBe('loading_profile');
  await settleAuth();
  expect(states.at(-1).phase).toBe('authenticated');
  expect(states.at(-1).profile.role).toBe('biker');
  controller.stop();
});

test('token refresh and foreground retry revalidate suspension instead of trusting a cached role', async () => {
  const client = makeAuthClient();
  let state;
  const controller = createAuthController(client, (next) => { state = next; });
  await controller.start();
  await controller.login({ email: 'test@example.com', password: 'Secure123' });
  await settleAuth();
  expect(state.phase).toBe('authenticated');
  client.profile.account_status = 'suspended';
  client.emit('TOKEN_REFRESHED', { ...client.buildSession(), access_token: 'refreshed-token' });
  expect(state.profile).toBeNull();
  await settleAuth();
  expect(state.phase).toBe('suspended');
  controller.stop();
});

test('late profile responses cannot reopen protected routes after logout', async () => {
  const client = makeAuthClient();
  let resolveIdentity;
  client.auth.getUser.mockImplementationOnce(() => new Promise((resolve) => { resolveIdentity = resolve; }));
  let state;
  const controller = createAuthController(client, (next) => { state = next; });
  await controller.start();
  await controller.login({ email: 'test@example.com', password: 'Secure123' });
  await settleAuth();
  await controller.logout();
  expect(state.phase).toBe('signed_out');
  resolveIdentity({ data: { user: client.user }, error: null });
  await settleAuth();
  expect(state.phase).toBe('signed_out');
  expect(state.profile).toBeNull();
  expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  controller.stop();
});

test('offline local logout remains signed out when SDK confirms storage is cleared', async () => {
  const client = makeAuthClient();
  const originalSignOut = client.auth.signOut.getMockImplementation();
  client.auth.signOut.mockImplementation(async (options) => { await originalSignOut(options); return { error: { name: 'AuthRetryableFetchError' } }; });
  let state;
  const controller = createAuthController(client, (next) => { state = next; });
  await controller.start();
  await controller.login({ email: 'test@example.com', password: 'Secure123' });
  await settleAuth();
  await controller.logout();
  expect(state.phase).toBe('signed_out');
  expect(state.notice).toContain('Signed out on this device');
  controller.stop();
});

test('a stale session-restore result cannot override a newer sign-out event', async () => {
  const client = makeAuthClient();
  let restore;
  client.auth.getSession.mockImplementationOnce(() => new Promise((resolve) => { restore = resolve; }));
  let state;
  const controller = createAuthController(client, (next) => { state = next; });
  const starting = controller.start();
  client.emit('SIGNED_OUT', null);
  restore({ data: { session: client.buildSession() }, error: null });
  await starting;
  await settleAuth();
  expect(state.phase).toBe('signed_out');
  controller.stop();
});
