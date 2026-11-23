import { afterEach } from '@jest/globals';
import { fetchWithTimeout } from './fetchWithTimeout';

afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('aborts stalled network requests instead of leaving the loading state indefinitely', async () => {
  jest.useFakeTimers();
  jest.spyOn(global, 'fetch').mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
  }));
  const request = fetchWithTimeout('https://example.invalid');
  const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
  jest.advanceTimersByTime(30000);
  await rejected;
});

test('preserves caller cancellation and releases its timeout', async () => {
  jest.useFakeTimers();
  const source = new AbortController();
  jest.spyOn(global, 'fetch').mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
  }));
  const request = fetchWithTimeout('https://example.invalid', { signal: source.signal });
  const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
  source.abort();
  await rejected;
  expect(jest.getTimerCount()).toBe(0);
});
