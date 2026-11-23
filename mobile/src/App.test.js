import { act, fireEvent, render, screen } from '@testing-library/react-native';
import App from '../App';

test('shows the splash and navigates between login and registration', async () => {
  jest.useFakeTimers();
  try {
    await render(<App />);
    expect(screen.getByText('Motorcycle Ride Sharing')).toBeVisible();
    await act(async () => { jest.advanceTimersByTime(1500); });
    expect(screen.getByRole('button', { name: 'Login' })).toBeVisible();
    await fireEvent.press(screen.getByRole('link', { name: 'Register' }));
    expect(screen.getByRole('header', { name: 'Create account' })).toBeVisible();
    await fireEvent.press(screen.getByRole('button', { name: 'Back to login' }));
    expect(screen.getByRole('button', { name: 'Login' })).toBeVisible();
  } finally {
    jest.useRealTimers();
  }
});
