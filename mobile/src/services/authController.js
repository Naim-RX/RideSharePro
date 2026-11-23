import { createAuthService } from './authService.js';
import { toAuthIssue } from './authErrors.js';

export const initialAuthState = { phase: 'restoring', session: null, profile: null, error: null, notice: '' };

// Independent of React: event ordering and stale profile responses are tested directly.
export function createAuthController(client, onChange) {
  const service = createAuthService(client);
  let state = initialAuthState;
  let generation = 0;
  let stopped = false;
  let subscription;
  let profileTimer;
  let loggingOut = false;

  function emit(next) {
    if (stopped) return;
    state = next;
    onChange(state);
  }

  async function checkProfile(session, version) {
    try {
      const result = await service.loadProfile(session);
      if (!stopped && version === generation) emit({ ...state, ...result, error: null });
    } catch (error) {
      if (!stopped && version === generation) emit({ ...state, profile: null, phase: 'blocked', error: toAuthIssue(error) });
    }
  }

  function receiveSession(session) {
    if (stopped) return;
    if (loggingOut && session) return;
    const version = ++generation;
    clearTimeout(profileTimer);
    if (!session) {
      emit({ ...initialAuthState, phase: loggingOut ? 'signing_out' : 'signed_out' });
      return;
    }
    emit({ session, profile: null, phase: 'loading_profile', error: null, notice: '' });
    // Never await an SDK call from onAuthStateChange: its auth lock may still be held.
    profileTimer = setTimeout(() => { void checkProfile(session, version); }, 0);
  }

  async function refresh() {
    const version = generation;
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!stopped && version === generation) receiveSession(data.session);
    } catch (error) {
      if (!stopped && version === generation) emit({ ...state, profile: null, phase: 'blocked', error: toAuthIssue(error) });
    }
  }

  return {
    async start() {
      try {
        subscription = client.auth.onAuthStateChange((_event, session) => { receiveSession(session); }).data.subscription;
        await refresh();
      } catch (error) {
        emit({ ...state, profile: null, phase: 'blocked', error: toAuthIssue(error) });
      }
    },
    stop() {
      stopped = true;
      generation++;
      clearTimeout(profileTimer);
      subscription?.unsubscribe();
    },
    refresh,
    async login(values) {
      const session = await service.login(values);
      if (state.session?.access_token !== session.access_token) receiveSession(session);
      return '';
    },
    async register(values) {
      const result = await service.register(values);
      if (result.session && state.session?.access_token !== result.session.access_token) receiveSession(result.session);
      return result.message;
    },
    resendConfirmation: service.resendConfirmation,
    async logout() {
      if (loggingOut) return;
      loggingOut = true;
      generation++;
      clearTimeout(profileTimer);
      emit({ ...state, profile: null, phase: 'signing_out', error: null });
      try {
        // SDK 2.119 local scope clears persisted state before best-effort revocation.
        const { error } = await client.auth.signOut({ scope: 'local' });
        const current = await client.auth.getSession();
        if (current.error || current.data.session) throw current.error || error || new Error('Local logout failed');
        emit({ ...initialAuthState, phase: 'signed_out', notice: error ? 'Signed out on this device. Server sign-out could not be confirmed while offline.' : '' });
      } catch (error) {
        emit({ ...state, profile: null, phase: 'blocked', error: toAuthIssue(error) });
      } finally {
        loggingOut = false;
      }
    },
  };
}
