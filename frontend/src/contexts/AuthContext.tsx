import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { apiFetch } from '../api';

export interface AuthUser {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  supporterId?: number | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getCachedAuth(): AuthState {
  try {
    const cached = sessionStorage.getItem('auth_user');
    if (cached) {
      const user = JSON.parse(cached) as AuthUser;
      return { user, isAuthenticated: true, isLoading: true };
    }
  } catch { /* ignore */ }
  return { user: null, isAuthenticated: false, isLoading: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(getCachedAuth);

  const checkAuth = useCallback(async () => {
    try {
      const data = await apiFetch<{ isAuthenticated: boolean } & Partial<AuthUser>>('/api/auth/me');
      if (data.isAuthenticated && data.email) {
        const user: AuthUser = {
          email: data.email,
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          roles: data.roles ?? [],
          supporterId: data.supporterId ?? null,
        };
        try { sessionStorage.setItem('auth_user', JSON.stringify(user)); } catch { /* ignore */ }
        setState({ user, isAuthenticated: true, isLoading: false });
      } else {
        sessionStorage.removeItem('auth_user');
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      // Network error — keep cached auth if we have one rather than logging out
      const cached = sessionStorage.getItem('auth_user');
      if (cached) {
        setState(prev => ({ ...prev, isLoading: false }));
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handler = () => {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = async (email: string, password: string, rememberMe = false): Promise<AuthUser> => {
    const data = await apiFetch<AuthUser>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });
    const user: AuthUser = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      roles: data.roles,
      supporterId: data.supporterId ?? null,
    };
    try { sessionStorage.setItem('auth_user', JSON.stringify(user)); } catch { /* ignore */ }
    setState({ user, isAuthenticated: true, isLoading: false });
    return user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore errors on logout
    }
    sessionStorage.removeItem('auth_user');
    setState({ user: null, isAuthenticated: false, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
