import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SHORT_CODE_RE } from '../lib/postLinks';
import { ContentView } from './ContentView';
import { Loader2 } from 'lucide-react';

interface ShortLinkPageProps {
  code: string;
  onNavigate: (path: string) => void;
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; contentId: string }
  | { status: 'not_found' }
  | { status: 'error' };

/**
 * Route: /l/:code
 * Turns a short code into a post and shows the normal post page. The address bar keeps the short link
 * (including ?paid=1 after checkout), and the post page does the rest.
 * Wire it up in your router:  /l/:code  ->  <ShortLinkPage code={params.code} onNavigate={navigate} />
 */
export function ShortLinkPage({ code, onNavigate }: ShortLinkPageProps) {
  const [state, setState] = useState<State>({ status: 'loading' });

  const resolve = useCallback(async () => {
    const clean = decodeURIComponent(code ?? '').trim();
    // Malformed codes never reach the database
    if (!SHORT_CODE_RE.test(clean)) {
      setState({ status: 'not_found' });
      return;
    }
    setState({ status: 'loading' });
    try {
      // Row level security decides what is visible: visitors only find published posts
      const { data, error } = await supabase
        .from('content')
        .select('id')
        .eq('short_code', clean.toLowerCase())
        .maybeSingle();
      if (error) {
        console.error('Short link lookup failed:', error.message);
        setState({ status: 'error' });
        return;
      }
      setState(data?.id ? { status: 'ready', contentId: data.id } : { status: 'not_found' });
    } catch (e) {
      // network drop
      console.error('Short link request failed:', e);
      setState({ status: 'error' });
    }
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await resolve(); })();
    return () => { cancelled = true; };
  }, [resolve]);

  if (state.status === 'ready') {
    return <ContentView contentId={state.contentId} onNavigate={onNavigate} />;
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-sm">
        {state.status === 'loading' && (
          <>
            <Loader2 size={28} className="animate-spin text-indigo-500 mx-auto" />
            <p className="text-sm text-zinc-500">Loading...</p>
          </>
        )}

        {state.status === 'not_found' && (
          <>
            <p className="text-lg font-semibold text-white">This link isn't available</p>
            <p className="text-sm text-zinc-400">It may have been mistyped, or the post was removed.</p>
            <button
              onClick={() => onNavigate('')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors"
            >
              Back to Home
            </button>
          </>
        )}

        {state.status === 'error' && (
          <>
            <p className="text-lg font-semibold text-white">We couldn't load this link</p>
            <p className="text-sm text-zinc-400">Check your connection and try again.</p>
            <button
              onClick={resolve}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
