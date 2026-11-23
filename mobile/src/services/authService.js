import { validateLogin, validateRegistration } from '../utils/validation.js';
import { AuthIssue, toAuthIssue } from './authErrors.js';

export const confirmationMessage = 'Check your email to confirm your account, then return here to log in. If you already registered, use Login.';

export function createAuthService(client) {
  return {
    async register(values) {
      if (Object.keys(validateRegistration(values)).length) {
        throw new AuthIssue('invalid_registration', 'Check your registration details. Only Customer and Biker accounts can register here.');
      }
      try {
        const { data, error } = await client.auth.signUp({
          email: values.email.trim().toLowerCase(),
          password: values.password,
          options: {
            data: {
              full_name: values.fullName.trim(),
              mobile: values.mobile.replace(/[\s()\-]/g, ''),
              gender: values.gender,
              role: values.role,
            },
          },
        });
        if (error) throw error;
        if (!data?.user) throw new AuthIssue('signup_failed', 'Account setup could not be completed. Please try again.');
        // A null session can also be an intentionally obfuscated duplicate response.
        return { session: data.session, message: data.session ? '' : confirmationMessage };
      } catch (error) { throw toAuthIssue(error); }
    },

    async login(values) {
      if (Object.keys(validateLogin(values)).length) throw new AuthIssue('invalid_login', 'Enter your email and password.');
      try {
        const { data, error } = await client.auth.signInWithPassword({ email: values.email.trim().toLowerCase(), password: values.password });
        if (error) throw error;
        if (!data?.session) throw new AuthIssue('session_missing', 'Login did not create a session. Please try again.');
        return data.session;
      } catch (error) { throw toAuthIssue(error); }
    },

    async resendConfirmation(email) {
      if (validateLogin({ email, password: 'not-used' }).email) throw new AuthIssue('invalid_email', 'Enter a valid email address first.');
      try {
        const { error } = await client.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
        if (error) throw error;
        return 'If confirmation is needed for this address, an email will be sent. Check your inbox.';
      } catch (error) { throw toAuthIssue(error); }
    },

    async loadProfile(session) {
      try {
        // Verify the server identity; never authorize from stored user_metadata.
        const { data: identity, error: identityError } = await client.auth.getUser();
        if (identityError) throw identityError;
        if (!identity?.user || identity.user.id !== session.user.id) {
          throw new AuthIssue('session_invalid', 'Your session could not be verified. Please log out and log in again.');
        }
        const { data: profile, error } = await client.from('profiles')
          .select('id,full_name,mobile,gender,role,account_status').eq('id', identity.user.id).maybeSingle();
        if (error) throw error;
        if (!profile || profile.id !== identity.user.id) throw new AuthIssue('profile_missing', 'Your account profile is not ready. Try again or contact support.');
        if (!['customer', 'biker', 'admin'].includes(profile.role)) throw new AuthIssue('role_invalid', 'Your account role could not be verified. Contact support.');
        if (profile.account_status === 'suspended') return { profile, phase: 'suspended' };
        if (profile.account_status !== 'active') throw new AuthIssue('account_unavailable', 'Your account is unavailable. Contact support.');
        if (!profile.full_name?.trim() || !/^\+?\d{10,15}$/.test(profile.mobile || '')) {
          throw new AuthIssue('profile_incomplete', 'Your account profile is incomplete. Contact support to finish setup.');
        }
        if (profile.role === 'biker') {
          const { data: biker, error: bikerError } = await client.from('biker_profiles').select('id').eq('id', profile.id).maybeSingle();
          if (bikerError) throw bikerError;
          if (!biker) throw new AuthIssue('profile_missing', 'Your biker profile is not ready. Try again or contact support.');
        }
        return { profile, phase: 'authenticated' };
      } catch (error) { throw toAuthIssue(error); }
    },
  };
}
