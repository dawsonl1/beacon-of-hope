import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import LoginPage from '../../pages/LoginPage';
import { renderWithProviders } from '../helpers/renderWithProviders';

describe('LoginPage', () => {
  // Override the default auth handler so user is NOT authenticated
  function renderLogin() {
    server.use(
      http.get('http://localhost:5000/api/auth/me', () =>
        HttpResponse.json({ isAuthenticated: false }),
      ),
    );
    return renderWithProviders(<LoginPage />, { route: '/login' });
  }

  it('renders the login form', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders the Beacon of Hope title', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByText('Beacon of Hope')).toBeInTheDocument();
    });
  });

  it('shows validation error for empty email on blur', async () => {
    renderLogin();
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });
    const emailInput = screen.getByLabelText('Email Address');
    await user.click(emailInput);
    await user.tab();
    await waitFor(() => {
      expect(screen.getByText('Email is required.')).toBeInTheDocument();
    });
  });

  it('shows password validation error for short password on blur', async () => {
    renderLogin();
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });
    const passInput = screen.getByLabelText('Password');
    await user.click(passInput);
    await user.type(passInput, 'short');
    await user.tab();
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 12 characters.')).toBeInTheDocument();
    });
  });

  it('has a remember me checkbox', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByText('Remember me')).toBeInTheDocument();
    });
  });

  it('has toggle password visibility button', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByLabelText('Show password')).toBeInTheDocument();
    });
  });

  it('has back to homepage link', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByText('Back to homepage')).toBeInTheDocument();
    });
  });

  it('shows error on failed login attempt', async () => {
    renderLogin();
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Email Address'), 'bad@example.com');
    await user.type(screen.getByLabelText('Password'), 'WrongPassword1234!');
    await user.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
