import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../helpers/renderWithProviders';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Cell: () => <div />,
  ReferenceLine: () => <div />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div />,
  Legend: () => <div />,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => <div />,
}));

import DonorPortal from '../../pages/DonorPortal';

describe('DonorPortal', () => {
  it('renders without crashing', () => {
    renderWithProviders(<DonorPortal />);
    expect(document.body).toBeTruthy();
  });

  it('shows welcome or donor-related content', async () => {
    renderWithProviders(<DonorPortal />);
    await waitFor(() => {
      const text = screen.queryByText(/welcome/i) || screen.queryByText(/donor/i) || screen.queryByText(/impact/i) || screen.queryByText(/donation/i);
      expect(text).toBeTruthy();
    });
  });
});
