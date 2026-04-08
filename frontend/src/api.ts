const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '');

export function getApiUrl() {
  return API_URL;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  if (import.meta.env.DEV) console.log(`[API] Fetching: ${url}`);
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    console.error(`[API] ${res.status} ${res.statusText} from ${url}`);
    const errorBody = await res.json().catch(() => ({}));
    const err = new Error(
      (errorBody as Record<string, string>)?.error ??
      `API error: ${res.status} ${res.statusText} — ${url}`
    );
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return res.json();
}
