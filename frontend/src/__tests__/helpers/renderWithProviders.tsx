import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { CookieConsentProvider } from '../../contexts/CookieConsentContext';
import type { ReactElement } from 'react';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route for MemoryRouter — if omitted uses BrowserRouter */
  route?: string;
}

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CookieConsentProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </CookieConsentProvider>
    </AuthProvider>
  );
}

function AllProvidersWithMemoryRouter(initialEntries: string[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthProvider>
        <CookieConsentProvider>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </CookieConsentProvider>
      </AuthProvider>
    );
  };
}

export function renderWithProviders(ui: ReactElement, options?: Options) {
  if (options?.route) {
    const { route, ...rest } = options;
    return render(ui, {
      wrapper: AllProvidersWithMemoryRouter([route]),
      ...rest,
    });
  }
  return render(ui, { wrapper: AllProviders, ...options });
}

/** Render with just a router (no Auth/CookieConsent) for simpler component tests */
export function renderWithRouter(ui: ReactElement, options?: Options) {
  if (options?.route) {
    const { route, ...rest } = options;
    return render(ui, {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      ),
      ...rest,
    });
  }
  return render(ui, {
    wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    ...options,
  });
}
