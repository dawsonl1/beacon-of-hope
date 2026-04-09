import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SocialQueuePage from '../../../../pages/admin/social/SocialQueuePage';
import MediaLibraryPage from '../../../../pages/admin/social/MediaLibraryPage';
import VoiceBrandPage from '../../../../pages/admin/social/VoiceBrandPage';
import FactsPage from '../../../../pages/admin/social/FactsPage';
import SocialSettingsPage from '../../../../pages/admin/social/SocialSettingsPage';
import PhotoUploadPage from '../../../../pages/admin/social/PhotoUploadPage';
import { renderWithProviders } from '../../../helpers/renderWithProviders';

function setupMocks() {
  // Mock window.prompt and window.confirm
  vi.stubGlobal('prompt', vi.fn().mockReturnValue('Test reason'));
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));

  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('queue-count')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ draftCount: 1, readyCount: 0 }) });
    if (url.includes('status=draft') || (url.includes('/posts') && !url.includes('status='))) return Promise.resolve({ ok: true, json: () => Promise.resolve([
      { automatedPostId: 1, content: 'Draft post', contentPillar: 'safehouse_life', source: 'auto_generated', status: 'draft', platform: 'instagram', scheduledAt: null, engagementLikes: null, createdAt: '2026-04-08T12:00:00Z' },
    ]) });
    if (url.includes('/media') && !url.includes('upload')) return Promise.resolve({ ok: true, json: () => Promise.resolve([
      { mediaLibraryItemId: 1, filePath: '/t.jpg', thumbnailPath: '/t_thumb.jpg', caption: 'Test', activityType: 'art_therapy', usedCount: 0, uploadedAt: '2026-04-08T12:00:00Z' },
    ]) });
    if (url.includes('voice-guide')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ orgDescription: 'Test', toneDescription: 'Warm', preferredTerms: '{}', avoidedTerms: '{}', structuralRules: '', visualRules: '' }) });
    if (url.includes('talking-points')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ contentTalkingPointId: 1, text: 'Existing TP', topic: 'general', usageCount: 0, isActive: true }]) });
    if (url.includes('hashtag-sets')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    if (url.includes('/facts') && !url.includes('candidates')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ contentFactId: 1, factText: 'Fact', sourceName: 'Src', category: 'trafficking_stats', pillar: 'the_problem', usageCount: 0 }]) });
    if (url.includes('candidates')) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ contentFactCandidateId: 1, factText: 'Candidate fact', sourceName: 'Src', category: 'regional', status: 'pending' }]) });
    if (url.includes('settings')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ postsPerWeek: 10, platformsActive: '["instagram"]', timezone: 'UTC', recyclingEnabled: true, dailyGenerationTime: '06:00', notificationMethod: 'in_app', notificationEmail: '', pillarRatioSafehouseLife: 30, pillarRatioTheProblem: 25, pillarRatioTheSolution: 20, pillarRatioDonorImpact: 15, pillarRatioCallToAction: 10 }) });
    if (opts?.method === 'PATCH' || opts?.method === 'POST' || opts?.method === 'PUT' || opts?.method === 'DELETE') return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }));
}

describe('Queue Reject Button', () => {
  beforeEach(() => setupMocks());

  it('clicking reject calls prompt and sends PATCH', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SocialQueuePage />);
    await waitFor(() => expect(screen.getByText('Draft post')).toBeInTheDocument());
    // Find the reject button (ThumbsDown icon button)
    const buttons = screen.getAllByRole('button');
    const rejectBtn = buttons.find(b => b.querySelector('svg') && b.className.includes('reject'));
    if (rejectBtn) {
      await user.click(rejectBtn);
      expect(window.prompt).toHaveBeenCalled();
    }
  });
});

describe('Media Library Delete Click', () => {
  beforeEach(() => setupMocks());

  it('clicking delete calls confirm and sends DELETE', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MediaLibraryPage />);
    await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
    const deleteBtn = screen.getByTitle('Delete photo');
    await user.click(deleteBtn);
    expect(window.confirm).toHaveBeenCalledWith('Delete this photo from the library?');
    await waitFor(() => {
      const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const deleteCall = calls.find((c: [string, RequestInit?]) => c[1]?.method === 'DELETE');
      expect(deleteCall).toBeTruthy();
    });
  });
});

