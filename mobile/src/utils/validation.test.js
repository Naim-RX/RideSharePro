import { validateLogin, validateRegistration } from './validation';

const valid = { fullName: 'Campus Rider', email: 'rider@example.com', mobile: '+880 1712-345678', gender: 'undisclosed', password: 'LongPass123', confirmPassword: 'LongPass123', role: 'biker' };

test('accepts formatted international phone numbers and a private gender choice', () => {
  expect(validateRegistration(valid)).toEqual({});
});

test('rejects malformed email, phone, blank password, mismatched confirmation and forged roles', () => {
  const errors = validateRegistration({ ...valid, email: 'invalid@', mobile: '123', gender: 'unknown', password: '        ', confirmPassword: 'different', role: 'admin' });
  expect(Object.keys(errors)).toEqual(['email', 'mobile', 'gender', 'password', 'confirmPassword', 'role']);
});

test('checks required login credentials without imposing new-registration password rules', () => {
  expect(validateLogin({ email: '  rider@example.com  ', password: 'short' })).toEqual({});
  expect(validateLogin({ email: '', password: '' })).toEqual({ email: 'Enter your email address.', password: 'Enter your password.' });
  expect(validateLogin({ email: valid.email, password: '        ' })).toEqual({ password: 'Enter your password.' });
});

test('rejects weak registration passwords and lists errors in screen order', () => {
  const errors = validateRegistration({ ...valid, fullName: '', email: '', password: 'short' });
  expect(Object.keys(errors)[0]).toBe('fullName');
  expect(errors.password).toBeTruthy();
  expect(errors.confirmPassword).toBeTruthy();
});
