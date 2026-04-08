import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import StaffTasksPage from '../../../pages/admin/StaffTasksPage';
import CalendarPage from '../../../pages/admin/CalendarPage';
import IncidentsPage from '../../../pages/admin/IncidentsPage';
import CaseQueuePage from '../../../pages/admin/CaseQueuePage';
import CaseConferencesPage from '../../../pages/admin/CaseConferencesPage';
import PostPlacementPage from '../../../pages/admin/PostPlacementPage';

describe('StaffTasksPage', () => {
  it('renders the page title', async () => {
    renderWithProviders(<StaffTasksPage />);
    expect(screen.getByText('To-Do List')).toBeInTheDocument();
  });

  it('shows empty state when no tasks', async () => {
    renderWithProviders(<StaffTasksPage />);
    await waitFor(() => {
      expect(screen.getByText(/No pending tasks/)).toBeInTheDocument();
    });
  });

  it('shows subtitle', () => {
    renderWithProviders(<StaffTasksPage />);
    expect(screen.getByText(/pending tasks and action items/)).toBeInTheDocument();
  });
});

describe('CalendarPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<CalendarPage />);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('shows Day/Week toggle', () => {
    renderWithProviders(<CalendarPage />);
    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
  });

  it('shows Today button', () => {
    renderWithProviders(<CalendarPage />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows New Event button', () => {
    renderWithProviders(<CalendarPage />);
    expect(screen.getByText('New Event')).toBeInTheDocument();
  });

  it('shows time slots in day view', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('9 AM')).toBeInTheDocument();
      expect(screen.getByText('12 PM')).toBeInTheDocument();
    });
  });
});

describe('IncidentsPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<IncidentsPage />);
    expect(screen.getByText('Incidents')).toBeInTheDocument();
  });

  it('shows Report Incident button', () => {
    renderWithProviders(<IncidentsPage />);
    expect(screen.getByText('Report Incident')).toBeInTheDocument();
  });

  it('loads and shows incident data', async () => {
    renderWithProviders(<IncidentsPage />);
    await waitFor(() => {
      expect(screen.getByText('LS-0001')).toBeInTheDocument();
    });
  });

  it('shows severity filter', () => {
    renderWithProviders(<IncidentsPage />);
    expect(screen.getByText('All Severities')).toBeInTheDocument();
  });

  it('shows status filter', () => {
    renderWithProviders(<IncidentsPage />);
    expect(screen.getByText('All Status')).toBeInTheDocument();
  });
});

describe('CaseQueuePage', () => {
  it('renders the page title', () => {
    renderWithProviders(<CaseQueuePage />);
    expect(screen.getByText('Case Queue')).toBeInTheDocument();
  });

  it('shows subtitle', () => {
    renderWithProviders(<CaseQueuePage />);
    expect(screen.getByText(/awaiting assignment/)).toBeInTheDocument();
  });
});

describe('CaseConferencesPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<CaseConferencesPage />);
    expect(screen.getByText('Case Conferences')).toBeInTheDocument();
  });

  it('loads and shows intervention plans', async () => {
    renderWithProviders(<CaseConferencesPage />);
    await waitFor(() => {
      expect(screen.getByText(/Intervention Plans/)).toBeInTheDocument();
    });
  });
});

describe('PostPlacementPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<PostPlacementPage />);
    expect(screen.getByText('Post-Placement Monitoring')).toBeInTheDocument();
  });

  it('loads and shows summary cards', async () => {
    renderWithProviders(<PostPlacementPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Placed')).toBeInTheDocument();
    });
  });
});
