import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

describe('useDocumentTitle', () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  it('sets document title with suffix', () => {
    renderHook(() => useDocumentTitle('Dashboard'));
    expect(document.title).toBe('Dashboard | Beacon of Hope');
  });

  it('sets base title when given empty string', () => {
    renderHook(() => useDocumentTitle(''));
    expect(document.title).toBe('Beacon of Hope');
  });

  it('updates title when value changes', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Page A' },
    });
    expect(document.title).toBe('Page A | Beacon of Hope');

    rerender({ title: 'Page B' });
    expect(document.title).toBe('Page B | Beacon of Hope');
  });
});
