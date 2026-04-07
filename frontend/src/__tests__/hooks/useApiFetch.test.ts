import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useApiFetch } from '../../hooks/useApiFetch';

describe('useApiFetch', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useApiFetch('/api/health'));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns data on success', async () => {
    const { result } = renderHook(() =>
      useApiFetch<{ status: string }>('/api/health'),
    );
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual({ status: 'Healthy', database: 'Connected' });
    expect(result.current.error).toBeNull();
  });

  it('returns error on failure', async () => {
    server.use(
      http.get('http://localhost:5001/api/broken', () =>
        HttpResponse.json({ error: 'Broken' }, { status: 500 }),
      ),
    );
    const { result } = renderHook(() => useApiFetch('/api/broken'));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });

  it('does not fetch when url is null', async () => {
    const { result } = renderHook(() => useApiFetch(null));
    // Should immediately be not loading
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('refetches when url changes', async () => {
    let url = '/api/health';
    const { result, rerender } = renderHook(() => useApiFetch(url));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toHaveProperty('status');

    url = '/api/impact/summary';
    rerender();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toHaveProperty('totalResidents');
  });
});
