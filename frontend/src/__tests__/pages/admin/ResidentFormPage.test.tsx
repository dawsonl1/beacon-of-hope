import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import ResidentFormPage from '../../../pages/admin/ResidentFormPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('ResidentFormPage', () => {
  it('renders the new resident form', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin/caseload/new" element={<ResidentFormPage />} />
      </Routes>,
      { route: '/admin/caseload/new' },
    );
    await waitFor(() => {
      // The form should be present — look for a Save or form-related element
      expect(document.querySelector('form') || screen.getByText(/Save|Add|Resident/i)).toBeTruthy();
    });
  });
});
