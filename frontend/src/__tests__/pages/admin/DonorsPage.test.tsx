import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonorsPage from '../../../pages/admin/DonorsPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('DonorsPage', () => {
  it('renders the page title', async () => {
    renderWithProviders(<DonorsPage />);
    await waitFor(() => {
      expect(screen.getByText('Donors & Contributions')).toBeInTheDocument();
    });
  });

  it('renders Supporters Directory tab as active by default', () => {
    renderWithProviders(<DonorsPage />);
    expect(screen.getByText('Supporters Directory')).toBeInTheDocument();
    expect(screen.getByText('Recent Donations')).toBeInTheDocument();
  });

  it('loads supporters data', async () => {
    renderWithProviders(<DonorsPage />);
    await waitFor(() => {
      expect(screen.getByText('John Patron')).toBeInTheDocument();
    });
  });

  it('shows admin action buttons', async () => {
    renderWithProviders(<DonorsPage />);
    await waitFor(() => {
      expect(screen.getByText('Add Supporter')).toBeInTheDocument();
      expect(screen.getByText('Log Donation')).toBeInTheDocument();
    });
  });

  it('switches to donations tab', async () => {
    renderWithProviders(<DonorsPage />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Recent Donations'));
    await waitFor(() => {
      expect(screen.getByText('Supporter')).toBeInTheDocument();
    });
  });
});
