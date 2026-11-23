import { fireEvent, render, screen } from '@testing-library/react-native';
import LoginScreen from './LoginScreen';
import RegistrationScreen from './RegistrationScreen';
import { AuthContext } from '../../context/AuthContext';
import { confirmationMessage } from '../../services/authService';

const renderForm = (child, overrides = {}) => render(<AuthContext.Provider value={{ login: jest.fn(async () => ''), register: jest.fn(async () => confirmationMessage), resendConfirmation: jest.fn(async () => 'Confirmation sent.'), ...overrides }}>{child}</AuthContext.Provider>);

test('login validates locally and displays an Auth credential error without losing the entered email', async () => {
  await renderForm(<LoginScreen navigation={{ navigate: jest.fn() }} />, { login: jest.fn(async () => { throw { code: 'invalid_credentials' }; }) });
  await fireEvent.press(screen.getByRole('button', { name: 'Login' }));
  expect(screen.getByText('Enter your email address.')).toBeVisible();
  expect(screen.getByText('Enter your password.')).toBeVisible();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'rider@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'Secure123');
  await fireEvent.press(screen.getByRole('button', { name: 'Login' }));
  expect(screen.getByText('Email or password is incorrect.')).toBeVisible();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'invalid');
  expect(screen.queryByText('Email or password is incorrect.')).toBeNull();
  expect(screen.getByText('Enter a valid email address.')).toBeVisible();
});

test('password visibility controls preserve values and operate independently', async () => {
  await renderForm(<RegistrationScreen navigation={{ goBack: jest.fn() }} />);
  await fireEvent.changeText(screen.getByLabelText('Password'), 'Secure123');
  await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'Secure123');
  await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
  expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', false);
  expect(screen.getByLabelText('Password')).toHaveProp('value', 'Secure123');
  expect(screen.getByLabelText('Confirm password')).toHaveProp('secureTextEntry', true);
  await fireEvent.press(screen.getByRole('button', { name: 'Hide password' }));
  expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
});

test('registration requires gender, checks confirmation, and accepts the selected biker role', async () => {
  await renderForm(<RegistrationScreen navigation={{ goBack: jest.fn() }} />);
  for (const [label, value] of Object.entries({ 'Full name': 'Campus Rider', Email: 'rider@example.com', 'Mobile number': '01712345678', Password: 'Secure123', 'Confirm password': 'mismatch' })) {
    await fireEvent.changeText(screen.getByLabelText(label), value);
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));
  expect(screen.getByText('Select a gender option.')).toBeVisible();
  expect(screen.getByText('Passwords do not match.')).toBeVisible();
  await fireEvent.press(screen.getByRole('radio', { name: 'Prefer not to say' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Biker' }));
  expect(screen.getByRole('radio', { name: 'Biker' })).toBeChecked();
  await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'Secure123');
  await fireEvent.press(screen.getByRole('button', { name: 'Create Account' }));
  expect(screen.getByText(confirmationMessage)).toBeVisible();
});
