import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import ImpactPage from '../../pages/ImpactPage';
import { renderWithProviders } from '../helpers/renderWithProviders';

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => {
  const MockedResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  );
  const MockedBarChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  );
  return {
    ResponsiveContainer: MockedResponsiveContainer,
    BarChart: MockedBarChart,
    Bar: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Cell: () => <div />,
  };
});

describe('ImpactPage', () => {
  it('renders the page headline', () => {
    renderWithProviders(<ImpactPage />);
    expect(screen.getByText(/Our impact, by the numbers/)).toBeInTheDocument();
  });

  it('renders live data label', () => {
    renderWithProviders(<ImpactPage />);
    expect(screen.getByText('Live data')).toBeInTheDocument();
  });

  it('loads and shows impact summary stats', async () => {
    renderWithProviders(<ImpactPage />);
    await waitFor(() => {
      expect(screen.getByText('Girls served')).toBeInTheDocument();
    });
  });

  it('renders stories section', () => {
    renderWithProviders(<ImpactPage />);
    expect(screen.getAllByText('Stories of hope').length).toBeGreaterThan(0);
  });

  it('renders donate CTA', () => {
    renderWithProviders(<ImpactPage />);
    expect(screen.getByText(/Inspired by what you've seen/)).toBeInTheDocument();
  });
});
