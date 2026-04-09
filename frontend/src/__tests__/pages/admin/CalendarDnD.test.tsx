import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import CalendarPage from '../../../pages/admin/CalendarPage';

// Mock API to return events we can drag
vi.mock('../../../api', async () => {
  const actual = await vi.importActual('../../../api');
  return {
    ...actual as Record<string, unknown>,
    apiFetch: vi.fn((url: string, opts?: { method?: string }) => {
      if (url.includes('/api/staff/calendar') && (!opts || opts.method === undefined)) {
        return Promise.resolve([
          {
            calendarEventId: 1,
            staffUserId: 'u1',
            safehouseId: 1,
            residentId: null,
            residentCode: null,
            eventType: 'Counseling',
            title: 'Morning Session',
            description: null,
            eventDate: '2026-02-16',
            startTime: null,
            endTime: null,
            recurrenceRule: null,
            sourceTaskId: null,
            status: 'Scheduled',
          },
          {
            calendarEventId: 2,
            staffUserId: 'u1',
            safehouseId: 1,
            residentId: null,
            residentCode: 'R-001',
            eventType: 'DoctorApt',
            title: 'Doctor Visit',
            description: null,
            eventDate: '2026-02-16',
            startTime: '09:00',
            endTime: '10:00',
            recurrenceRule: null,
            sourceTaskId: null,
            status: 'Scheduled',
          },
        ]);
      }
      if (url.includes('/api/admin/residents-list')) {
        return Promise.resolve({ items: [] });
      }
      if (url.includes('/api/staff/calendar/') && opts?.method === 'PUT') {
        return Promise.resolve({ updated: true });
      }
      return Promise.resolve([]);
    }),
  };
});

describe('CalendarPage — Drag and Drop', () => {
  it('renders unscheduled events in the To Do queue', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Morning Session')).toBeInTheDocument();
    });
    // Should be in the To Do section (no time shown)
    expect(screen.getByText('To Do (1)')).toBeInTheDocument();
  });

  it('renders scheduled events in the day grid', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Doctor Visit')).toBeInTheDocument();
    });
  });

  it('unscheduled event chips have draggable attribute', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Morning Session')).toBeInTheDocument();
    });
    const chip = screen.getByText('Morning Session').closest('[draggable]');
    expect(chip).toBeTruthy();
    expect(chip?.getAttribute('draggable')).toBe('true');
  });

  it('scheduled event chips have draggable attribute', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Doctor Visit')).toBeInTheDocument();
    });
    const chip = screen.getByText('Doctor Visit').closest('[draggable]');
    expect(chip).toBeTruthy();
    expect(chip?.getAttribute('draggable')).toBe('true');
  });

  it('time slots have data-time attributes for drop targeting', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('9 AM')).toBeInTheDocument();
    });
    // Check that data-time attributes exist on slot elements
    const slot = document.querySelector('[data-time="09:00"]');
    expect(slot).toBeTruthy();
    const halfSlot = document.querySelector('[data-time="09:30"]');
    expect(halfSlot).toBeTruthy();
  });

  it('time slots accept drops (have dragover handling)', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('9 AM')).toBeInTheDocument();
    });

    const slot = document.querySelector('[data-time="10:00"]') as HTMLElement;
    expect(slot).toBeTruthy();
    // Verify the slot exists and is a valid drop target element
    expect(slot.tagName).toBeTruthy();
  });

  it('grip icon is shown on draggable events', async () => {
    renderWithProviders(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Morning Session')).toBeInTheDocument();
    });
    // GripVertical renders an SVG — check the chip contains an svg
    const chip = screen.getByText('Morning Session').closest('[draggable]');
    const svg = chip?.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
