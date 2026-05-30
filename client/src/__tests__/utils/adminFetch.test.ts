import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminFetch } from '../../utils/adminFetch';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(global, 'fetch').mockResolvedValue(new Response());
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('adminFetch', () => {
  it('calls fetch without an Authorization header when no credentials are stored', async () => {
    await adminFetch('http://localhost/api/test');
    const headers = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });

  it('calls fetch with a Basic Authorization header when credentials are stored', async () => {
    localStorage.setItem('credentials', 'admin:secret');
    await adminFetch('http://localhost/api/test');
    const headers = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Basic admin:secret');
  });

  it('forwards extra init options to fetch', async () => {
    await adminFetch('http://localhost/api/test', { method: 'POST', body: '{}' });
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('http://localhost/api/test');
    expect(call[1].method).toBe('POST');
    expect(call[1].body).toBe('{}');
  });

  it('preserves existing headers passed in init', async () => {
    await adminFetch('http://localhost/api/test', {
      headers: { 'Content-Type': 'application/json' },
    });
    const headers = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('sends Authorization: Basic null when credentials is the string "null"', async () => {
    localStorage.setItem('credentials', 'null');
    await adminFetch('http://localhost/api/test');
    const headers = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Basic null');
  });

  it('rejects when localStorage.getItem throws (BUG: not guarded)', async () => {
    // BUG: adminFetch reads localStorage.getItem('credentials') without a
    // try/catch. In environments where access throws (e.g. strict private
    // browsing), the whole request rejects instead of proceeding unauthenticated.
    // It should swallow the access error and fetch without an Authorization header.
    vi.spyOn(localStorage, 'getItem').mockImplementationOnce(() => {
      throw new DOMException('SecurityError');
    });
    await expect(adminFetch('http://localhost/api/test')).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
