import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Navbar } from '../components/Navbar';
import { AuthModal } from '../components/AuthModal';
import type { Profile, Content } from '../lib/types';
import {
  ArrowLeft,
  Crown,
  Loader2,
  Lock,
  Check,
  ShieldCheck,
  Sparkles,
  Zap,
  Image as ImageIcon,
  Video,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface SubscribeProps {
  username: string;
  onNavigate: (path: string) => void;
}

export function Subscribe({ username, onNavigate }: SubscribeProps) {
  const {
    user,
    profile,
    isSubscribed,
    checkSubscription,
    handleSubscriptionPayment,
  } = useStore();

  const [creator, setCreator] = useState<Profile | null>(null);
  const [sampleContent, setSampleContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      if (!active) return;
      if (error || !prof) {
        setLoading(false);
        return;
      }
      setCreator(prof);
      if (user) {
        const cached = isSubscribed(prof.id);
        if (cached) {
          setSubscribed(true);
        } else {
          const fresh = await checkSubscription(prof.id);
          if (active) setSubscribed(fresh);
        }
      }
      const { data: items } = await supabase
        .from('content')
        .select('*')
        .eq('creator_id', prof.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(4);
      if (active) setSampleContent(items || []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [username, user, isSubscribed, checkSubscription]);

  // Prefill from session when it arrives
  useEffect(() => {
    if (user?.email) setEmail((prev) => prev || user.email!);
    if (profile?.display_name) setFullName((prev) => prev || profile.display_name!);
  }, [user, profile]);

  const isOwnProfile = user?.id === creator?.id;
  const price = 15;
  const hasPrice = true;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const nameValid = fullName.trim().length >= 2;
  const formValid = emailValid && nameValid;

  const onConfirm = async () => {
    setTouched(true);
    if (!formValid) return;
    if (!creator || !hasPrice) return;

    setPaying(true);
    await handleSubscriptionPayment(creator.id);
    setPaying(false);
    setSubscribed(true);
  };

  const displayName = creator?.display_name || creator?.username || 'Creator';
  const tagline =
    creator?.bio?.trim() ||
    `Subscribe to ${displayName} for instant access to exclusive, premium content.`;
  const coverImage = sampleContent[0]?.thumbnail_url || sampleContent[0]?.media_url;
  const coverMediaType = sampleContent[0]?.media_type;
  const mediaCount = sampleContent.length;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar onNavigate={onNavigate} />
      <AuthModal />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => onNavigate(`c/${username}`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to {displayName}
        </button>

        {loading ? (
          <div className="py-20 text-center text-slate-400 dark:text-zinc-500 flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-zinc-600" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : !creator ? (
          <div className="py-20 text-center">
            <p className="text-slate-500 dark:text-zinc-400">Creator not found.</p>
          </div>
        ) : isOwnProfile ? (
          <div className="py-20 text-center">
            <p className="text-slate-500 dark:text-zinc-400">This is your own subscribe page.</p>
          </div>
        ) : !hasPrice ? (
          <div className="py-20 text-center">
            <p className="text-slate-500 dark:text-zinc-400">
              {displayName} hasn't enabled subscriptions yet.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-start">
            {/* ============ LEFT: Content & Creator ============ */}
            <div className="animate-slide-up">
              {/* Blurred premium cover card */}
              <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-zinc-800 aspect-[4/5] sm:aspect-[16/10] lg:aspect-[4/5] bg-white dark:bg-zinc-900">
                {coverImage ? (
                  <div className="absolute inset-0">
                    <img
                      src={coverImage}
                      alt=""
                      className="w-full h-full object-cover blur-2xl scale-110 brightness-50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-ink-900 to-ink-950" />
                )}

                {/* Foreground content */}
                <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8">
                  <div className="flex items-center gap-2 self-start">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-white">
                      <Lock size={12} />
                      Premium Content
                    </span>
                    {mediaCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-white">
                        {coverMediaType === 'video' ? <Video size={12} /> : <ImageIcon size={12} />}
                        {mediaCount}+ exclusive {mediaCount === 1 ? 'post' : 'posts'}
                      </span>
                    )}
                  </div>

                  {/* Centered preview thumbnails stack */}
                  {sampleContent.length > 0 ? (
                    <div className="flex-1 flex items-center justify-center py-8">
                      <div className="grid grid-cols-2 gap-3 max-w-xs">
                        {sampleContent.slice(0, 4).map((item, i) => {
                          const thumb = item.thumbnail_url || item.media_url;
                          return (
                            <div
                              key={item.id}
                              className={`relative rounded-xl overflow-hidden border border-white/10 ${
                                i === 0 ? 'col-span-2 aspect-video' : 'aspect-square'
                              }`}
                            >
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt=""
                                  className="w-full h-full object-cover blur-[3px] scale-105 brightness-75"
                                />
                              ) : (
                                <div className="w-full h-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                                  {item.media_type === 'video' ? (
                                    <Video size={18} className="text-slate-400 dark:text-zinc-500" />
                                  ) : (
                                    <ImageIcon size={18} className="text-slate-400 dark:text-zinc-500" />
                                  )}
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Lock size={i === 0 ? 20 : 14} className="text-slate-900 dark:text-white/70" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-8">
                      <div className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">
                        <Sparkles size={32} className="text-slate-900 dark:text-white/60" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Creator identity */}
              <div className="flex items-center gap-4 mt-6">
                <div className="w-14 h-14 rounded-full bg-gradient-brand flex items-center justify-center shrink-0 ring-2 ring-zinc-800 overflow-hidden">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-slate-900 dark:text-white uppercase">
                      {displayName[0]}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">{displayName}</h1>
                  <p className="text-sm text-slate-500 dark:text-zinc-400">@{creator.username}</p>
                </div>
              </div>

              {/* Tagline / description */}
              <p className="text-slate-700 dark:text-zinc-300 text-base leading-relaxed mt-5 max-w-lg">
                {tagline}
              </p>

              {/* What's included */}
              <div className="mt-7 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/[0.02] p-5">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-wide uppercase mb-4">
                  What's included
                </h2>
                <ul className="space-y-3.5">
                  {[
                    { icon: Zap, text: 'Instant unlock — access activates immediately after payment' },
                    { icon: ImageIcon, text: 'Premium photos & videos, updated regularly' },
                    { icon: Crown, text: 'Full feed access for as long as you remain subscribed' },
                    { icon: ShieldCheck, text: 'Cancel anytime — no hidden fees, no lock-in' },
                  ].map(({ icon: Icon, text }, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <Icon size={13} className="text-indigo-600 dark:text-indigo-300" />
                      </span>
                      <span className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ============ RIGHT: Checkout Card ============ */}
            <div className="animate-slide-up lg:sticky lg:top-6">
              <div className="rounded-3xl bg-white shadow-2xl shadow-black/40 p-6 sm:p-8 border border-zinc-200">
                {/* Header row */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-xs font-semibold tracking-wider uppercase text-indigo-600 mb-1">
                      Monthly Subscription
                    </p>
                    <h2 className="text-xl font-bold text-zinc-900">Subscribe to {displayName}</h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                    <ShieldCheck size={12} />
                    Secure
                  </span>
                </div>

                {/* Already subscribed state */}
                {subscribed ? (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <Check size={24} className="text-emerald-600" />
                    </div>
                    <p className="text-base font-semibold text-emerald-900">
                      You're subscribed
                    </p>
                    <p className="text-sm text-emerald-700 mt-1">
                      You have full access to {displayName}'s content.
                    </p>
                    <button
                      onClick={() => onNavigate(`c/${username}`)}
                      className="mt-5 w-full px-5 py-3 rounded-xl bg-emerald-600 text-slate-900 dark:text-white font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                    >
                      View Content
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Price tag */}
                    <div className="rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100 border border-zinc-200 p-5 mb-6">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-extrabold text-zinc-900 tracking-tight">
                          ${price.toFixed(2)}
                        </span>
                        <span className="text-base font-medium text-slate-400 dark:text-zinc-500">/ month</span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">
                        Billed monthly. Cancel anytime — no commitment.
                      </p>
                    </div>

                    {/* Form fields */}
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="sub-email" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                          Email
                        </label>
                        <input
                          id="sub-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => setTouched(true)}
                          placeholder="you@example.com"
                          className={`w-full px-4 py-3 rounded-xl border bg-white text-zinc-900 placeholder:text-slate-500 dark:text-zinc-400 text-sm outline-none transition-all ${
                            touched && !emailValid
                              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                              : 'border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                          }`}
                        />
                        {touched && !emailValid && (
                          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle size={12} />
                            Enter a valid email address.
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="sub-name" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                          Full Name
                        </label>
                        <input
                          id="sub-name"
                          type="text"
                          autoComplete="name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          onBlur={() => setTouched(true)}
                          placeholder="Jane Doe"
                          className={`w-full px-4 py-3 rounded-xl border bg-white text-zinc-900 placeholder:text-slate-500 dark:text-zinc-400 text-sm outline-none transition-all ${
                            touched && !nameValid
                              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                              : 'border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                          }`}
                        />
                        {touched && !nameValid && (
                          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle size={12} />
                            Please enter your full name.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={onConfirm}
                      disabled={paying}
                      className="mt-6 w-full px-6 py-4 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:bg-zinc-800 active:scale-[0.99] text-slate-900 dark:text-white font-bold text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-zinc-900/20"
                    >
                      {paying ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Opening checkout...
                        </>
                      ) : (
                        <>
                          <Crown size={18} />
                          Subscribe Now
                        </>
                      )}
                    </button>

                    {/* Auth hint */}
                    {!user && (
                      <p className="mt-3 text-center text-xs text-slate-400 dark:text-zinc-500">
                        You'll create an account to complete payment.
                      </p>
                    )}

                    {/* Trust markers */}
                    <div className="mt-6 pt-5 border-t border-zinc-100">
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-zinc-500">
                        <Lock size={13} className="text-slate-500 dark:text-zinc-400" />
                        <span>Secure 256-bit SSL Payment</span>
                      </div>
                      <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                        {['VISA', 'MASTERCARD', 'APPLE PAY', 'GOOGLE PAY'].map((n) => (
                          <span
                            key={n}
                            className="px-2 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-zinc-400">
                        Payments processed securely via Whop
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Footnote under card */}
              <p className="text-center text-xs text-slate-400 dark:text-zinc-500 mt-4 px-4">
                By subscribing, you agree to the platform terms. Subscriptions renew monthly until cancelled.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
