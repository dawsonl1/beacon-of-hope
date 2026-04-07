import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import VisitationDetailPage from '../../../pages/admin/VisitationDetailPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('VisitationDetailPage', () => {
  it('renders and loads visitation detail', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin/visitations/:id" element={<VisitationDetailPage />} />
      </Routes>,
      { route: '/admin/visitations/1' },
    );
    await waitFor(() => {
      expect(screen.getByText(/LS-0001/)).toBeInTheDocument();
    });
  });
});
