import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import RecordingDetailPage from '../../../pages/admin/RecordingDetailPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('RecordingDetailPage', () => {
  it('renders and loads recording detail', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin/recordings/:id" element={<RecordingDetailPage />} />
      </Routes>,
      { route: '/admin/recordings/1' },
    );
    await waitFor(() => {
      expect(screen.getByText('LS-0001')).toBeInTheDocument();
    });
  });
});
