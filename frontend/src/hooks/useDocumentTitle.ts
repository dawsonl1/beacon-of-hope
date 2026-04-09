import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | Beacon of Hope` : 'Beacon of Hope';
    return () => { document.title = prev; };
  }, [title]);
}
