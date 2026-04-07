import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

/** Small consumer component to inspect context values */
function AuthConsumer() {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="roles">{user?.roles?.join(',') ?? 'none'}</span>
      <button onClick={() => login('admin@beaconofhope.org', 'ValidPassword1!')}>Login</button>
      <button onClick={() => login('bad@example.com', 'wrong').catch(() => {})}>Bad Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>,
  );
}

describe('AuthContext', () => {
  it('starts in loading state', () => {
    renderAuth();
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('checks session on mount via /api/auth/me', async () => {
    renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('email').textContent).toBe('admin@beaconofhope.org');
  });

  it('sets isAuthenticated to false when /me returns unauthenticated', async () => {
    server.use(
      http.get('http://localhost:5001/api/auth/me', () =>
        HttpResponse.json({ isAuthenticated: false }),
      ),
    );
    renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('handles /me network error gracefully', async () => {
    server.use(
      http.get('http://localhost:5001/api/auth/me', () =>
        HttpResponse.error(),
      ),
    );
    renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('login sets user on success', async () => {
    server.use(
      http.get('http://localhost:5001/api/auth/me', () =>
        HttpResponse.json({ isAuthenticated: false }),
      ),
    );
    renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });
    expect(screen.getByTestId('email').textContent).toBe('admin@beaconofhope.org');
  });

  it('login throws on bad credentials', async () => {
    server.use(
      http.get('http://localhost:5001/api/auth/me', () =>
        HttpResponse.json({ isAuthenticated: false }),
      ),
    );
    renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Bad Login button will throw; we just verify authenticated stays false
    const user = userEvent.setup();
    await user.click(screen.getByText('Bad Login'));

    // Should remain unauthenticated after bad login
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('logout clears user state', async () => {
    renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });
    expect(screen.getByTestId('email').textContent).toBe('none');
  });

  it('exposes user roles', async () => {
    renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId('roles').textContent).toBe('Admin');
    });
  });

  it('responds to auth:unauthorized event', async () => {
    renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    act(() => {
      window.dispatchEvent(new Event('auth:unauthorized'));
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('useAuth throws outside provider', () => {
    function Orphan() {
      useAuth();
      return null;
    }

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow('useAuth must be used within AuthProvider');
    spy.mockRestore();
  });
});
