import { act, renderHook } from '@testing-library/react-native';
import useLocalForm from './useLocalForm';
import { validateLogin } from '../utils/validation';

test('prevents duplicate pending submissions and retains input after a network failure', async () => {
  let rejectRequest;
  const request = jest.fn(() => new Promise((_resolve, reject) => { rejectRequest = reject; }));
  const { result } = await renderHook(() => useLocalForm({ email: 'test@example.com', password: 'Secure123' }, validateLogin, request));
  let pending;
  await act(async () => { pending = result.current.submit(); });
  expect(result.current.submitting).toBe(true);
  await act(async () => { await result.current.submit(); });
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => { rejectRequest(new TypeError('Network request failed')); await pending; });
  expect(result.current.submitting).toBe(false);
  expect(result.current.error.code).toBe('network');
  expect(result.current.values.email).toBe('test@example.com');
});
