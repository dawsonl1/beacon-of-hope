import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CookieConsentProvider, useCookieConsent } from '../../contexts/CookieConsentContext';
import { getCookie } from '../../utils/cookies';

function CookieConsumer() {
  const {
    categories,
    consentGiven,
    showBanner,
    showPreferences,
    updateConsent,
    openPreferencesModal,
    closePreferencesModal,
  } = useCookieConsent();
  return (
    <div>
      <span data-testid="consent-given">{String(consentGiven)}</span>
      <span data-testid="show-banner">{String(showBanner)}</span>
      <span data-testid="show-preferences">{String(showPreferences)}</span>
      <span data-testid="analytics">{String(categories.analytics)}</span>
      <span data-testid="functional">{String(categories.functional)}</span>
      <span data-testid="necessary">{String(categories.necessary)}</span>
      <button onClick={() => updateConsent({ analytics: true, functional: true })}>Accept All</button>
      <button onClick={() => updateConsent({ analytics: false, functional: false })}>Reject</button>
      <button onClick={() => updateConsent({ analytics: true, functional: false })}>Analytics Only</button>
      <button onClick={openPreferencesModal}>Open Prefs</button>
      <button onClick={closePreferencesModal}>Close Prefs</button>
    </div>
  );
}

function renderConsent() {
  return render(
    <CookieConsentProvider>
      <CookieConsumer />
    </CookieConsentProvider>,
  );
}

describe('CookieConsentContext', () => {
  beforeEach(() => {
    // Clear consent cookie
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
    });
  });

  it('initializes with consent not given when no cookie exists', () => {
    renderConsent();
    expect(screen.getByTestId('consent-given').textContent).toBe('false');
  });

  it('necessary cookies are always true', () => {
    renderConsent();
    expect(screen.getByTestId('necessary').textContent).toBe('true');
  });

  it('shows banner after delay when consent not given', async () => {
    vi.useFakeTimers();
    renderConsent();
    expect(screen.getByTestId('show-banner').textContent).toBe('false');

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByTestId('show-banner').textContent).toBe('true');
    vi.useRealTimers();
  });

  it('accept all sets analytics and functional to true', async () => {
    renderConsent();
    const user = userEvent.setup();
    await user.click(screen.getByText('Accept All'));

    expect(screen.getByTestId('analytics').textContent).toBe('true');
    expect(screen.getByTestId('functional').textContent).toBe('true');
    expect(screen.getByTestId('consent-given').textContent).toBe('true');
  });

  it('reject sets analytics and functional to false', async () => {
    renderConsent();
    const user = userEvent.setup();
    await user.click(screen.getByText('Reject'));

    expect(screen.getByTestId('analytics').textContent).toBe('false');
    expect(screen.getByTestId('functional').textContent).toBe('false');
    expect(screen.getByTestId('consent-given').textContent).toBe('true');
  });

  it('persists consent in cookie after accepting', async () => {
    renderConsent();
    const user = userEvent.setup();
    await user.click(screen.getByText('Accept All'));

    const raw = getCookie('boh_cookie_consent');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.v).toBe('1.0');
    expect(parsed.cat.a).toBe(true);
    expect(parsed.cat.f).toBe(true);
  });

  it('openPreferencesModal shows preferences and hides banner', async () => {
    renderConsent();
    const user = userEvent.setup();
    await user.click(screen.getByText('Open Prefs'));

    expect(screen.getByTestId('show-preferences').textContent).toBe('true');
    expect(screen.getByTestId('show-banner').textContent).toBe('false');
  });

  it('closePreferencesModal hides preferences', async () => {
    renderConsent();
    const user = userEvent.setup();
    await user.click(screen.getByText('Open Prefs'));
    await user.click(screen.getByText('Close Prefs'));

    expect(screen.getByTestId('show-preferences').textContent).toBe('false');
  });

  it('useCookieConsent throws outside provider', () => {
    function Orphan() {
      useCookieConsent();
      return null;
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow('useCookieConsent must be used within CookieConsentProvider');
    spy.mockRestore();
  });
});
