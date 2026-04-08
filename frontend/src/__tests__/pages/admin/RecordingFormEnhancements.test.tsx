import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import RecordingFormPage from '../../../pages/admin/RecordingFormPage';

describe('RecordingFormPage — New Fields', () => {
  it('shows Needs Case Conference checkbox', () => {
    renderWithProviders(<RecordingFormPage />, { route: '/admin/recordings/new' });
    expect(screen.getByText('Needs Case Conference')).toBeInTheDocument();
  });

  it('shows Ready for Reintegration Assessment checkbox', () => {
    renderWithProviders(<RecordingFormPage />, { route: '/admin/recordings/new' });
    expect(screen.getByText('Ready for Reintegration Assessment')).toBeInTheDocument();
  });

  it('shows Restricted Notes field', () => {
    renderWithProviders(<RecordingFormPage />, { route: '/admin/recordings/new' });
    expect(screen.getByText('Restricted Notes')).toBeInTheDocument();
  });

  it('shows restricted notes placeholder', () => {
    renderWithProviders(<RecordingFormPage />, { route: '/admin/recordings/new' });
    expect(screen.getByPlaceholderText(/Sensitive notes/)).toBeInTheDocument();
  });
});
