import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import CaseloadPage from '../../../pages/admin/CaseloadPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('CaseloadPage', () => {
  it('renders the page title', async () => {
    renderWithProviders(<CaseloadPage />);
    await waitFor(() => {
      expect(screen.getByText('Caseload Inventory')).toBeInTheDocument();
    });
  });

  it('shows the search input', () => {
    renderWithProviders(<CaseloadPage />);
    expect(screen.getByPlaceholderText(/Search by code/)).toBeInTheDocument();
  });

  it('shows filter dropdowns', () => {
    renderWithProviders(<CaseloadPage />);
    expect(screen.getByText('All Statuses')).toBeInTheDocument();
    expect(screen.getByText('All Categories')).toBeInTheDocument();
  });

  it('loads and displays resident data in table', async () => {
    renderWithProviders(<CaseloadPage />);
    await waitFor(() => {
      expect(screen.getByText('LS-0001')).toBeInTheDocument();
    });
  });

  it('shows Add Resident button for admin users', async () => {
    renderWithProviders(<CaseloadPage />);
    await waitFor(() => {
      expect(screen.getByText('Add Resident')).toBeInTheDocument();
    });
  });
});
