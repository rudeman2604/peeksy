import { useEffect } from 'react';

const DEFAULT_TITLE = 'Peeksy';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
