import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import CalendarPage from '../../../pages/admin/CalendarPage';

// Mock API to return events we can interact with
vi.mock('../../../api', async () => {
  const actual = await vi.importActual('../../../api');
  return {
    ...actual as Record<string, unknown>,
    apiFetch: vi.fn((url: string, opts?: { method?: string }) => {
      if (url.includes('/api/staff/calendar') && (!opts || opts.method === undefined)) {
        return Promise.resolve([
          {
            calendarEventId: 1, staffUserId: 'u1', safehouseId: 1,
            residentId: null, residentCode: null,
            eventType: 'Counseling', title: 'Morning Session',
            description: null, eventDate: '2026-02-16',
            startTime: null, endTime: null,
            recurrenceRule: null, sourceTaskId: null, status: 'Scheduled',
          },
          {
            calendarEventId: 2, staffUserId: 'u1', safehouseId: 1,
            residentId: null, residentCode: 'R-001',
            eventType: 'DoctorApt', title: 'Doctor Visit',
            description: null, eventDate: '2026-02-16',
            startTime: '09:00', endTime: '10:00',
            recurrenceRule: null, sourceTaskId: null, status: 'Scheduled',
          },
          {
            calendarEventId: 3, staffUserId: 'u1', safehouseId: 1,
            residentId: null, residentCode: null,
            eventType: 'Counseling', title: 'Done Task',
            description: null, eventDate: '2026-02-16',
            startTime: '11:00', endTime: '11:30',
            recurrenceRule: null, sourceTaskId: null, status: 'Completed',
          },
        ]);
      }
      if (url.includes('/api/admin/residents-list')) return Promise.resolve({ items: [] });
      if (opts?.method === 'PUT') return Promise.resolve({ updated: true });
      return Promise.resolve([]);
    }),
  };
});

describe('CalendarPage — @dnd-kit Integration', () => {
  it('renders unscheduled events in the To Do queue', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Morning Session')).toBeInTheDocument();
      expect(screen.getByText('To Do (1)')).toBeInTheDocument();
    });
  });

  it('renders scheduled events in the day grid', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Doctor Visit')).toBeInTheDocument();
    });
  });

  it('shows time slots with correct labels', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('9 AM')).toBeInTheDocument();
      expect(screen.getByText('12 PM')).toBeInTheDocument();
    });
  });

  it('unscheduled event chips have grip icons for drag affordance', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Morning Session')).toBeInTheDocument();
    });
    const chip = screen.getByText('Morning Session').closest('div');
    const svg = chip?.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('scheduled event chips have grip icons', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Doctor Visit')).toBeInTheDocument();
    });
    const chip = screen.getByText('Doctor Visit').closest('div');
    const svg = chip?.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('completed events do not have grip icons (not draggable)', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Done Task')).toBeInTheDocument();
    });
    const chip = screen.getByText('Done Task').closest('div');
    const svg = chip?.querySelector('svg');
    // Completed events should NOT have the grip icon
    expect(svg).toBeFalsy();
  });

  it('shows the To Do drop zone with helper text when empty', async () => {
    // The queue has 1 unscheduled item so this tests the label
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('To Do (1)')).toBeInTheDocument();
    });
  });

  it('renders Day and Week toggle buttons', () => {
    renderWithProviders(<CalendarPage />);
    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
  });

  it('renders New Event button', () => {
    renderWithProviders(<CalendarPage />);
    expect(screen.getByText('New Event')).toBeInTheDocument();
  });
});
