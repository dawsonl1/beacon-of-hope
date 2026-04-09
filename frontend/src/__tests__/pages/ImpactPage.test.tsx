import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import ImpactPage from '../../pages/ImpactPage';
import { renderWithProviders } from '../helpers/renderWithProviders';

describe('ImpactPage', () => {
  it('renders the page headline', () => {
    renderWithProviders(<ImpactPage />);
    expect(screen.getByText(/Every number represents/)).toBeInTheDocument();
  });

  it('loads and shows impact summary stats', async () => {
    renderWithProviders(<ImpactPage />);
    await waitFor(() => {
      expect(screen.getByText('Girls served')).toBeInTheDocument();
    });
  });

  it('renders where donations go section', () => {
    renderWithProviders(<ImpactPage />);
    expect(screen.getByText(/Where your donations go/)).toBeInTheDocument();
  });

  it('renders stories section', () => {
    renderWithProviders(<ImpactPage />);
    expect(screen.getByText('Stories of hope')).toBeInTheDocument();
  });

  it('renders donate CTA', () => {
    renderWithProviders(<ImpactPage />);
    expect(screen.getByText(/Donate Now/)).toBeInTheDocument();
  });
});
