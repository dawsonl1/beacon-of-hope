import '@testing-library/jest-dom/vitest';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './__tests__/mocks/server';
import { cleanup } from '@testing-library/react';

// Mock IntersectionObserver for jsdom (used by useReveal, Counter, etc.)
const MockIntersectionObserver = class {
  root: Element | null = null;
  rootMargin: string = '';
  thresholds: ReadonlyArray<number> = [];
  scrollMargin: string = '';
  private callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
};
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
