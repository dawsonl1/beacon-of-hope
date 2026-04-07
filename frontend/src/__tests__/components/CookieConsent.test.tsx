import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CookieConsent from '../../components/CookieConsent';
import { CookieConsentProvider } from '../../contexts/CookieConsentContext';
import { BrowserRouter } from 'react-router-dom';

function renderBanner() {
  return render(
    <CookieConsentProvider>
      <BrowserRouter>
        <CookieConsent />
      </BrowserRouter>
    </CookieConsentProvider>,
  );
}

describe('CookieConsent banner', () => {
  beforeEach(() => {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
    });
  });

  it('does not show banner immediately', () => {
    renderBanner();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows banner after delay', () => {
    vi.useFakeTimers();
    renderBanner();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('displays privacy policy link', () => {
    vi.useFakeTimers();
    renderBanner();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('has Accept All, Reject Non-Essential, and Manage Preferences buttons', () => {
    vi.useFakeTimers();
    renderBanner();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getByText('Accept All')).toBeInTheDocument();
    expect(screen.getByText('Reject Non-Essential')).toBeInTheDocument();
    expect(screen.getByText('Manage Preferences')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('hides banner after Accept All is clicked', async () => {
    vi.useFakeTimers();
    renderBanner();
    act(() => { vi.advanceTimersByTime(1500); });
    vi.useRealTimers();

    const user = userEvent.setup();
    await user.click(screen.getByText('Accept All'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides banner after Reject Non-Essential is clicked', async () => {
    vi.useFakeTimers();
    renderBanner();
    act(() => { vi.advanceTimersByTime(1500); });
    vi.useRealTimers();

    const user = userEvent.setup();
    await user.click(screen.getByText('Reject Non-Essential'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
