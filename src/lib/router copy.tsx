import { useState, useEffect } from 'react';

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value; // malformed escape such as %E0%A4%A: keep it as typed
  }
}

export function parseRoute(path: string): { segments: string[]; queryParams: URLSearchParams } {
  const cleanPath = path.replace(/^\/+/, '').split('?')[0];
  const queryString = path.includes('?') ? path.slice(path.indexOf('?') + 1) : '';
  // Segments are decoded, so /c/Harish%4007 gives the username "Harish@07"
  const segments = cleanPath ? cleanPath.split('/').filter(Boolean).map(safeDecode) : [];
  return {
    segments,
    queryParams: new URLSearchParams(queryString),
  };
}

const OLD_HASH_ROUTE = /^#(c|u|l|access|payment|library|dashboard|admin|wallet|kyc|refer|settings|support|legal)(\/|\?|$)/;

export function useHashRoute() {
  const getPath = () => {
    if (typeof window === 'undefined') return '';
    // Backward compatibility: old links such as /#/u/<id>?paid=1 and /#c/<username> move to clean paths.
    // Only known route names are migrated, so auth callbacks like #access_token=... are left alone.
    const hash = window.location.hash;
    if (hash.startsWith('#/') || OLD_HASH_ROUTE.test(hash)) {
      const hashPath = hash.replace(/^#\/?/, '');
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
