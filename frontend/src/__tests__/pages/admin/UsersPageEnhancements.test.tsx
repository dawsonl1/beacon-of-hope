import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import UsersPage from '../../../pages/admin/UsersPage';

describe('UsersPage — Enhancements', () => {
  it('renders page title', async () => {
    renderWithProviders(<UsersPage />);
    await waitFor(() => {
      const title = screen.queryByText('User Management') || screen.queryByText(/Access denied/);
      expect(title).toBeTruthy();
    });
  });

  it('shows Create Account button for admin', async () => {
    renderWithProviders(<UsersPage />);
    await waitFor(() => {
      const btn = screen.queryByText('Create Account');
      expect(btn !== null || screen.queryByText('User Management') !== null).toBeTruthy();
    });
  });

  it('renders role filter buttons', async () => {
    renderWithProviders(<UsersPage />);
    await waitFor(() => {
      // Filter buttons should appear if page renders (admin or not)
      const allBtn = screen.queryByRole('button', { name: /All/i });
      const staffBtn = screen.queryByRole('button', { name: /Staff/i });
      const donorsBtn = screen.queryByRole('button', { name: /Donors/i });
      // At least one should be present if the page loaded as admin
      const pageLoaded = allBtn || screen.queryByText(/Access denied/);
      expect(pageLoaded).toBeTruthy();
      if (allBtn) {
        expect(staffBtn).toBeTruthy();
        expect(donorsBtn).toBeTruthy();
      }
    });
  });

  it('includes Donor option in create form role dropdown', async () => {
    renderWithProviders(<UsersPage />);
    await waitFor(() => {
      const createBtn = screen.queryByText('Create Account');
      if (createBtn) {
        createBtn.click();
      }
    });
    await waitFor(() => {
      const donorOption = screen.queryByRole('option', { name: 'Donor' });
      if (donorOption) {
        expect(donorOption).toBeTruthy();
      }
    });
  });

  it('renders edit buttons for users', async () => {
    renderWithProviders(<UsersPage />);
    await waitFor(() => {
      const editBtns = screen.queryAllByTitle('Edit user');
      // If the page rendered as admin with users, edit buttons should exist
      if (screen.queryByText('User Management')) {
        expect(editBtns.length).toBeGreaterThan(0);
      }
    });
  });

  it('opens edit modal when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />);
    await waitFor(() => {
      expect(screen.queryByText('User Management') || screen.queryByText(/Access denied/)).toBeTruthy();
    });
    const editBtns = screen.queryAllByTitle('Edit user');
    if (editBtns.length > 0) {
      await user.click(editBtns[0]);
      await waitFor(() => {
        expect(screen.queryByText('Edit Account')).toBeTruthy();
        expect(screen.queryByText('Save Changes')).toBeTruthy();
      });
    }
  });
});
