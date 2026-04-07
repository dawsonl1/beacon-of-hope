import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import RecordingFormPage from '../../../pages/admin/RecordingFormPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';

describe('RecordingFormPage', () => {
  it('renders the new recording form', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin/recordings/new" element={<RecordingFormPage />} />
      </Routes>,
      { route: '/admin/recordings/new' },
    );
    await waitFor(() => {
      expect(document.querySelector('form') || screen.getByText(/Save|Recording/i)).toBeTruthy();
    });
  });
});
