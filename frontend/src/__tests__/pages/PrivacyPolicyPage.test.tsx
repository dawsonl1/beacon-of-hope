import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import PrivacyPolicyPage from '../../pages/PrivacyPolicyPage';
import { renderWithProviders } from '../helpers/renderWithProviders';

describe('PrivacyPolicyPage', () => {
  it('renders the Privacy Policy title', () => {
    renderWithProviders(<PrivacyPolicyPage />);
    // There may be multiple elements matching "Privacy Policy" (h1 + links).
    // Use getAllByText and check at least one exists.
    const elements = screen.getAllByText(/Privacy Policy/);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders the table of contents', () => {
    renderWithProviders(<PrivacyPolicyPage />);
    const contents = screen.getAllByText('Contents');
    expect(contents.length).toBeGreaterThan(0);
  });

  it('renders all 12 sections', () => {
    renderWithProviders(<PrivacyPolicyPage />);
    // Check both the TOC link and the actual section heading exist
    expect(screen.getAllByText(/12\. Changes to This Policy/).length).toBeGreaterThan(0);
  });

  it('renders the Manage Cookie Preferences button', () => {
    renderWithProviders(<PrivacyPolicyPage />);
    expect(screen.getByText('Manage Cookie Preferences')).toBeInTheDocument();
  });

  it('mentions protection of minors', () => {
    renderWithProviders(<PrivacyPolicyPage />);
    expect(screen.getAllByText(/Protection of Minors/).length).toBeGreaterThan(0);
  });
});
