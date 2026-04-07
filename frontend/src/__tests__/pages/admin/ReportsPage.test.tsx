import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPage from '../../../pages/admin/ReportsPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

// Mock recharts
vi.mock('recharts', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Passthrough,
    LineChart: Passthrough,
    Line: () => <div />,
    BarChart: Passthrough,
    Bar: () => <div />,
    PieChart: Passthrough,
    Pie: Passthrough,
    Cell: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
  };
});

describe('ReportsPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<ReportsPage />);
    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
  });

  it('shows all tab buttons', () => {
    renderWithProviders(<ReportsPage />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Donations')).toBeInTheDocument();
    expect(screen.getByText('Outcomes')).toBeInTheDocument();
    expect(screen.getByText('Safehouses')).toBeInTheDocument();
  });

  it('overview tab loads KPI cards', async () => {
    renderWithProviders(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Residents')).toBeInTheDocument();
    });
  });

  it('switches to donations tab', async () => {
    renderWithProviders(<ReportsPage />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Donations'));
    await waitFor(() => {
      expect(screen.getByText('Monthly Donation Trends')).toBeInTheDocument();
    });
  });
});
