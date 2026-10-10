import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Navbar } from '../components/Navbar';
import { AuthModal } from '../components/AuthModal';
import { GuestAgeGate } from '../components/AgeGate';
import type { Content, ContentMedia } from '../lib/types';
import {
  ArrowLeft, Lock, Check, Loader2, ImageIcon, Video,
  ChevronLeft, ChevronRight, BadgeCheck, Mail, ArrowRight, Eye, Heart,
  ShieldCheck, Zap, AlertTriangle, FileText, Flag,
} from 'lucide-react';

const SWIPE_THRESHOLD = 50;

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || local.length <= 2) return email;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

interface ContentViewProps {
  contentId: string;
  onNavigate: (path: string) => void;
}

export function ContentView({ contentId, onNavigate }: ContentViewProps) {
  const { user, isUnlocked, isSubscribed, handlePayment, handleTipPayment, openAuth } = useStore();
  const [content, setContent] = useState<Content | null>(null);
  const [mediaItems, setMediaItems] = useState<ContentMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [subAccess, setSubAccess] = useState(false);
  const [guestUnlocked, setGuestUnlocked] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [guestAgeVerified, setGuestAgeVerified] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [justPurchased, setJustPurchased] = useState(false);

  const isOwned = isUnlocked(contentId);
  const isFree = content?.price === 0;
  const hasAccess = isOwned || isFree || subAccess || guestUnlocked;

  const fetchMedia = useCallback(async (contentId: string) => {
    const { data } = await supabase
      .from('content_media')
      .select('*')
      .eq('content_id', contentId)
      .order('display_order', { ascending: true });
    return data || [];
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);

      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('id', contentId)
        .maybeSingle();

      if (!active) return;

      if (contentError || !contentData) {
        console.error("Error loading post:", contentError);
        setContent(null);
        setLoading(false);
        return;
      }

      let creatorData = null;
      if (contentData.creator_id) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', contentData.creator_id)
          .maybeSingle();
        creatorData = pData;
      }

      setContent({
        ...contentData,
        creator: creatorData || { display_name: 'Creator', username: 'creator' }
      });

      supabase.rpc('increment_content_views', { p_content_id: contentId }).then(({ error }) => {
        if (error) {
          supabase
            .from('content')
            .update({ views_count: (contentData.views_count || 0) + 1 })
            .eq('id', contentId)
            .then(() => {});
        }
      });

      if (user?.id && contentData.creator_id) {
        const subscribed = isSubscribed(contentData.creator_id);
        if (!subscribed) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('subscriber_id', user.id)
            .eq('creator_id', contentData.creator_id)
            .eq('status', 'active')
            .maybeSingle();
          if (active) setSubAccess(!!sub);
        } else {
          setSubAccess(true);
        }
      } else {
        if (active) setSubAccess(false);
      }

      if (contentData.media_count > 1) {
        const extraMedia = await fetchMedia(contentId);
        if (active) setMediaItems(extraMedia);
      }

      setLoading(false);
    })();

    return () => { active = false; };
  }, [contentId, fetchMedia, user, isSubscribed]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('payment=success')) {
      setGuestUnlocked(true);
      setJustPurchased(true);
    }
  }, []);

  const allMedia = mediaItems.length > 0
    ? mediaItems.map(m => ({ url: m.media_url, type: m.media_type }))
    : content ? [{ url: content.media_url, type: content.media_type }] : [];

  const goPrev = () => setActiveIndex((i) => (i === 0 ? allMedia.length - 1 : i - 1));
  const goNext = () => setActiveIndex((i) => (i === allMedia.length - 1 ? 0 : i + 1));

  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) { dx < 0 ? goNext() : goPrev(); }
  };

  const onPayToUnlock = async () => {
    if (!content) return;

    if (!user) {
      if (!guestEmail.trim()) {
        setEmailError('Please enter your email address to receive your access link.');
        return;
      }
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());
      if (!emailOk) {
        setEmailError('Please enter a valid email address.');
        return;
      }
      sessionStorage.setItem('guest_email', guestEmail.trim());
    }

    setEmailError(null);
    setPaying(true);
    setPayError(null);
    try {
      await handlePayment(content.id, content.creator_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed to initialize.';
      setPayError(message);
    } finally {
      setPaying(false);
    }
  };

  const priceDisplay = content ? `${Number(content.price).toFixed(2)}` : '$0.00';

  const blurClass = content?.blur_level === 'low' ? 'blur-md' : content?.blur_level === 'hard' ? 'blur-3xl' : 'blur-2xl';
  const thumbBlurClass = content?.blur_level === 'low' ? 'blur-sm' : content?.blur_level === 'hard' ? 'blur-2xl' : 'blur-xl';

  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      <Navbar onNavigate={onNavigate} />
      <AuthModal onNavigate={onNavigate} />

      {!user && !guestAgeVerified && !isFree && !hasAccess && content && (
        <GuestAgeGate onConfirm={() => setGuestAgeVerified(true)} />
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => onNavigate('')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-slate-900 dark:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={28} className="animate-spin text-indigo-500 mx-auto" />
            <p className="text-sm text-slate-400 dark:text-zinc-500 mt-3">Loading...</p>
          </div>
        ) : !content ? (
          <div className="py-20 text-center">
            <p className="text-slate-500 dark:text-zinc-400">Content not found.</p>
          </div>
        ) : hasAccess ? (
          /* ---- UNLOCKED VIEW ---- */
          <div className="space-y-4">
            {/* Post-purchase confirmation header */}
            {justPurchased && (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 flex items-center gap-3 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <Check size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Payment Successful! Instant Access Granted</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Your premium content is now unlocked.</p>
                </div>
              </div>
            )}

            <div
              className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-zinc-800 shadow-lg select-none"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
            >
              {allMedia[activeIndex]?.type === 'image' ? (
                <img
                  src={allMedia[activeIndex]?.url}
                  alt={content.title}
                  className="w-full max-h-[600px] object-contain pointer-events-none"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
              ) : (
                <video
                  src={allMedia[activeIndex]?.url}
                  controls
                  controlsList="nodownload noremoteplayback noplaybackrate"
                  className="w-full max-h-[600px]"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
              )}

              {allMedia.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 text-xs text-white pointer-events-none">
                    {activeIndex + 1} / {allMedia.length}
                  </div>
                </>
              )}

              {/* Protection badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 text-xs text-white pointer-events-none">
                <Lock size={10} />
                <span className="font-medium">Protected Content</span>
              </div>

              {/* Dynamic watermark overlay */}
              {user?.email && (
                <>
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-20deg] text-white/10 text-2xl font-bold whitespace-nowrap select-none">
                      {maskEmail(user.email)}
                    </div>
                    <div className="absolute top-[20%] left-[10%] rotate-[-20deg] text-white/[0.07] text-lg font-semibold whitespace-nowrap select-none">
                      {maskEmail(user.email)}
                    </div>
                    <div className="absolute bottom-[20%] right-[10%] rotate-[-20deg] text-white/[0.07] text-lg font-semibold whitespace-nowrap select-none">
                      {maskEmail(user.email)}
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/40 text-[10px] text-white/50 font-mono pointer-events-none">
                    {maskEmail(user.email)}
                  </div>
                </>
              )}
            </div>

            {/* Info card */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mb-2">
                {content.media_type === 'image' ? <ImageIcon size={12} /> : <Video size={12} />}
                <span className="capitalize">{content.media_type}</span>
                {content.media_count > 1 && (
                  <span className="flex items-center gap-1">
                    <ImageIcon size={10} /> {content.media_count} files
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Eye size={10} /> {content.views_count || 0} views
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{content.title}</h1>
              <button
                onClick={() => content.creator && onNavigate(`c/${content.creator.username}`)}
                className="text-sm text-indigo-600 hover:text-indigo-500 mt-1"
              >
                by {content.creator?.display_name || content.creator?.username || 'Unknown'}
              </button>
              {content.description && (
                <p className="text-sm text-slate-600 dark:text-zinc-300 mt-3 leading-relaxed">{content.description}</p>
              )}

              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Check size={18} />
                  <span className="text-sm font-medium">Unlocked</span>
                </div>
              </div>
            </div>

            {/* Tip card */}
            <TipCard
              creatorId={content.creator_id}
              contentId={content.id}
              creatorName={content.creator?.display_name || content.creator?.username || 'creator'}
              onTip={handleTipPayment}
              user={user}
              openAuth={openAuth}
            />

            {/* Protection notice */}
            <div className="rounded-xl bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-2.5">
              <Lock size={14} className="text-slate-400 dark:text-zinc-500 shrink-0" />
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                This content is protected. Downloading, saving, and right-click are disabled.
              </p>
            </div>
          </div>
        ) : (
          /* ---- LOCKED UNLOCK VIEW — redesigned ---- */
          <div className="space-y-5">
            {/* 1. 3D Stacked Card Carousel with Blurred Previews */}
            <div className="relative pb-3" style={{ perspective: '1200px' }}>
              {/* 3D stacked card backdrop layers */}
              {allMedia.length > 1 && (
                <>
                  <div
                    className="absolute rounded-3xl bg-[#15151B] border border-zinc-800/60"
                    style={{
                      top: 12,
                      left: 20,
                      right: 20,
                      bottom: -12,
                      transform: 'translateZ(-40px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}
                  />
                  <div
                    className="absolute rounded-3xl bg-[#1A1A22] border border-zinc-800/50"
                    style={{
                      top: 7,
                      left: 12,
                      right: 12,
                      bottom: -7,
                      transform: 'translateZ(-20px)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    }}
                  />
                  <div
                    className="absolute rounded-3xl bg-[#1E1E28] border border-zinc-800/40"
                    style={{
                      top: 3,
                      left: 5,
                      right: 5,
                      bottom: -3,
                      transform: 'translateZ(-8px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  />
                </>
              )}

              {/* Main preview card */}
              <div
                className="relative rounded-3xl overflow-hidden bg-[#131318] border border-zinc-800/50 shadow-2xl shadow-black/50 transition-transform duration-300"
                style={{ transform: 'translateZ(0)', transformStyle: 'preserve-3d' }}
              >
                {/* Blurred media preview per carousel item */}
                <div
                  className="relative aspect-[4/5] sm:aspect-[4/3] flex items-center justify-center select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  onTouchStart={onTouchStart}
                  onTouchEnd={onTouchEnd}
                  style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  {allMedia.map((m, i) => (
                    <div
                      key={i}
                      className={`absolute inset-0 transition-all duration-700 ease-out ${
                        i === activeIndex
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 scale-105'
                      }`}
                    >
                      {m.type === 'image' ? (
                        <img
                          src={m.url}
                          alt=""
                          className={`w-full h-full object-cover ${blurClass} scale-110 brightness-[0.35]`}
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <Video size={48} className="text-zinc-600" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />

                  {/* Lock icon + price overlay — centered */}
                  <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/8 backdrop-blur-xl flex items-center justify-center border border-white/15 shadow-2xl">
                      <Lock size={26} className="text-white" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">
                      Unlock for
                    </p>
                    <p className="text-4xl font-extrabold text-white tracking-tight">
                      ${priceDisplay} <span className="text-base font-semibold text-white/40">USD</span>
                    </p>
                  </div>

                  {/* Carousel nav arrows */}
                  {allMedia.length > 1 && (
                    <>
                      <button
                        onClick={goPrev}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition-all hover:scale-110 active:scale-95 z-10"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={goNext}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition-all hover:scale-110 active:scale-95 z-10"
                        aria-label="Next image"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}

                  {/* Image counter badge — top right */}
                  {allMedia.length > 1 && (
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-xs text-white/90 font-medium z-10 border border-white/10">
                      {content.media_type === 'image' ? <ImageIcon size={11} /> : <Video size={11} />}
                      {activeIndex + 1} / {allMedia.length}
                    </div>
                  )}

                  {/* Small image indicator icons — bottom center of card */}
                  {allMedia.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                      {allMedia.map((m, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveIndex(i)}
                          className={`rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                            i === activeIndex
                              ? 'border-white scale-125 opacity-100 w-9 h-9'
                              : 'border-white/20 opacity-40 hover:opacity-70 w-7 h-7'
                          }`}
                          aria-label={`Go to image ${i + 1}`}
                        >
                          {m.type === 'image' ? (
                            <img src={m.url} alt="" className={`w-full h-full object-cover ${thumbBlurClass}`} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                              <Video size={11} className="text-white/40" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Creator & Post Information Section */}
            <div className="rounded-2xl bg-[#131318] border border-zinc-800/60 p-5 shadow-xl shadow-black/20">
              {/* Creator row */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => content.creator && onNavigate(`c/${content.creator.username}`)}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden ring-2 ring-zinc-800 shrink-0"
                >
                  {content.creator?.avatar_url ? (
                    <img src={content.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-white uppercase">
                      {(content.creator?.display_name || content.creator?.username || 'C')[0]}
                    </span>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white truncate">
                      {content.creator?.display_name || content.creator?.username || 'Unknown'}
                    </p>
                    <BadgeCheck size={16} className="text-indigo-400 shrink-0" fill="currentColor" />
                  </div>
                  <p className="text-xs text-zinc-500">@{content.creator?.username || 'creator'}</p>
                </div>

                <button
                  onClick={() => content.creator && onNavigate(`c/${content.creator.username}`)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800/80 text-zinc-200 text-xs font-semibold hover:bg-zinc-700/80 transition-colors shrink-0"
                >
                  View Profile
                  <ArrowRight size={12} />
                </button>
              </div>

              {/* Divider */}
              <div className="my-4 border-t border-zinc-800/60" />

              {/* Tags */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-[11px] font-semibold text-rose-400">
                  <AlertTriangle size={10} />
                  18+ only
                </span>
                {content.media_count > 1 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-[11px] font-semibold text-indigo-400">
                    <ImageIcon size={10} />
                    {content.media_count} {content.media_type === 'image' ? 'images' : 'files'}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800/60 border border-zinc-700/50 text-[11px] font-medium text-zinc-400">
                  <Eye size={10} />
                  {content.views_count || 0} views
                </span>
              </div>

              {/* Title */}
              <h1 className="text-xl font-bold text-white leading-snug">{content.title}</h1>

              {/* Description */}
              {content.description && (
                <p className="text-sm text-zinc-400 mt-2.5 leading-relaxed">{content.description}</p>
              )}
            </div>

            {/* 3. Purchase & Trust Indicators */}
            <div className="rounded-2xl bg-[#131318] border border-zinc-800/60 p-5 shadow-xl shadow-black/20">
              {/* Email input (guests only) */}
              {!user && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => {
                        setGuestEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      placeholder="you@example.com"
                      className="w-full rounded-xl bg-[#0B0B0F] border border-zinc-800 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1.5">
                    Your access link will be sent to this email after payment.
                  </p>
                  {emailError && (
                    <p className="text-xs text-rose-400 mt-1.5">{emailError}</p>
                  )}
                </div>
              )}

              {/* Blue/Purple gradient CTA button */}
              <button
                onClick={onPayToUnlock}
                disabled={paying}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-base py-3.5 hover:from-indigo-400 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-[0.98] active:shadow-indigo-600/15"
              >
                {paying ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Opening checkout...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Unlock for ${priceDisplay}
                  </>
                )}
              </button>

              {/* Trust indicators */}
              <div className="flex items-center justify-center gap-5 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <ShieldCheck size={14} className="text-indigo-400" />
                  Secure payment
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Zap size={14} className="text-amber-400" />
                  Instant access
                </div>
              </div>

              {/* Tax subtext */}
              <p className="text-center text-[11px] text-zinc-600 mt-2.5">
                Tax calculated next step
              </p>

              {payError && (
                <p className="text-sm text-rose-400 text-center mt-3 max-w-xs mx-auto">{payError}</p>
              )}
            </div>

            {/* 4. Footer Legal & Support Links */}
            <div className="flex items-center justify-center gap-4 pt-2 pb-8">
              <button
                onClick={() => onNavigate('terms')}
                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <FileText size={12} />
                Customer Terms
              </button>
              <span className="text-zinc-700">·</span>
              <button
                onClick={() => onNavigate('support')}
                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <Flag size={12} />
                Need help? Report abuse
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TipCard({ creatorId, contentId, creatorName, onTip, user, openAuth }: {
  creatorId: string;
  contentId: string;
  creatorName: string;
  onTip: (creatorId: string, contentId: string, amount: number) => Promise<void>;
  user: { id: string } | null;
  openAuth: (mode: 'signin' | 'signup') => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [tipping, setTipping] = useState(false);

  const presets = [5, 10, 20];

  const handleTip = async (amount: number) => {
    if (!user) {
      openAuth('signin');
      return;
    }
    setTipping(true);
    try {
      await onTip(creatorId, contentId, amount);
    } finally {
      setTipping(false);
    }
  };

  const handleCustomTip = () => {
    const amt = parseFloat(customAmount);
    if (isNaN(amt) || amt < 1) return;
    handleTip(amt);
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Heart size={18} className="text-rose-500" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Send a Tip to {creatorName}</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">Show your appreciation. 70% goes directly to the creator.</p>

      <div className="flex flex-wrap gap-2">
        {presets.map((amt) => (
          <button
            key={amt}
            onClick={() => handleTip(amt)}
            disabled={tipping}
            className="px-5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all disabled:opacity-50"
          >
            ${amt}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="px-5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-zinc-500">$</span>
            <input
              type="number"
              min="1"
              step="1"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 pl-7 pr-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={handleCustomTip}
            disabled={tipping || !customAmount || parseFloat(customAmount) < 1}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {tipping ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} />}
            Send Tip
          </button>
        </div>
      )}

      {tipping && (
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-3 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" />
          Opening checkout...
        </p>
      )}
    </div>
  );
}
