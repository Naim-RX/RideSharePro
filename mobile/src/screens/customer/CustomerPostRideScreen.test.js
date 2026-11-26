import { fireEvent, render, screen } from '@testing-library/react-native';
import CustomerPostRideScreen from './CustomerPostRideScreen';
import { createRideService } from '../../services/rideService';
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'customer' } } }) }));
jest.mock('../../services/rideService', () => ({ ...jest.requireActual('../../services/rideService'), createRideService: jest.fn() }));
const params = { pickup: { placeId: 'a', label: 'Google pickup', customerLabel: 'Campus gate' }, destination: { placeId: 'b', label: 'Google destination', customerLabel: 'Library' }, estimate: { mode: 'DRIVE', distanceMeters: 1000, durationSeconds: 100 }, requestKey: '10000000-0000-4000-8000-000000000001' };
test('validates fare, posts only permitted data and returns Home after success', async () => {
  const submit = jest.fn().mockResolvedValue('ride'); createRideService.mockReturnValue({ submit });
  const navigation = { goBack: jest.fn(), reset: jest.fn() };
  await render(<CustomerPostRideScreen navigation={navigation} route={{ params }} />);
  await fireEvent.changeText(screen.getByLabelText('Expected fare (BDT)'), '1.234');
  await fireEvent.press(screen.getByRole('button', { name: 'Post Ride' }));
  expect(submit).not.toHaveBeenCalled(); expect(screen.getByText(/Enter a fare from/)).toBeVisible();
  await fireEvent.changeText(screen.getByLabelText('Expected fare (BDT)'), '150');
  await fireEvent.press(screen.getByRole('button', { name: 'Post Ride' }));
  expect(submit).toHaveBeenCalledWith('customer', expect.objectContaining({ pickupLabel: 'Campus gate', fare: '150' }));
  expect(submit.mock.calls[0][1]).not.toHaveProperty('estimate'); expect(navigation.reset).toHaveBeenCalled();
});
test('retry after an ambiguous failure preserves the confirmed payload', async () => {
  const submit = jest.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce('ride'); createRideService.mockReturnValue({ submit });
  await render(<CustomerPostRideScreen navigation={{ reset: jest.fn(), goBack: jest.fn() }} route={{ params }} />);
  await fireEvent.changeText(screen.getByLabelText('Expected fare (BDT)'), '125');
  await fireEvent.press(screen.getByRole('button', { name: 'Post Ride' }));
  expect(screen.getByText('Connection lost')).toBeVisible();
  expect(screen.getByLabelText('Expected fare (BDT)')).toHaveProp('editable', false);
  await fireEvent.press(screen.getByRole('button', { name: 'Retry Post Ride' }));
  expect(submit.mock.calls[0]).toEqual(submit.mock.calls[1]);
});
