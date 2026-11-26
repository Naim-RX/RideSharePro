import { fireEvent, render, screen } from '@testing-library/react-native';
import CustomerRoutePreviewScreen from './CustomerRoutePreviewScreen';
import { requestMap } from '../../services/mapsService';
jest.mock('../../services/mapsService', () => ({ requestMap: jest.fn() }));
const params = { pickup: { label: 'Pickup', latitude: 23, longitude: 90 }, destination: { label: 'Destination', latitude: 24, longitude: 91 }, requestKey: '10000000-0000-4000-8000-000000000001' };
test('loads a route, identifies the actual mode, then confirms the same preview', async () => {
  requestMap.mockResolvedValue({ mode: 'DRIVE', distanceMeters: 1500, durationSeconds: 120, encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' });
  const navigation = { replace: jest.fn(), goBack: jest.fn() };
  await render(<CustomerRoutePreviewScreen navigation={navigation} route={{ params }} />);
  expect(await screen.findByText('Driving-route estimate')).toBeVisible();
  expect(screen.getByText('1.5 km · 2 min')).toBeVisible();
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm Route' }));
  expect(navigation.replace).toHaveBeenCalledWith('CustomerPostRide', expect.objectContaining({ requestKey: params.requestKey, estimate: expect.objectContaining({ mode: 'DRIVE' }) }));
});
test('route error cannot be confirmed and offers a retry', async () => {
  requestMap.mockRejectedValue(new Error('No road route found.'));
  await render(<CustomerRoutePreviewScreen navigation={{ goBack: jest.fn() }} route={{ params }} />);
  expect(await screen.findByText('No road route found.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Confirm Route' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
});
