import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../helpers/renderWithProviders';

// Mock recharts for DonatePage if it uses charts
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

import DonatePage from '../../pages/DonatePage';
import DonateSuccessPage from '../../pages/DonateSuccessPage';
import LoginPage from '../../pages/LoginPage';

describe('DonatePage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<DonatePage />);
    // Should have some donate-related content
    const page = document.querySelector('main') || document.querySelector('[class*="page"]') || document.body;
    expect(page).toBeTruthy();
  });

  it('shows donation-related content', () => {
    renderWithProviders(<DonatePage />);
    // Look for any text related to donating
    const donateText = screen.queryByText(/donate/i) || screen.queryByText(/give/i) || screen.queryByText(/support/i);
    expect(donateText).toBeTruthy();
  });
});

describe('DonateSuccessPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<DonateSuccessPage />);
    expect(document.body).toBeTruthy();
  });

  it('shows loading or content state', () => {
    renderWithProviders(<DonateSuccessPage />);
    // Page needs a session_id query param to fetch data, so may show loading/error
    expect(document.body.textContent!.length).toBeGreaterThan(0);
  });
});

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it('sign in button is disabled when fields are empty', () => {
    renderWithProviders(<LoginPage />);
    const signInBtn = screen.getByRole('button', { name: /sign in/i });
    expect(signInBtn).toBeDisabled();
  });

  it('shows Remember me checkbox', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText('Remember me')).toBeInTheDocument();
  });

  it('shows Back to homepage link', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText('Back to homepage')).toBeInTheDocument();
  });
});
