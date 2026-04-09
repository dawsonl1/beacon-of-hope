import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SocialPostsPage from '../../../../pages/admin/social/SocialPostsPage';
import { renderWithProviders } from '../../../helpers/renderWithProviders';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('status=draft')) return Promise.resolve({ ok: true, json: () => Promise.resolve([
      { automatedPostId: 1, content: 'Draft about art therapy', contentPillar: 'safehouse_life', source: 'auto_generated', status: 'draft', platform: 'instagram', scheduledAt: null, engagementLikes: null, createdAt: '2026-04-08T12:00:00Z' },
    ]) });
    if (url.includes('status=ready_to_publish')) return Promise.resolve({ ok: true, json: () => Promise.resolve([
      { automatedPostId: 2, content: 'Ready post', contentPillar: 'the_problem', status: 'ready_to_publish', platform: 'facebook', scheduledAt: '2026-04-10T09:00:00Z', engagementLikes: null, createdAt: '2026-04-08T12:00:00Z' },
    ]) });
    if (url.includes('status=published')) return Promise.resolve({ ok: true, json: () => Promise.resolve([
      { automatedPostId: 3, content: 'Published post', contentPillar: 'donor_impact', status: 'published', platform: 'instagram', engagementLikes: null, createdAt: '2026-04-07T12:00:00Z' },
    ]) });
    if (url.includes('calendar')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    if (opts?.method === 'PATCH' || opts?.method === 'POST') return Promise.resolve({ ok: true, json: () => Promise.resolve({ generated: 2 }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }));
});

describe('SocialPostsPage', () => {
  it('renders page title', async () => {
    renderWithProviders(<SocialPostsPage />);
    await waitFor(() => expect(screen.getByText('Social Media')).toBeInTheDocument());
  });

  it('shows generate button', async () => {
    renderWithProviders(<SocialPostsPage />);
    await waitFor(() => expect(screen.getByText('Generate Posts')).toBeInTheDocument());
  });

  it('shows Review Drafts section with posts', async () => {
    renderWithProviders(<SocialPostsPage />);
    await waitFor(() => {
      expect(screen.getByText('Review Drafts')).toBeInTheDocument();
      expect(screen.getByText(/art therapy/)).toBeInTheDocument();
    });
  });

  it('shows approve and edit buttons on drafts', async () => {
    renderWithProviders(<SocialPostsPage />);
    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('shows Ready to Publish section', async () => {
    renderWithProviders(<SocialPostsPage />);
    await waitFor(() => {
      expect(screen.getByText('Ready to Publish')).toBeInTheDocument();
      expect(screen.getByText('Copy Text')).toBeInTheDocument();
      expect(screen.getByText('Mark Published')).toBeInTheDocument();
    });
  });

  it('shows Schedule section with week view', async () => {
    renderWithProviders(<SocialPostsPage />);
    await waitFor(() => {
      expect(screen.getByText('Schedule')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
    });
  });

  it('shows Log Engagement section for published posts', async () => {
    renderWithProviders(<SocialPostsPage />);
    await waitFor(() => {
      expect(screen.getByText('Log Engagement')).toBeInTheDocument();
      expect(screen.getByText('Log')).toBeInTheDocument();
    });
  });

  it('clicking approve calls the API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SocialPostsPage />);
    await waitFor(() => expect(screen.getByText('Approve')).toBeInTheDocument());
    await user.click(screen.getByText('Approve'));
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.some((c: string[]) => c[0]?.includes('/approve'))).toBe(true);
  });

  it('clicking generate calls the API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SocialPostsPage />);
    await waitFor(() => expect(screen.getByText('Generate Posts')).toBeInTheDocument());
    await user.click(screen.getByText('Generate Posts'));
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.some((c: string[]) => c[0]?.includes('/generate'))).toBe(true);
  });

  it('shows pillar badges', async () => {
    renderWithProviders(<SocialPostsPage />);
    await waitFor(() => {
      expect(screen.getByText('Safehouse Life')).toBeInTheDocument();
      expect(screen.getByText('Awareness')).toBeInTheDocument();
    });
  });
});
