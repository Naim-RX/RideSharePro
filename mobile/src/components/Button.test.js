import { render, screen, fireEvent } from '@testing-library/react-native';
import Button from './Button';

test('prevents repeated actions while a request is loading', async () => {
  const onPress = jest.fn();
  await render(<Button title="Continue" loading onPress={onPress} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(onPress).not.toHaveBeenCalled();
  expect(screen.getByRole('button')).toBeDisabled();
});

test('allows an enabled action', async () => {
  const onPress = jest.fn();
  await render(<Button title="Continue" onPress={onPress} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
