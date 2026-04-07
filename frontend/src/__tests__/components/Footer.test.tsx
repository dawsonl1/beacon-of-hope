import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import Footer from '../../components/Footer';
import { renderWithProviders } from '../helpers/renderWithProviders';

describe('Footer', () => {
  it('renders the Beacon of Hope brand', () => {
    renderWithProviders(<Footer />);
    expect(screen.getByText('Beacon of Hope')).toBeInTheDocument();
  });

  it('renders the nonprofit tagline', () => {
    renderWithProviders(<Footer />);
    expect(screen.getByText(/501\(c\)\(3\) nonprofit/)).toBeInTheDocument();
  });

  it('renders Privacy Policy link', () => {
    renderWithProviders(<Footer />);
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('renders Cookie Settings button', () => {
    renderWithProviders(<Footer />);
    expect(screen.getByText('Cookie Settings')).toBeInTheDocument();
  });

  it('renders social links', () => {
    renderWithProviders(<Footer />);
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  });

  it('displays current year in copyright', () => {
    renderWithProviders(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it('uses absolute paths for anchor links so they work from any page', () => {
    renderWithProviders(<Footer />);
    const missionLink = screen.getByText('Our Mission').closest('a');
    const impactLink = screen.getByText('Our Impact').closest('a');
    const involvedLink = screen.getByText('Get Involved').closest('a');
    expect(missionLink?.getAttribute('href')).toBe('/#mission');
    expect(impactLink?.getAttribute('href')).toBe('/#impact');
    expect(involvedLink?.getAttribute('href')).toBe('/#involved');
  });
});
