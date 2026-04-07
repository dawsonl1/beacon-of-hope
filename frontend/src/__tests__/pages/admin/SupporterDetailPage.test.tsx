import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import SupporterDetailPage from '../../../pages/admin/SupporterDetailPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('SupporterDetailPage', () => {
  it('renders and loads supporter detail', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin/donors/:id" element={<SupporterDetailPage />} />
      </Routes>,
      { route: '/admin/donors/1' },
    );
    await waitFor(() => {
      expect(screen.getByText('John Patron')).toBeInTheDocument();
    });
  });
});
