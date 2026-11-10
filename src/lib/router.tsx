import { useState, useEffect } from 'react';

export function parseRoute(path: string): { segments: string[]; queryParams: URLSearchParams } {
  const cleanPath = path.replace(/^\/+/, '').split('?')[0];
  const queryString = path.includes('?') ? path.slice(path.indexOf('?') + 1) : '';
  const segments = cleanPath ? cleanPath.split('/').filter(Boolean) : [];
  return {
    segments,
    queryParams: new URLSearchParams(queryString),
  };
}

export function useHashRoute() {
  const getPath = () => {
    if (typeof window === 'undefined') return '';
    // Backward compatibility: Agar koi purana #/ link khole toh clean path par auto-shift karein
    if (window.location.hash.startsWith('#/')) {
      const hashPath = window.location.hash.slice(2);
      window.history.replaceState(null, '', `/${hashPath}`);
      return hashPath;
    }
    return window.location.pathname.replace(/^\/+/, '') + window.location.search;
  };

  const [route, setRoute] = useState(getPath);

  useEffect(() => {
    const onLocationChange = () => {
      setRoute(getPath());
    };

    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  const navigate = (newPath: string) => {
    const formatted = newPath.startsWith('/') ? newPath : `/${newPath}`;
    window.history.pushState(null, '', formatted);
    setRoute(getPath());
    window.scrollTo(0, 0);
  };

  return { route, navigate };
}
