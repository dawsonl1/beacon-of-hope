import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import SupporterDetailPage from '../../../pages/admin/SupporterDetailPage';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import { server } from '../../mocks/server';

const API = 'http://localhost:5001';

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/donors/:id" element={<SupporterDetailPage />} />
    </Routes>,
    { route: '/admin/donors/1' },
  );
}

describe('SupporterDetailPage', () => {
  it('renders and loads supporter detail', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('John Patron')).toBeInTheDocument();
    });
  });

  it('renders retention risk card with outreach CTAs when risk is High', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Retention Risk')).toBeInTheDocument();
    });
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log note/i })).toBeInTheDocument();
  });

  it('does not render risk factors section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Retention Risk')).toBeInTheDocument();
    });
    expect(screen.queryByText('Top risk factors')).not.toBeInTheDocument();
  });

  it('renders outreach history', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Outreach History')).toBeInTheDocument();
    });
    expect(screen.getByText(/Director Reyes/)).toBeInTheDocument();
    expect(screen.getByText(/Called donor to thank for recent contribution/)).toBeInTheDocument();
  });

  it('does not show CTAs when risk is Low', async () => {
    server.use(
      http.get(`${API}/api/ml/predictions/supporter/:id`, () =>
        HttpResponse.json([
          { id: 10, modelName: 'donor-churn', score: 15, scoreLabel: 'Low', predictedAt: '2026-02-16', metadata: '{}' },
        ]),
      ),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Retention Risk')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /send email/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log note/i })).not.toBeInTheDocument();
  });

  it('log note shows text input and saves', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log note/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /log note/i }));
    const textarea = screen.getByPlaceholderText(/add a note/i);
    expect(textarea).toBeInTheDocument();
    await user.type(textarea, 'Spoke with donor');
    await user.click(screen.getByRole('button', { name: /save note/i }));
    // After saving, the textarea should be hidden
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/add a note/i)).not.toBeInTheDocument();
    });
  });

  it('shows delete buttons on outreach history items', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Outreach History')).toBeInTheDocument();
    });
    const deleteButtons = screen.getAllByTitle('Delete');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('shows edit button on Note type outreach items', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Outreach History')).toBeInTheDocument();
    });
    const editButtons = screen.getAllByTitle('Edit note');
    expect(editButtons.length).toBe(1); // Only the Note record, not the Email
  });

  it('clicking edit note shows textarea with existing note text', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Outreach History')).toBeInTheDocument();
    });
    await user.click(screen.getByTitle('Edit note'));
    const textarea = screen.getByDisplayValue('Called donor to thank for recent contribution');
    expect(textarea).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});
