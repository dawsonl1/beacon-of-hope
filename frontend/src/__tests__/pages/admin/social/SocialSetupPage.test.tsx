import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SocialSetupPage from '../../../../pages/admin/social/SocialSetupPage';
import { renderWithProviders } from '../../../helpers/renderWithProviders';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('voice-guide')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ orgDescription: 'Test org', toneDescription: 'Warm', preferredTerms: '{"residents":"not victims"}', avoidedTerms: '{"guilt":true}', structuralRules: 'End with hope', visualRules: 'No faces' }) });
    if (url.includes('talking-points')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ contentTalkingPointId: 1, text: 'We provide 24/7 care', topic: 'safehouse_model', usageCount: 3 }]) });
    if (url.includes('/facts') && !url.includes('candidates')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ contentFactId: 1, factText: '79% exploited before 18', sourceName: 'UNICEF', category: 'trafficking_stats', pillar: 'the_problem', usageCount: 1 }]) });
    if (url.includes('candidates')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    if (url.includes('hashtag')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    if (url.includes('settings')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ postsPerWeek: 10, platformsActive: '["instagram"]', timezone: 'America/Denver', recyclingEnabled: true, pillarRatioSafehouseLife: 30, pillarRatioTheProblem: 25, pillarRatioTheSolution: 20, pillarRatioDonorImpact: 15, pillarRatioCallToAction: 10 }) });
    if (opts?.method === 'PUT' || opts?.method === 'POST' || opts?.method === 'DELETE' || opts?.method === 'PATCH') return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }));
});

describe('SocialSetupPage', () => {
  it('renders page title and subtitle', async () => {
    renderWithProviders(<SocialSetupPage />);
    await waitFor(() => {
      expect(screen.getByText('Setup')).toBeInTheDocument();
      expect(screen.getByText(/Configure how the AI/)).toBeInTheDocument();
    });
  });

  it('shows 3 tabs', async () => {
    renderWithProviders(<SocialSetupPage />);
    await waitFor(() => {
      expect(screen.getByText('Voice & Brand')).toBeInTheDocument();
      expect(screen.getByText('Content Library')).toBeInTheDocument();
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });
  });

  it('voice tab shows org description and tone fields', async () => {
    renderWithProviders(<SocialSetupPage />);
    await waitFor(() => {
      expect(screen.getByText('About Your Organization')).toBeInTheDocument();
      expect(screen.getByText('Tone')).toBeInTheDocument();
      expect(screen.getByText('Preferred Language')).toBeInTheDocument();
      expect(screen.getByText('Language to Avoid')).toBeInTheDocument();
    });
  });

  it('voice tab shows preferred terms as chips', async () => {
    renderWithProviders(<SocialSetupPage />);
    await waitFor(() => expect(screen.getByText(/residents/)).toBeInTheDocument());
  });

  it('voice tab has save button', async () => {
    renderWithProviders(<SocialSetupPage />);
    await waitFor(() => expect(screen.getByText('Save')).toBeInTheDocument());
  });

  it('clicking Content Library tab shows facts and talking points', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SocialSetupPage />);
    await waitFor(() => expect(screen.getByText('Content Library')).toBeInTheDocument());
    await user.click(screen.getByText('Content Library'));
    await waitFor(() => {
      expect(screen.getByText('Facts & Statistics')).toBeInTheDocument();
      expect(screen.getByText('Talking Points')).toBeInTheDocument();
      expect(screen.getByText(/79% exploited/)).toBeInTheDocument();
      expect(screen.getByText(/24\/7 care/)).toBeInTheDocument();
    });
  });

  it('clicking Preferences tab shows settings', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SocialSetupPage />);
    await waitFor(() => expect(screen.getByText('Preferences')).toBeInTheDocument());
    await user.click(screen.getByText('Preferences'));
    await waitFor(() => {
      expect(screen.getByText('Posts per week')).toBeInTheDocument();
      expect(screen.getByText('Active platforms')).toBeInTheDocument();
      expect(screen.getByText('Content mix')).toBeInTheDocument();
      expect(screen.getByText('Safehouse Life')).toBeInTheDocument();
    });
  });

  it('save button on voice tab calls PUT', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SocialSetupPage />);
    await waitFor(() => expect(screen.getByText('Save')).toBeInTheDocument());
    await user.click(screen.getByText('Save'));
    await waitFor(() => {
      const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.some((c: unknown[]) => (c[1] as RequestInit | undefined)?.method === 'PUT')).toBe(true);
    });
  });
});
