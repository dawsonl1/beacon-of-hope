import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import AdminDashboard from '../../../pages/AdminDashboard';
import { renderWithProviders } from '../../helpers/renderWithProviders';

// Mock recharts
vi.mock('recharts', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Passthrough,
    AreaChart: Passthrough,
    Area: () => <div />,
    BarChart: Passthrough,
    Bar: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Cell: () => <div />,
  };
});

describe('AdminDashboard', () => {
  it('renders the Dashboard title', async () => {
    renderWithProviders(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('loads and displays metric cards', async () => {
    renderWithProviders(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Active Residents')).toBeInTheDocument();
    });
    expect(screen.getByText('Open Incidents')).toBeInTheDocument();
    expect(screen.getByText('Monthly Donations')).toBeInTheDocument();
  });

  it('renders quick action buttons', () => {
    renderWithProviders(<AdminDashboard />);
    expect(screen.getByText('Add Resident')).toBeInTheDocument();
    expect(screen.getByText('Log Donation')).toBeInTheDocument();
    expect(screen.getByText('New Recording')).toBeInTheDocument();
  });

  it('loads the girls impacted table', async () => {
    renderWithProviders(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Girls Impacted')).toBeInTheDocument();
    });
  });

  it('shows recent donations section', async () => {
    renderWithProviders(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Recent Donations')).toBeInTheDocument();
    });
  });
});
