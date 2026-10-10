import { useState, useEffect, useCallback } from 'react';

export function useHashRoute() {
  const [route, setRoute] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    return hash || '';
  });

  useEffect(() => {
    const onHashChange = () => {
      setRoute(window.location.hash.slice(1) || '');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
    window.scrollTo(0, 0);
  }, []);

  return { route, navigate };
}

export function parseRoute(route: string): { segments: string[] } {
  const clean = route.split('?')[0];
  const segments = clean.split('/').filter(Boolean);
  return { segments };
}
