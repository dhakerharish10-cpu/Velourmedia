import { useEffect, useState, useRef } from 'react';
import { Check, Clock3, Loader2, ArrowRight, AlertCircle, Mail } from 'lucide-react';
import { useStore } from '../lib/store';
import { getWhopStatus, confirmPaymentFallback } from '../lib/whop';
import { createAccessToken } from '../lib/access-links';

interface PaymentResultProps {
  onNavigate: (path: string) => void;
}

export function PaymentResult({ onNavigate }: PaymentResultProps) {
  const { user, refreshPurchases } = useStore();
  const [status, setStatus] = useState<'checking' | 'confirmed' | 'pending' | 'failed' | 'error' | 'redirecting'>('checking');
  const [contentId, setContentId] = useState<string | null>(null);
  const [accessLink, setAccessLink] = useState<string | null>(null);
  const [tokenCreated, setTokenCreated] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    const hash = window.location.hash;
    const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
    const orderId = new URLSearchParams(query).get('order_id');
    if (!orderId) {
      setStatus('error');
      return;
    }

    let active = true;
    let attempts = 0;
    let fallbackTried = false;
    const check = async () => {
      try {
        const result = await getWhopStatus(orderId);
        if (!active) return;
        if (result.content_id) setContentId(result.content_id);
        if (result.status === 'confirmed' || result.status === 'finished') {
          if (result.content_id) setContentId(result.content_id);
          if (user) {
            await refreshPurchases();
            if (active && result.content_id && !redirectedRef.current) {
              redirectedRef.current = true;
              setStatus('redirecting');
              window.setTimeout(() => {
                if (active) onNavigate(`/u/${result.content_id}`);
              }, 1500);
            } else if (active) {
              setStatus('confirmed');
            }
          } else if (result.content_id && !tokenCreated) {
            // Guest checkout: create a 7-day access token and link
            const guestEmail = sessionStorage.getItem('guest_email');
            if (guestEmail) {
              try {
                const tokenResult = await createAccessToken({
                  contentId: result.content_id,
                  buyerEmail: guestEmail,
                  orderId,
                });
                if (active) setAccessLink(tokenResult.access_link);
              } catch (err) {
                console.error('Failed to create access token:', err);
              }
            }
            setTokenCreated(true);
          }
          return;
        }
        if (result.status === 'failed' || result.status === 'expired') {
          setStatus('failed');
          return;
        }
        setStatus('pending');
        if (attempts >= 3 && !fallbackTried) {
          fallbackTried = true;
          try {
            const fallback = await confirmPaymentFallback(orderId);
            if (!active) return;
            if (fallback.status === 'confirmed' && fallback.content_id) {
              setContentId(fallback.content_id);
              if (user) {
                await refreshPurchases();
                if (active && !redirectedRef.current) {
                  redirectedRef.current = true;
                  setStatus('redirecting');
                  window.setTimeout(() => {
                    if (active) onNavigate(`/u/${fallback.content_id}`);
                  }, 1500);
                }
              } else if (!tokenCreated) {
                const guestEmail = sessionStorage.getItem('guest_email');
                if (guestEmail) {
                  try {
                    const tokenResult = await createAccessToken({
                      contentId: fallback.content_id,
                      buyerEmail: guestEmail,
                      orderId,
                    });
                    if (active) setAccessLink(tokenResult.access_link);
                  } catch (err) {
                    console.error('Failed to create access token:', err);
                  }
                }
                setTokenCreated(true);
              }
              return;
            }
          } catch (err) {
            console.error('Fallback confirmation failed:', err);
          }
        }
        if (attempts < 10) {
          attempts += 1;
          window.setTimeout(check, 4000);
        }
      } catch {
        if (active) setStatus('error');
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, [user, refreshPurchases, tokenCreated, onNavigate]);

  const content = {
    checking: {
      icon: <Loader2 size={28} className="animate-spin text-slate-400 dark:text-zinc-500" />,
      title: 'Checking your payment',
      body: 'We are confirming your payment securely. This will only take a moment.',
    },
    pending: {
      icon: <Clock3 size={28} className="text-amber-500" />,
      title: 'Payment is processing',
      body: 'Your payment is still being confirmed. Your access will unlock automatically once it is complete.',
    },
    confirmed: {
      icon: <Check size={30} className="text-emerald-600" />,
      title: 'Payment confirmed',
      body: user
        ? 'Your premium access is now active. You can start enjoying the content immediately.'
        : 'Your payment is confirmed. A 7-day access link has been sent to your email.',
    },
    redirecting: {
      icon: <Loader2 size={28} className="animate-spin text-emerald-600" />,
      title: 'Unlocking your content',
      body: 'Payment confirmed! Taking you to your unlocked post now...',
    },
    failed: {
      icon: <AlertCircle size={28} className="text-red-500" />,
      title: 'Payment was not completed',
      body: 'No access was added. You can return to the creator page and try again.',
    },
    error: {
      icon: <AlertCircle size={28} className="text-red-500" />,
      title: 'We could not find this checkout',
      body: 'Please return to the creator page and start a new checkout.',
    },
  }[status];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-5">
          {content.icon}
        </div>
        <h1 className="text-xl font-bold text-zinc-900">{content.title}</h1>
        <p className="text-sm leading-relaxed text-slate-400 dark:text-zinc-500 mt-3">{content.body}</p>
        {status === 'confirmed' && (
          <>
            <button
              onClick={() => onNavigate(contentId ? `/u/${contentId}` : '')}
              className="mt-7 w-full rounded-xl bg-white dark:bg-zinc-900 px-5 py-3.5 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
            >
              {contentId ? 'View content' : 'Continue browsing'}
              <ArrowRight size={16} />
            </button>
            {!user && accessLink && (
              <a
                href={accessLink}
                className="mt-3 w-full rounded-xl bg-slate-100 dark:bg-zinc-800 px-5 py-3.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                Open Access Link
              </a>
            )}
          </>
        )}
        {status === 'redirecting' && contentId && (
          <button
            onClick={() => onNavigate(`/u/${contentId}`)}
            className="mt-7 w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
          >
            Go to content now
            <ArrowRight size={16} />
          </button>
        )}
        {(status === 'failed' || status === 'error') && (
          <button
            onClick={() => onNavigate('')}
            className="mt-7 w-full rounded-xl bg-white dark:bg-zinc-900 px-5 py-3.5 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-zinc-800 transition-colors"
          >
            Return to Velour
          </button>
        )}
        <div className="mt-6 pt-5 border-t border-zinc-100 text-[11px] text-slate-500 dark:text-zinc-400">
          Payment confirmation is verified on the server
          
        </div>
      </div>
    </div>
  );
}
