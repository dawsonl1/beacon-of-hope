import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import RecordingFormPage from '../../../pages/admin/RecordingFormPage';

describe('RecordingFormPage — New Fields', () => {
  it('shows Needs Case Conference flag', () => {
    renderWithProviders(<RecordingFormPage />, { route: '/admin/recordings/new' });
    expect(screen.getByText('Needs Case Conference')).toBeInTheDocument();
  });

  it('shows Ready for Reintegration flag', () => {
    renderWithProviders(<RecordingFormPage />, { route: '/admin/recordings/new' });
    expect(screen.getByText('Ready for Reintegration')).toBeInTheDocument();
  });

  it('shows Confidential Notes section', () => {
    renderWithProviders(<RecordingFormPage />, { route: '/admin/recordings/new' });
    expect(screen.getByText('Confidential Notes')).toBeInTheDocument();
  });

  it('shows restricted notes placeholder', () => {
    renderWithProviders(<RecordingFormPage />, { route: '/admin/recordings/new' });
    expect(screen.getByPlaceholderText(/Sensitive notes/)).toBeInTheDocument();
  });
});
