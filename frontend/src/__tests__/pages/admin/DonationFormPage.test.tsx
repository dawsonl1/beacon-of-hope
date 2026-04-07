import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import DonationFormPage from '../../../pages/admin/DonationFormPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('DonationFormPage', () => {
  it('renders the new donation form', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin/donations/new" element={<DonationFormPage />} />
      </Routes>,
      { route: '/admin/donations/new' },
    );
    await waitFor(() => {
      expect(document.querySelector('form') || screen.getByText(/Save|Donation/i)).toBeTruthy();
    });
  });
});
