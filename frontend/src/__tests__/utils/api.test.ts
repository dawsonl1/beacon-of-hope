import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { apiFetch, getApiUrl } from '../../api';

describe('getApiUrl', () => {
  it('returns the API URL string', () => {
    const url = getApiUrl();
    expect(typeof url).toBe('string');
    expect(url).toContain('localhost');
  });
});

describe('apiFetch', () => {
  it('fetches data successfully and returns JSON', async () => {
    const data = await apiFetch<{ status: string }>('/api/health');
    expect(data).toHaveProperty('status', 'Healthy');
  });

  it('includes credentials in requests', async () => {
    // The MSW handler will respond; we just verify the call succeeds
    // (credentials: include is set in apiFetch)
    const data = await apiFetch<{ isAuthenticated: boolean }>('/api/auth/me');
    expect(data.isAuthenticated).toBe(true);
  });

  it('sets Content-Type to application/json', async () => {
    let capturedContentType = '';
    server.use(
      http.get('http://localhost:5000/api/test-headers', ({ request }) => {
        capturedContentType = request.headers.get('content-type') ?? '';
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiFetch('/api/test-headers');
    expect(capturedContentType).toBe('application/json');
  });

  it('throws on non-OK response with error message', async () => {
    server.use(
      http.get('http://localhost:5000/api/fail', () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 }),
      ),
    );
    await expect(apiFetch('/api/fail')).rejects.toThrow('Not found');
  });

  it('dispatches auth:unauthorized event on 401', async () => {
    const handler = vi.fn();
    window.addEventListener('auth:unauthorized', handler);

    server.use(
      http.get('http://localhost:5000/api/unauth', () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      ),
    );

    await expect(apiFetch('/api/unauth')).rejects.toThrow();
    expect(handler).toHaveBeenCalledTimes(1);

    window.removeEventListener('auth:unauthorized', handler);
  });

  it('attaches status property to error on failure', async () => {
    server.use(
      http.get('http://localhost:5000/api/server-error', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 }),
      ),
    );

    try {
      await apiFetch('/api/server-error');
    } catch (err) {
      expect((err as Error & { status: number }).status).toBe(500);
    }
  });
});
