import { describe, it, expect, beforeEach } from 'vitest';
import { setCookie, getCookie, deleteCookie, deleteAnalyticsCookies } from '../../utils/cookies';

describe('Cookie utilities', () => {
  beforeEach(() => {
    // Clear all cookies
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
    });
  });

  describe('setCookie / getCookie', () => {
    it('sets and retrieves a cookie', () => {
      setCookie('test_cookie', 'hello', 1);
      expect(getCookie('test_cookie')).toBe('hello');
    });

    it('encodes special characters', () => {
      setCookie('encoded', 'value=with&special', 1);
      expect(getCookie('encoded')).toBe('value=with&special');
    });

    it('returns null for non-existent cookie', () => {
      expect(getCookie('nonexistent')).toBeNull();
    });
  });

  describe('deleteCookie', () => {
    it('removes a cookie', () => {
      setCookie('to_delete', 'val', 1);
      expect(getCookie('to_delete')).toBe('val');
      deleteCookie('to_delete');
      expect(getCookie('to_delete')).toBeNull();
    });
  });

  describe('deleteAnalyticsCookies', () => {
    it('removes GA cookies', () => {
      setCookie('_ga', 'GA1.1.123', 1);
      setCookie('_gid', 'GID123', 1);
      deleteAnalyticsCookies();
      expect(getCookie('_ga')).toBeNull();
      expect(getCookie('_gid')).toBeNull();
    });

    it('removes _ga_ prefixed cookies', () => {
      setCookie('_ga_ABC123', 'val', 1);
      deleteAnalyticsCookies();
      expect(getCookie('_ga_ABC123')).toBeNull();
    });

    it('does not remove non-analytics cookies', () => {
      setCookie('my_cookie', 'keep', 1);
      deleteAnalyticsCookies();
      expect(getCookie('my_cookie')).toBe('keep');
    });
  });
});
