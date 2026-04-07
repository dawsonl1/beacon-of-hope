import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import ResidentDetailPage from '../../../pages/admin/ResidentDetailPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('ResidentDetailPage', () => {
  it('renders and loads resident detail', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin/caseload/:id" element={<ResidentDetailPage />} />
      </Routes>,
      { route: '/admin/caseload/1' },
    );
    await waitFor(() => {
      const matches = screen.getAllByText(/LS-0001/);
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
