import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SocialPhotosPage from '../../../../pages/admin/social/SocialPhotosPage';
import { renderWithProviders } from '../../../helpers/renderWithProviders';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/media') && !url.includes('upload')) return Promise.resolve({ ok: true, json: () => Promise.resolve([
      { mediaLibraryItemId: 1, filePath: '/t.jpg', thumbnailPath: '/t.jpg', caption: 'Art therapy session', activityType: 'art_therapy', usedCount: 2, uploadedAt: '2026-04-08T12:00:00Z' },
      { mediaLibraryItemId: 2, filePath: '/t2.jpg', thumbnailPath: '/t2.jpg', caption: 'Movie night', activityType: 'daily_life', usedCount: 0, uploadedAt: '2026-04-07T12:00:00Z' },
    ]) });
    if (opts?.method === 'POST' || opts?.method === 'DELETE') return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }));
});

describe('SocialPhotosPage', () => {
  it('renders page title', async () => {
    renderWithProviders(<SocialPhotosPage />);
    await waitFor(() => expect(screen.getByText('Photos')).toBeInTheDocument());
  });

  it('shows photo count', async () => {
    renderWithProviders(<SocialPhotosPage />);
    await waitFor(() => expect(screen.getByText('2 photos in the library')).toBeInTheDocument());
  });

  it('shows upload button', async () => {
    renderWithProviders(<SocialPhotosPage />);
    await waitFor(() => expect(screen.getByText('Upload Photo')).toBeInTheDocument());
  });

  it('shows photo cards with captions', async () => {
    renderWithProviders(<SocialPhotosPage />);
    await waitFor(() => {
      expect(screen.getByText('Art therapy session')).toBeInTheDocument();
      expect(screen.getByText('Movie night')).toBeInTheDocument();
    });
  });

  it('shows activity type labels', async () => {
    renderWithProviders(<SocialPhotosPage />);
    await waitFor(() => {
      expect(screen.getByText('Art Therapy')).toBeInTheDocument();
      expect(screen.getByText('Daily Life')).toBeInTheDocument();
    });
  });

  it('shows usage badge on used photos', async () => {
    renderWithProviders(<SocialPhotosPage />);
    await waitFor(() => expect(screen.getByText('Used 2x')).toBeInTheDocument());
  });

  it('has activity type filter', async () => {
    renderWithProviders(<SocialPhotosPage />);
    await waitFor(() => expect(screen.getByDisplayValue('All types')).toBeInTheDocument());
  });

  it('clicking Upload Photo shows upload panel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SocialPhotosPage />);
    await waitFor(() => expect(screen.getByText('Upload Photo')).toBeInTheDocument());
    await user.click(screen.getByText('Upload Photo'));
    expect(screen.getByText(/Tap to select a photo/)).toBeInTheDocument();
    expect(screen.getByText(/consent/i)).toBeInTheDocument();
  });

  it('file input has correct attributes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SocialPhotosPage />);
    await waitFor(() => expect(screen.getByText('Upload Photo')).toBeInTheDocument());
    await user.click(screen.getByText('Upload Photo'));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.accept).toBe('image/*');
  });
});
