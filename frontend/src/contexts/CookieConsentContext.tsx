// [SECURITY-10] Privacy — GDPR cookie consent (context): Manages consent state with three
// categories: Necessary (always on), Analytics (toggleable), Functional (toggleable).
// Consent is persisted in a non-HttpOnly cookie (boh_cookie_consent) with version tracking.
// When analytics consent is revoked, deleteAnalyticsCookies() removes GA cookies immediately.
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getCookie, setCookie, deleteAnalyticsCookies } from '../utils/cookies';

const COOKIE_NAME = 'boh_cookie_consent';
const POLICY_VERSION = '1.0';

export interface ConsentCategories {
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
}

interface ConsentState {
  categories: ConsentCategories;
  consentGiven: boolean;
  showBanner: boolean;
  showPreferences: boolean;
}

interface CookieConsentContextValue extends ConsentState {
  updateConsent: (categories: Partial<ConsentCategories>) => void;
  openPreferencesModal: () => void;
  closePreferencesModal: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function readConsentCookie(): { categories: ConsentCategories; version: string } | null {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      version: parsed.v ?? '',
      categories: {
        necessary: true,
        analytics: !!parsed.cat?.a,
        functional: !!parsed.cat?.f,
      },
    };
  } catch {
    return null;
  }
}

function writeConsentCookie(categories: ConsentCategories): void {
  const value = JSON.stringify({
    v: POLICY_VERSION,
    ts: new Date().toISOString(),
    cat: {
      n: true,
      a: categories.analytics,
      f: categories.functional,
    },
  });
  setCookie(COOKIE_NAME, value, 365);
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConsentState>(() => {
    const stored = readConsentCookie();
    if (stored && stored.version === POLICY_VERSION) {
      return {
        categories: stored.categories,
        consentGiven: true,
        showBanner: false,
        showPreferences: false,
      };
    }
    return {
      categories: { necessary: true, analytics: false, functional: false },
      consentGiven: false,
      showBanner: false,
      showPreferences: false,
    };
  });

  // Delay showing the banner slightly
  useEffect(() => {
    if (!state.consentGiven) {
      const timer = setTimeout(() => {
        setState(s => ({ ...s, showBanner: true }));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [state.consentGiven]);

  const updateConsent = useCallback((partial: Partial<ConsentCategories>) => {
    setState(prev => {
      const categories: ConsentCategories = {
        necessary: true,
        analytics: partial.analytics ?? prev.categories.analytics,
        functional: partial.functional ?? prev.categories.functional,
      };
      writeConsentCookie(categories);

      // If analytics was revoked, clean up cookies
      if (!categories.analytics && prev.categories.analytics) {
        deleteAnalyticsCookies();
      }

      return {
        categories,
        consentGiven: true,
        showBanner: false,
        showPreferences: false,
      };
    });
  }, []);

  const openPreferencesModal = useCallback(() => {
    setState(s => ({ ...s, showPreferences: true, showBanner: false }));
  }, []);

  const closePreferencesModal = useCallback(() => {
    setState(s => ({ ...s, showPreferences: false }));
  }, []);

  return (
    <CookieConsentContext.Provider value={{
      ...state,
      updateConsent,
      openPreferencesModal,
      closePreferencesModal,
    }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider');
  return ctx;
}
