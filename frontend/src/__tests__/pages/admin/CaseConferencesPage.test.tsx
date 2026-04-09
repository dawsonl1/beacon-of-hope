import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import CaseConferencesPage from '../../../pages/admin/CaseConferencesPage';

describe('CaseConferencesPage', () => {
  it('renders the page title', async () => {
    renderWithProviders(<CaseConferencesPage />);
    await waitFor(() => {
      expect(screen.getByText('Case Conferences')).toBeInTheDocument();
    });
  });

  it('renders a Schedule Conference button', async () => {
    renderWithProviders(<CaseConferencesPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /schedule conference/i })).toBeInTheDocument();
    });
  });

  it('shows form fields when Schedule Conference is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CaseConferencesPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /schedule conference/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /schedule conference/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/resident/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/conference date/i)).toBeInTheDocument();
    });
  });
});
