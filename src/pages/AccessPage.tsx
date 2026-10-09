import { useState, useEffect, useCallback } from 'react';
import { verifyAccessToken, type VerifyTokenResponse } from '../lib/access-links';
import { MediaViewer } from '../components/MediaViewer';
import { Navbar } from '../components/Navbar';
import {
  Loader2, AlertCircle, Check, Clock3, Mail, ArrowRight, Lock,
  Receipt, ArrowLeft,
} from 'lucide-react';

interface AccessPageProps {
  token: string;
  onNavigate: (path: string) => void;
}

export function AccessPage({ token, onNavigate }: AccessPageProps) {
  const [data, setData] = useState<VerifyTokenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [expiredContentId, setExpiredContentId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0 });

  const fetchAccess = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await verifyAccessToken(token);
      setData(result);
      setRemaining(result.remaining);
    } catch (err) {
      const e = err as Error & { expired?: boolean; contentId?: string | null };
      setError(e.message);
      setExpired(!!e.expired);
      setExpiredContentId(e.contentId || null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  // Live countdown
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      const now = new Date();
      const expires = new Date(data.expires_at);
      const diff = expires.getTime() - now.getTime();
      if (diff <= 0) {
        setRemaining({ days: 0, hours: 0, minutes: 0 });
        setExpired(true);
        setData(null);
        setError('Access Link Expired — The 7-day viewing period for this content has ended.');
        clearInterval(interval);
        return;
      }
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      setRemaining({ days, hours, minutes });
    }, 60000);
    return () => clearInterval(interval);
  }, [data]);

  const allMedia = data && data.media_items.length > 0
    ? data.media_items.map((m) => ({ url: m.media_url, type: m.media_type as 'image' | 'video' }))
    : data
      ? [{ url: data.content.media_url, type: data.content.media_type }]
      : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <Navbar onNavigate={onNavigate} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => onNavigate('')}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={28} className="animate-spin text-indigo-500 mx-auto" />
            <p className="text-sm text-slate-400 dark:text-zinc-500 mt-3">Verifying your access link...</p>
          </div>
        ) : error && expired ? (
          /* ---- EXPIRED VIEW ---- */
          <div className="max-w-md mx-auto py-12">
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mx-auto mb-5">
                <AlertCircle size={28} className="text-rose-500" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Link Expired</h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                The 7-day viewing period for this content has ended. To regain access, you can re-purchase the content below.
              </p>
              {expiredContentId && (
                <button
                  onClick={() => onNavigate(`u/${expiredContentId}`)}
                  className="mt-6 w-full rounded-xl bg-gradient-brand text-white font-semibold text-sm py-3 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  Re-purchase Access
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        ) : error ? (
          /* ---- ERROR VIEW ---- */
          <div className="max-w-md mx-auto py-12">
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mx-auto mb-5">
                <AlertCircle size={28} className="text-rose-500" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Error</h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400">{error}</p>
              <button
                onClick={() => onNavigate('')}
                className="mt-6 w-full rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-sm py-3 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        ) : data ? (
          /* ---- SUCCESS: UNLOCKED VIEWER ---- */
          <div className="space-y-4">
            {/* Confirmation header */}
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <Check size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Payment Successful! Instant Access Granted</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Your private access link is active.</p>
              </div>
            </div>

            {/* Access expiry badge */}
            <div className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3">
              <Clock3 size={18} className="text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Access Expires In</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {remaining.days} day{remaining.days !== 1 ? 's' : ''}, {remaining.hours} hour{remaining.hours !== 1 ? 's' : ''}, {remaining.minutes} min{remaining.minutes !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 dark:text-zinc-500">7-day access</p>
              </div>
            </div>

            {/* High-quality media viewer */}
            <MediaViewer
              media={allMedia}
              title={data.content.title}
              creatorName={data.content.creator?.display_name || data.content.creator?.username || 'Creator'}
              creatorAvatar={data.content.creator?.avatar_url}
              creatorUsername={data.content.creator?.username}
              description={data.content.description}
              mediaType={data.content.media_type}
              watermarkEmail={data.receipt.buyer_email}
              onCreatorClick={() => data.content.creator && onNavigate(`c/${data.content.creator.username}`)}
            />

            {/* Receipt summary card */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Receipt size={16} className="text-slate-400 dark:text-zinc-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Receipt Summary</h2>
              </div>

              <div className="space-y-3">
                {data.receipt.order_id && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-zinc-400">Transaction ID</span>
                    <span className="font-mono text-xs text-slate-900 dark:text-white truncate max-w-[200px]">{data.receipt.order_id}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-zinc-400">Email Address</span>
                  <span className="text-slate-900 dark:text-white truncate max-w-[200px]">{data.receipt.buyer_email}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-zinc-400">Amount Paid</span>
                  <span className="font-bold text-slate-900 dark:text-white">${data.receipt.amount_paid.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-zinc-400">Payment Processor</span>
                  <span className="text-slate-900 dark:text-white capitalize">{data.receipt.payment_provider}</span>
                </div>
              </div>

              {/* Email notice */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-start gap-2.5">
                <Mail size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  A backup access link valid for 7 days has been sent to <span className="font-semibold text-slate-700 dark:text-zinc-300">{data.receipt.buyer_email}</span>.
                </p>
              </div>
            </div>

            {/* Protection notice */}
            <div className="rounded-xl bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-2.5">
              <Lock size={14} className="text-slate-400 dark:text-zinc-500 shrink-0" />
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                This content is protected. Downloading, saving, and right-click are disabled.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