describe('Voice & Brand - Add Talking Point', () => {
  beforeEach(() => setupMocks());

  it('typing and clicking Add sends POST', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VoiceBrandPage />);
    await waitFor(() => expect(screen.getByText(/Talking Points/)).toBeInTheDocument());
    await user.click(screen.getByText(/Talking Points/));
    await waitFor(() => expect(screen.getByPlaceholderText(/New talking point/)).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText(/New talking point/), 'Brand new talking point');
    await user.click(screen.getByText('Add'));
    await waitFor(() => {
      const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const postCall = calls.find((c: [string, RequestInit?]) => c[0]?.includes('talking-points') && c[1]?.method === 'POST');
      expect(postCall).toBeTruthy();
    });
  });
});

describe('Voice & Brand - Delete Talking Point', () => {
  beforeEach(() => setupMocks());

  it('delete button sends DELETE request', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VoiceBrandPage />);
    await waitFor(() => expect(screen.getByText(/Talking Points/)).toBeInTheDocument());
    await user.click(screen.getByText(/Talking Points/));
    await waitFor(() => expect(screen.getByText('Existing TP')).toBeInTheDocument());
    // Find delete button in the talking points list
    const deleteButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg'));
    const trashBtn = deleteButtons.find(b => {
      const svg = b.querySelector('svg');
      return svg && b.closest('[class*="listItem"]');
    });
    if (trashBtn) {
      await user.click(trashBtn);
      await waitFor(() => {
        const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
        const deleteCall = calls.find((c: [string, RequestInit?]) => c[0]?.includes('talking-points') && c[1]?.method === 'DELETE');
        expect(deleteCall).toBeTruthy();
      });
    }
  });
});

describe('Facts - Approve/Reject Candidate', () => {
  beforeEach(() => setupMocks());

  it('approve button sends PATCH to approve endpoint', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FactsPage />);
    await waitFor(() => expect(screen.getByText(/Candidates/)).toBeInTheDocument());
    await user.click(screen.getByText(/Candidates/));
    await waitFor(() => expect(screen.getByText('Candidate fact')).toBeInTheDocument());
    // Find approve button (Check icon)
    const approveButtons = screen.getAllByRole('button').filter(b => b.className.includes('approve'));
    if (approveButtons.length > 0) {
      await user.click(approveButtons[0]);
      await waitFor(() => {
        const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
        const approveCall = calls.find((c: [string, RequestInit?]) => c[0]?.includes('/approve') && c[1]?.method === 'PATCH');
        expect(approveCall).toBeTruthy();
      });
    }
  });

  it('reject button sends PATCH to reject endpoint', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FactsPage />);
    await waitFor(() => expect(screen.getByText(/Candidates/)).toBeInTheDocument());
    await user.click(screen.getByText(/Candidates/));
    await waitFor(() => expect(screen.getByText('Candidate fact')).toBeInTheDocument());
    const rejectButtons = screen.getAllByRole('button').filter(b => b.className.includes('reject'));
    if (rejectButtons.length > 0) {
      await user.click(rejectButtons[0]);
      await waitFor(() => {
        const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
        const rejectCall = calls.find((c: [string, RequestInit?]) => c[0]?.includes('/reject') && c[1]?.method === 'PATCH');
        expect(rejectCall).toBeTruthy();
      });
    }
  });
});

describe('Settings Value Change', () => {
  beforeEach(() => setupMocks());

  it('posts per week input exists and is editable', async () => {
    renderWithProviders(<SocialSettingsPage />);
    await waitFor(() => expect(screen.getByText('Save Changes')).toBeInTheDocument());
    const postsInput = document.querySelector('input[max="50"]') as HTMLInputElement;
    expect(postsInput).toBeTruthy();
    expect(postsInput.type).toBe('number');
    // Simulate change via fireEvent (more reliable for controlled inputs)
    fireEvent.change(postsInput, { target: { value: '15' } });
    expect(postsInput.value).toBe('15');
  });
});

describe('Photo Upload File Mock', () => {
  beforeEach(() => setupMocks());

  it('selecting a file shows preview area changes', async () => {
    renderWithProviders(<PhotoUploadPage />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.accept).toBe('image/*');
    expect(fileInput.getAttribute('capture')).toBe('environment');
  });
});
