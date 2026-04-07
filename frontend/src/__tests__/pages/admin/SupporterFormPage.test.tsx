import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import SupporterFormPage from '../../../pages/admin/SupporterFormPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('SupporterFormPage', () => {
  it('renders the new supporter form', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin/donors/new" element={<SupporterFormPage />} />
      </Routes>,
      { route: '/admin/donors/new' },
    );
    await waitFor(() => {
      expect(document.querySelector('form') || screen.getByText(/Save|Supporter/i)).toBeTruthy();
    });
  });
});
