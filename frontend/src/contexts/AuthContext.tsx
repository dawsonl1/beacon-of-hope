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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const checkAuth = useCallback(async () => {
    try {
      const data = await apiFetch<{ isAuthenticated: boolean } & Partial<AuthUser>>('/api/auth/me');
      if (data.isAuthenticated && data.email) {
        setState({
          user: {
            email: data.email,
            firstName: data.firstName ?? '',
            lastName: data.lastName ?? '',
            roles: data.roles ?? [],
          },
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      setState({ user: null, isAuthenticated: false, isLoading: false });
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
    };
    setState({ user, isAuthenticated: true, isLoading: false });
    return user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore errors on logout
    }
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
