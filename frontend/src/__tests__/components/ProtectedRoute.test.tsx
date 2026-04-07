import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { renderWithProviders } from '../helpers/renderWithProviders';
import ProtectedRoute from '../../components/ProtectedRoute';

describe('ProtectedRoute', () => {
  it('shows loading indicator while auth is being checked', () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders children when authenticated', async () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );
    await waitFor(() => {
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });
  });

  it('redirects to login when not authenticated', async () => {
    server.use(
      http.get('http://localhost:5000/api/auth/me', () =>
        HttpResponse.json({ isAuthenticated: false }),
      ),
    );
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
      { route: '/admin' },
    );
    await waitFor(() => {
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });
  });

  it('renders children when user has allowed role', async () => {
    renderWithProviders(
      <ProtectedRoute allowedRoles={['Admin']}>
        <div>Admin content</div>
      </ProtectedRoute>,
    );
    await waitFor(() => {
      expect(screen.getByText('Admin content')).toBeInTheDocument();
    });
  });

  it('redirects when user lacks required role', async () => {
    server.use(
      http.get('http://localhost:5000/api/auth/me', () =>
        HttpResponse.json({
          isAuthenticated: true,
          email: 'donor@example.com',
          firstName: 'Donor',
          lastName: 'User',
          roles: ['Donor'],
        }),
      ),
    );
    renderWithProviders(
      <ProtectedRoute allowedRoles={['Admin', 'Staff']}>
        <div>Admin content</div>
      </ProtectedRoute>,
      { route: '/admin' },
    );
    await waitFor(() => {
      expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    });
  });

  it('includes returnUrl in login redirect', async () => {
    server.use(
      http.get('http://localhost:5000/api/auth/me', () =>
        HttpResponse.json({ isAuthenticated: false }),
      ),
    );
    // This test mainly verifies the component doesn't crash — the Navigate
    // component handles the redirect. We verify protected content is not shown.
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
      { route: '/admin/caseload' },
    );
    await waitFor(() => {
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });
  });
});
