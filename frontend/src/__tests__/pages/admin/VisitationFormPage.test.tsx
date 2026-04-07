import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import VisitationFormPage from '../../../pages/admin/VisitationFormPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('VisitationFormPage', () => {
  it('renders the new visitation form', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin/visitations/new" element={<VisitationFormPage />} />
      </Routes>,
      { route: '/admin/visitations/new' },
    );
    await waitFor(() => {
      expect(document.querySelector('form') || screen.getByText(/Save|Visit/i)).toBeTruthy();
    });
  });
});
