import { fireEvent, render, screen } from '@testing-library/react-native';
import BidCard from './BidCard';

test('does not select a biker while a selection is pending', async () => {
  const onSelect = jest.fn();
  const bid = { bikerName: 'Test Biker', motorcycleLabel: 'Motorcycle', fareLabel: 'BDT 120', status: 'pending' };
  const view = await render(<BidCard bid={bid} onSelect={onSelect} loading />);
  await fireEvent.press(screen.getByRole('button', { name: 'Select biker' }));
  expect(onSelect).not.toHaveBeenCalled();
  await view.rerender(<BidCard bid={bid} onSelect={onSelect} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Select biker' }));
  expect(onSelect).toHaveBeenCalledTimes(1);
});
