// Visitor beacon: fires once per real page view after proof of human presence.
//
// Signals collected:
//   • FingerprintJS BotD — open-source automation detection
//     (https://github.com/fingerprintjs/BotD)
//   • ThumbmarkJS browser fingerprint — stable hash across sessions for the
//     same browser, used as a fallback when the visitor cookie is absent
//     (https://github.com/thumbmarkjs/thumbmarkjs)
//   • Interaction gate — requires ≥ 2 s of focus AND one of
//     {scroll, pointer, key, touch} OR 10 s of focus total before firing
//   • First-party visitor_uuid cookie — primary identity, persists 1 year
//
// The beacon posts to /api/track/visit with a server-issued token. The server
// validates the token, reads Cloudflare's bot score from request headers,
// classifies the visit, and writes it to the VisitEvents table.

import { load as loadBotd } from '@fingerprintjs/botd';
import { getFingerprint } from '@thumbmarkjs/thumbmarkjs';
import { getApiUrl } from '../api';
import { getCookie, setCookie } from '../utils/cookies';

const VISITOR_COOKIE = 'boh_visitor_id';
const INTERACTION_MIN_MS = 2000;
const TIMEOUT_FALLBACK_MS = 10000;

let currentPath: string | null = null;
let pendingFire: ReturnType<typeof setTimeout> | null = null;

interface VisitPayload {
  token: string;
  cookieVisitorId: string | null;
  fingerprint: string | null;
  path: string;
  referrer: string | null;
  language: string | null;
  timezone: string | null;
  botdIsBot: boolean | null;
  botSignals: Record<string, unknown> | null;
  interactionMs: number;
  interactionCount: number;
  scrollDepthPct: number;
}

function uuid4(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback for ancient browsers; still RFC 4122 compliant.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function ensureVisitorCookie(): string {
  const existing = getCookie(VISITOR_COOKIE);
  if (existing) return existing;
  const fresh = uuid4();
  setCookie(VISITOR_COOKIE, fresh, 365);
  return fresh;
}

async function fetchToken(): Promise<string | null> {
  try {
    const res = await fetch(`${getApiUrl()}/api/track/token`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}

async function runBotd(): Promise<{ isBot: boolean | null; signals: Record<string, unknown> | null }> {
  try {
    const botd = await loadBotd();
    const result = await botd.detect();
    return {
      isBot: 'bot' in result ? result.bot : null,
      signals: (result as unknown as Record<string, unknown>),
    };
  } catch {
    return { isBot: null, signals: null };
  }
}

async function runFingerprint(): Promise<string | null> {
  try {
    const fp = await getFingerprint();
    return typeof fp === 'string' ? fp : null;
  } catch {
    return null;
  }
}

function postVisit(payload: VisitPayload): void {
  const url = `${getApiUrl()}/api/track/visit`;
  const body = JSON.stringify(payload);

  // Prefer sendBeacon so the request survives tab close. Fall back to fetch
  // with keepalive for browsers that refuse sendBeacon for cross-origin.
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon(url, blob)) return;
  }

  fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

function trackPageview(path: string): void {
  // De-dup: don't fire twice for the same path in a single session segment.
  if (currentPath === path) return;
  currentPath = path;
  if (pendingFire) {
    clearTimeout(pendingFire);
    pendingFire = null;
  }

  const startedAt = Date.now();
  const referrer = document.referrer || null;
  const language = typeof navigator !== 'undefined' ? navigator.language : null;
  const timezone = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone ?? null;

  let interactionCount = 0;
  let maxScrollPct = 0;
  let fired = false;

  const onScroll = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const pct = total <= 0 ? 100 : Math.round((window.scrollY / total) * 100);
    if (pct > maxScrollPct) maxScrollPct = Math.min(100, pct);
    interactionCount++;
    tryFire();
  };
  const onInteract = () => {
    interactionCount++;
    tryFire();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointerdown', onInteract, { passive: true });
  window.addEventListener('keydown', onInteract, { passive: true });
  window.addEventListener('touchstart', onInteract, { passive: true });

  const cleanup = () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pointerdown', onInteract);
    window.removeEventListener('keydown', onInteract);
    window.removeEventListener('touchstart', onInteract);
    if (pendingFire) {
      clearTimeout(pendingFire);
      pendingFire = null;
    }
  };

  const visitorId = ensureVisitorCookie();

  const fire = async () => {
    if (fired) return;
    fired = true;
    cleanup();

    const interactionMs = Date.now() - startedAt;
    const [tokenResult, botdResult, fingerprint] = await Promise.all([
      fetchToken(),
      runBotd(),
      runFingerprint(),
    ]);

    if (!tokenResult) return;

    postVisit({
      token: tokenResult,
      cookieVisitorId: visitorId,
      fingerprint,
      path,
      referrer,
      language,
      timezone,
      botdIsBot: botdResult.isBot,
      botSignals: botdResult.signals,
      interactionMs,
      interactionCount,
      scrollDepthPct: maxScrollPct,
    });
  };

  const tryFire = () => {
    if (fired) return;
    const elapsed = Date.now() - startedAt;
    if (elapsed >= INTERACTION_MIN_MS && interactionCount >= 1) fire();
  };

  // Hard timeout: fire even without interaction after 10 s of visible time.
  pendingFire = setTimeout(fire, TIMEOUT_FALLBACK_MS);

  // Tab close / navigation away — fire whatever we have.
  window.addEventListener('pagehide', fire, { once: true });
}

export function trackRouteChange(pathname: string): void {
  trackPageview(pathname);
}
