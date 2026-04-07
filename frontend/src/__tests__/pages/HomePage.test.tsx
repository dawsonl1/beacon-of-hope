import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import HomePage from '../../pages/HomePage';
import { renderWithProviders } from '../helpers/renderWithProviders';

describe('HomePage', () => {
  it('renders the hero headline', async () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Restoring hope/)).toBeInTheDocument();
  });

  it('renders the mission section', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText('Our Mission')).toBeInTheDocument();
  });

  it('renders the Get Involved section', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText('Get Involved')).toBeInTheDocument();
  });

  it('loads and displays impact stats', async () => {
    renderWithProviders(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText('Girls served since founding')).toBeInTheDocument();
    });
  });

  it('renders the testimonial section', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Beacon of Hope gave me one/)).toBeInTheDocument();
  });

  it('displays donations in K format not M', async () => {
    renderWithProviders(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText('Donations received')).toBeInTheDocument();
    });
    // Should show K suffix, not M (which would round to 0 for small amounts)
    expect(screen.queryByText(/₱0M/)).not.toBeInTheDocument();
  });
});
