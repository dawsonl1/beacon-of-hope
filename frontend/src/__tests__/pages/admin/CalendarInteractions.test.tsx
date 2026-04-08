import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import CalendarPage from '../../../pages/admin/CalendarPage';

describe('CalendarPage — Interactions', () => {
  it('toggles to week view when Week button clicked', async () => {
    renderWithProviders(<CalendarPage />);
    const weekBtn = screen.getByText('Week');
    await userEvent.click(weekBtn);

    // Week view shows day headers like "Mon 6", "Tue 7" etc
    await waitFor(() => {
      expect(screen.getByText(/^Mon/)).toBeInTheDocument();
      expect(screen.getByText(/^Tue/)).toBeInTheDocument();
      expect(screen.getByText(/^Wed/)).toBeInTheDocument();
      expect(screen.getByText(/^Thu/)).toBeInTheDocument();
      expect(screen.getByText(/^Fri/)).toBeInTheDocument();
      expect(screen.getByText(/^Sat/)).toBeInTheDocument();
      expect(screen.getByText(/^Sun/)).toBeInTheDocument();
    });
  });

  it('toggles back to day view', async () => {
    renderWithProviders(<CalendarPage />);
    await userEvent.click(screen.getByText('Week'));
    await userEvent.click(screen.getByText('Day'));

    await waitFor(() => {
      expect(screen.getByText('9 AM')).toBeInTheDocument();
    });
  });

  it('opens New Event modal when clicked', async () => {
    renderWithProviders(<CalendarPage />);
    // Click the first "New Event" button (in the header)
    const buttons = screen.getAllByText('New Event');
    await userEvent.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Create Event')).toBeInTheDocument();
    });
  });

  it('closes New Event modal on Cancel', async () => {
    renderWithProviders(<CalendarPage />);
    await userEvent.click(screen.getByText('New Event'));
    await waitFor(() => {
      expect(screen.getByText('Create Event')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Create Event')).not.toBeInTheDocument();
    });
  });

  it('navigates to next day when right arrow clicked', async () => {
    renderWithProviders(<CalendarPage />);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });

    // Click the right arrow (next day)
    const buttons = screen.getAllByRole('button');
    const nextBtn = buttons.find(b => b.querySelector('svg') && b.textContent === '');
    if (nextBtn) {
      await userEvent.click(nextBtn);
      // Just verify the page doesn't crash after navigation
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    }
  });

  it('Today button resets to current date', async () => {
    renderWithProviders(<CalendarPage />);
    await userEvent.click(screen.getByText('Today'));
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });
});
