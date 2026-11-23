import { fireEvent, render, screen } from '@testing-library/react-native';
import ConfirmDialog from './ConfirmDialog';

test('blocks repeated confirmation and cancellation during a pending action', async () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  await render(<ConfirmDialog visible loading title="Choose this biker?" message="Check the fare before continuing." onConfirm={onConfirm} onCancel={onCancel} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(onConfirm).not.toHaveBeenCalled();
  expect(onCancel).not.toHaveBeenCalled();
});
