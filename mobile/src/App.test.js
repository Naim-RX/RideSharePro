import { fireEvent, render, screen } from '@testing-library/react-native';
import App from '../App';
import { getSupabase } from './services/supabase';
import { makeAuthClient } from './test/authClient';

jest.mock('./services/supabase', () => ({ getSupabase: jest.fn() }));
jest.mock('./services/bikerService', () => ({ createBikerService: () => ({ status: async () => ({ is_online:false }), list: async () => [] }), subscribeBiker: () => () => {} }));

test('restores signed-out state and navigates between login and registration', async () => {
  getSupabase.mockReturnValue(makeAuthClient());
  await render(<App />);
  expect(await screen.findByRole('button', { name: 'Login' })).toBeVisible();
  await fireEvent.press(screen.getByRole('link', { name: 'Register' }));
  expect(screen.getByRole('header', { name: 'Create account' })).toBeVisible();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to login' }));
  expect(screen.getByRole('button', { name: 'Login' })).toBeVisible();
});

test('database role selects Customer navigation even when metadata claims administrator; logout removes the protected stack', async () => {
  getSupabase.mockReturnValue(makeAuthClient());
  await render(<App />);
  await screen.findByRole('button', { name: 'Login' });
  await fireEvent.changeText(screen.getByLabelText('Email'), 'test@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'Secure123');
  await fireEvent.press(screen.getByRole('button', { name: 'Login' }));
  expect(await screen.findByRole('header', { name: 'Book a ride' })).toBeVisible();
  await fireEvent.press(screen.getByText('Profile'));
  expect(await screen.findByRole('header', { name: 'Customer account' })).toBeVisible();
  await fireEvent.press(screen.getByRole('button', { name: 'Logout' }));
  expect(await screen.findByRole('button', { name: 'Login' })).toBeVisible();
  expect(screen.queryByRole('header', { name: 'Customer account' })).toBeNull();
});

test('restored biker session opens only the biker account screen', async () => {
  const client = makeAuthClient({ role: 'biker' });
  client.emit('INITIAL_SESSION', client.buildSession());
  getSupabase.mockReturnValue(client);
  await render(<App />);
  expect(await screen.findByRole('header', { name: 'Available rides' })).toBeVisible();
  expect(screen.queryByRole('header', { name: 'Customer account' })).toBeNull();
});

test('restored suspended session has no protected home and can log out', async () => {
  const client = makeAuthClient({ status: 'suspended' });
  client.emit('INITIAL_SESSION', client.buildSession());
  getSupabase.mockReturnValue(client);
  await render(<App />);
  expect(await screen.findByRole('header', { name: 'Account suspended' })).toBeVisible();
  expect(screen.queryByRole('header', { name: 'Customer account' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Logout' }));
  expect(await screen.findByRole('button', { name: 'Login' })).toBeVisible();
});

test('missing profile blocks protected navigation instead of assuming Customer', async () => {
  const client = makeAuthClient({ profileMissing: true });
  client.emit('INITIAL_SESSION', client.buildSession());
  getSupabase.mockReturnValue(client);
  await render(<App />);
  expect(await screen.findByRole('header', { name: 'Account access unavailable' })).toBeVisible();
  expect(screen.queryByRole('header', { name: 'Customer account' })).toBeNull();
});
