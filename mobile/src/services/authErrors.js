export class AuthIssue extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AuthIssue';
    this.code = code;
  }
}

export function toAuthIssue(error) {
  if (error instanceof AuthIssue) return error;
  const code = error?.code || '';
  const messages = {
    invalid_credentials: 'Email or password is incorrect.',
    email_not_confirmed: 'Confirm your email before logging in. Check your inbox, then return here.',
    user_already_exists: 'This email is already registered. Log in instead.',
    email_exists: 'This email is already registered. Log in instead.',
    weak_password: 'Choose a stronger password that meets the account requirements.',
    email_address_invalid: 'Enter a valid email address.',
    email_address_not_authorized: 'Email delivery is not available for this address. Contact the project administrator.',
    signup_disabled: 'Registration is currently unavailable. Please try again later.',
    over_email_send_rate_limit: 'Too many emails requested. Please wait before trying again.',
    over_request_rate_limit: 'Too many attempts. Please wait before trying again.',
    user_banned: 'This account is unavailable. Contact support.',
    unexpected_failure: 'Account setup could not be completed. Please try again or contact support.',
  };
  if (messages[code]) return new AuthIssue(code, messages[code]);
  if (error?.status === 429) return new AuthIssue('rate_limited', 'Too many attempts. Please wait before trying again.');
  if (['AuthRetryableFetchError', 'AbortError'].includes(error?.name) || error instanceof TypeError || /network|fetch|timeout/i.test(error?.message || '')) {
    return new AuthIssue('network', 'Unable to connect. Check your internet connection and try again.');
  }
  if (/database error saving new user/i.test(error?.message || '')) {
    return new AuthIssue('profile_setup', 'Account setup could not be completed. Please try again or contact support.');
  }
  // Never display raw backend messages, tokens, passwords, or project credentials.
  return new AuthIssue('auth_unavailable', 'Account access is temporarily unavailable. Please try again.');
}
