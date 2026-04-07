import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import Header from '../../components/Header';
import { renderWithProviders } from '../helpers/renderWithProviders';

describe('Header', () => {
  it('renders the Beacon of Hope logo text', async () => {
    renderWithProviders(<Header />);
    await waitFor(() => {
      expect(screen.getByText('Beacon of Hope')).toBeInTheDocument();
    });
  });

  it('renders navigation links', async () => {
    renderWithProviders(<Header />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
  });

  it('shows Login link when not authenticated', async () => {
    server.use(
      http.get('http://localhost:5001/api/auth/me', () =>
        HttpResponse.json({ isAuthenticated: false }),
      ),
    );
    renderWithProviders(<Header />);
    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });

  it('shows Admin Dashboard label and Logout when authenticated as admin', async () => {
    renderWithProviders(<Header />);
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('toggles mobile menu on button click', async () => {
    renderWithProviders(<Header />);
    const user = userEvent.setup();
    const menuBtn = screen.getByLabelText('Open menu');
    await user.click(menuBtn);
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
  });
});
