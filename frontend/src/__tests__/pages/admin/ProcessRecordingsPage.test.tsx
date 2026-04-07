import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import ProcessRecordingsPage from '../../../pages/admin/ProcessRecordingsPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('ProcessRecordingsPage', () => {
  it('renders the page title', async () => {
    renderWithProviders(<ProcessRecordingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Process Recordings')).toBeInTheDocument();
    });
  });

  it('shows the privacy notice', () => {
    renderWithProviders(<ProcessRecordingsPage />);
    expect(screen.getByText(/confidential counseling notes/)).toBeInTheDocument();
  });

  it('renders the New Recording button', () => {
    renderWithProviders(<ProcessRecordingsPage />);
    expect(screen.getByText('New Recording')).toBeInTheDocument();
  });

  it('loads and displays recording data', async () => {
    renderWithProviders(<ProcessRecordingsPage />);
    await waitFor(() => {
      expect(screen.getByText('LS-0001')).toBeInTheDocument();
    });
  });
});
