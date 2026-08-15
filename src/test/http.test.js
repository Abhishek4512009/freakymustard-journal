import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJson, invalidateCache } from '../lib/http';

describe('fetchJson', () => {
  beforeEach(() => {
    invalidateCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ hello: 'world' }),
      })
    );

    const promise = fetchJson('https://api.test/data', { retries: 0 });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ hello: 'world' });
  });

  it('caches GET responses within TTL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ n: 1 }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const p1 = fetchJson('https://api.test/cached', { retries: 0 });
    await vi.runAllTimersAsync();
    await p1;

    const p2 = fetchJson('https://api.test/cached', { retries: 0 });
    await vi.runAllTimersAsync();
    await expect(p2).resolves.toEqual({ n: 1 });

    expect(mockFetch).toHaveBeenCalledTimes(1); // second call served from cache
  });

  it('deduplicates identical in-flight requests', async () => {
    let resolveFetch;
    const mockFetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = () => resolve({ ok: true, json: async () => ({ ok: 1 }) });
        })
    );
    vi.stubGlobal('fetch', mockFetch);

    const a = fetchJson('https://api.test/dedup', { retries: 0 });
    const b = fetchJson('https://api.test/dedup', { retries: 0 });
    resolveFetch();
    await vi.runAllTimersAsync();
    await Promise.all([a, b]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on failure then succeeds', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue({ ok: true, json: async () => ({ recovered: true }) });
    vi.stubGlobal('fetch', mockFetch);

    const promise = fetchJson('https://api.test/retry', { retries: 1 });
    const assertion = expect(promise).resolves.toEqual({ recovered: true });
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    const promise = fetchJson('https://api.test/fail', { retries: 1 });
    // Attach the handler BEFORE advancing timers to avoid unhandled rejection.
    const assertion = expect(promise).rejects.toThrow('boom');
    await vi.advanceTimersByTimeAsync(10000);
    await assertion;
  });

  it('maps non-ok responses to errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const promise = fetchJson('https://api.test/missing', { retries: 0 });
    const assertion = expect(promise).rejects.toThrow('not found');
    await vi.runAllTimersAsync();
    await assertion;
  });
});
