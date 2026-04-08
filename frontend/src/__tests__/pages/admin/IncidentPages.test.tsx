import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import IncidentFormPage from '../../../pages/admin/IncidentFormPage';
import IncidentDetailPage from '../../../pages/admin/IncidentDetailPage';

describe('IncidentFormPage', () => {
  it('renders the page title for new incident', () => {
    renderWithProviders(<IncidentFormPage />, { route: '/admin/incidents/new' });
    expect(screen.getAllByText('Report Incident').length).toBeGreaterThanOrEqual(1);
  });

  it('shows resident dropdown', () => {
    renderWithProviders(<IncidentFormPage />, { route: '/admin/incidents/new' });
    expect(screen.getByText('Resident')).toBeInTheDocument();
  });

  it('shows severity dropdown', () => {
    renderWithProviders(<IncidentFormPage />, { route: '/admin/incidents/new' });
    expect(screen.getByText(/Severity/)).toBeInTheDocument();
  });

  it('shows description textarea', () => {
    renderWithProviders(<IncidentFormPage />, { route: '/admin/incidents/new' });
    expect(screen.getByPlaceholderText(/Describe the incident/)).toBeInTheDocument();
  });

  it('shows follow-up checkbox', () => {
    renderWithProviders(<IncidentFormPage />, { route: '/admin/incidents/new' });
    expect(screen.getByText('Follow-up Required')).toBeInTheDocument();
  });

  it('shows resolved checkbox', () => {
    renderWithProviders(<IncidentFormPage />, { route: '/admin/incidents/new' });
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('shows cancel and submit buttons', () => {
    renderWithProviders(<IncidentFormPage />, { route: '/admin/incidents/new' });
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getAllByText('Report Incident').length).toBeGreaterThanOrEqual(1);
  });
});

describe('IncidentDetailPage', () => {
  it('renders incident detail', async () => {
    renderWithProviders(<IncidentDetailPage />, { route: '/admin/incidents/1' });
    await waitFor(() => {
      expect(screen.getByText(/Incident #/)).toBeInTheDocument();
    });
  });

  it('shows edit and delete buttons', async () => {
    renderWithProviders(<IncidentDetailPage />, { route: '/admin/incidents/1' });
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });
});
