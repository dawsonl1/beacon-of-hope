import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import ReportsPage from '../../../pages/admin/ReportsPage';

describe('ReportsPage - AAR Tab', () => {
  it('renders the Annual Report tab', async () => {
    renderWithProviders(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /annual report/i })).toBeInTheDocument();
    });
  });

  it('shows AAR categories when Annual Report tab is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /annual report/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /annual report/i }));

    await waitFor(() => {
      expect(screen.getByText('Caring')).toBeInTheDocument();
      expect(screen.getByText('Healing')).toBeInTheDocument();
      expect(screen.getByText('Teaching')).toBeInTheDocument();
    });
  });

  it('shows total beneficiaries in AAR tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /annual report/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /annual report/i }));

    await waitFor(() => {
      expect(screen.getByText('Total Unique Beneficiaries')).toBeInTheDocument();
      expect(screen.getByText('62')).toBeInTheDocument();
    });
  });
});
