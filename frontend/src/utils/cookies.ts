// [SECURITY-13d] Additional — Browser-accessible cookie: These utility functions manage
// non-HttpOnly cookies (boh_cookie_consent, boh_theme) that store user preferences.
// React reads these cookies to change page behavior (cookie consent state, UI theme).
// [SECURITY-10] Privacy — Cookie consent: deleteAnalyticsCookies() removes GA cookies
// when the user revokes analytics consent, making the cookie consent fully functional.
export function setCookie(name: string, value: string, maxAgeDays: number): void {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function deleteCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function deleteAnalyticsCookies(): void {
  const analyticsCookies = ['_ga', '_gid', '_gat', '_ga_*'];
  const allCookies = document.cookie.split(';');
  for (const cookie of allCookies) {
    const cookieName = cookie.split('=')[0].trim();
    if (
      analyticsCookies.includes(cookieName) ||
      cookieName.startsWith('_ga_')
    ) {
      deleteCookie(cookieName);
    }
  }
}
