import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Navbar } from '../components/Navbar';
import { AuthModal } from '../components/AuthModal';
import type { Content, ContentMedia } from '../lib/types';
import {
  ArrowLeft, Lock, Check, Loader2, ImageIcon, Video,
  ChevronLeft, ChevronRight, BadgeCheck, Mail, ArrowRight, Heart,
  ShieldCheck, Shield, Zap, FileText, Flag, Info,
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
  const { user, isUnlocked, handleTipPayment, openAuth, refreshPurchases } = useStore();
  const [content, setContent] = useState<Content | null>(null);
  const [mediaItems, setMediaItems] = useState<ContentMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [guestUnlocked, setGuestUnlocked] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [justPurchased, setJustPurchased] = useState(false);

  const isOwned = isUnlocked(contentId);
  const isFree = content?.price === 0;
  const hasAccess = isOwned || isFree || guestUnlocked;

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

      if (contentData.media_count > 1) {
        const extraMedia = await fetchMedia(contentId);
        if (active) setMediaItems(extraMedia);
      }

      setLoading(false);
    })();

    return () => { active = false; };
  }, [contentId, fetchMedia, user]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('payment=success')) {
      setGuestUnlocked(true);
      setJustPurchased(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshPurchases().then(() => {
        if (window.location.hash.includes('payment=success') || sessionStorage.getItem('guest_email')) {
          setJustPurchased(true);
        }
      });
    }
  }, [user, refreshPurchases]);

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

  const onPayToUnlock = () => {
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
    if (content.whop_url) {
      window.location.href = content.whop_url;
    } else if (content.whop_product_id) {
      window.location.href = `https://whop.com/checkout/${content.whop_product_id}`;
    } else {
      window.location.href = `https://whop.com/checkout?content_id=${content.id}&creator_id=${content.creator_id}`;
    }
  };

  const priceDisplay = content ? `${Number(content.price).toFixed(2)}` : '$0.00';

  const blurPx = ((content?.blur_percent ?? 60) / 100) * 24;
  const blurStyle = { filter: `blur(${blurPx}px)` };
  const thumbBlurPx = (blurPx * 0.4);
  const thumbBlurStyle = { filter: `blur(${thumbBlurPx}px)` };

  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      <Navbar onNavigate={onNavigate} />
      <AuthModal onNavigate={onNavigate} />

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
          <div className="py-20 text-center space-y-4">
            <p className="text-slate-500 dark:text-zinc-400">Content not found.</p>
            <button
              onClick={() => onNavigate('')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors"
            >
              Back to Home
            </button>
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
          <div className="space-y-4">
            {/* 1. Bright 3D Stacked Card Preview */}
            <div className="relative pb-3" style={{ perspective: '1200px' }}>
              {/* Staggered 3D backdrop cards — layered, subtle shadows, clean borders */}
              {allMedia.length > 1 && (
                <>
                  <div
                    className="absolute rounded-[24px] bg-white/5 border border-white/10"
                    style={{
                      top: 14,
                      left: 18,
                      right: 18,
                      bottom: -6,
                      transform: 'translateY(10px) scale(0.97)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
                    }}
                  />
                  <div
                    className="absolute rounded-[24px] bg-white/[0.07] border border-white/[0.12]"
                    style={{
                      top: 8,
                      left: 10,
                      right: 10,
                      bottom: -3,
                      transform: 'translateY(5px) scale(0.98)',
                      boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
                    }}
                  />
                </>
              )}

              {/* Main preview card — bright, clean, rounded border */}
              <div
                className="relative rounded-[24px] overflow-hidden bg-zinc-900 border-2 border-white/15 shadow-2xl shadow-black/40 transition-transform duration-300 hover:scale-[1.005]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Blurred media preview — bright, natural, no dark tint */}
                <div
                  className="relative aspect-[4/5] sm:aspect-[4/3] select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  onTouchStart={onTouchStart}
                  onTouchEnd={onTouchEnd}
                  style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  {allMedia.map((m, i) => (
                    <div
                      key={i}
                      className={`absolute inset-0 transition-all duration-600 ease-out ${
                        i === activeIndex
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 scale-105'
                      }`}
                    >
                      {m.type === 'image' ? (
                        <img
                          src={m.url}
                          alt=""
                          className="w-full h-full object-cover scale-110 brightness-105 saturate-120"
                          style={blurStyle}
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <Video size={48} className="text-zinc-600" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Subtle bottom-to-top fade only — keeps previews bright */}
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Carousel nav arrows */}
                  {allMedia.length > 1 && (
                    <>
                      <button
                        onClick={goPrev}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/15 backdrop-blur-md text-white hover:bg-white/25 transition-all hover:scale-110 active:scale-95 z-10 border border-white/20"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={goNext}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/15 backdrop-blur-md text-white hover:bg-white/25 transition-all hover:scale-110 active:scale-95 z-10 border border-white/20"
                        aria-label="Next image"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}

                  {/* Image counter badge — top right */}
                  {allMedia.length > 1 && (
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs text-white font-medium z-10 border border-white/20">
                      {content.media_type === 'image' ? <ImageIcon size={11} /> : <Video size={11} />}
                      {activeIndex + 1} / {allMedia.length}
                    </div>
                  )}

                  {/* Lock badge — top left, minimal */}
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs text-white font-medium z-10 border border-white/20">
                    <Lock size={11} />
                    Locked
                  </div>

                  {/* Bottom overlay: price + email + thumbnails — unified checkout zone */}
                  <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-4 pt-12 flex flex-col items-center gap-3">
                    {/* Price */}
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">
                        ${priceDisplay}
                      </p>
                      <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider">One-time USD</p>
                    </div>

                    {/* Thumbnail row — neat, bottom center */}
                    {allMedia.length > 1 && (
                      <div className="flex items-center gap-2">
                        {allMedia.map((m, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveIndex(i)}
                            className={`rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                              i === activeIndex
                                ? 'border-white scale-110 opacity-100 w-9 h-9'
                                : 'border-white/30 opacity-60 hover:opacity-90 hover:border-white/60 w-7 h-7'
                            }`}
                            aria-label={`Go to image ${i + 1}`}
                          >
                            {m.type === 'image' ? (
                              <img src={m.url} alt="" className="w-full h-full object-cover" style={thumbBlurStyle} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                                <Video size={10} className="text-white/50" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Creator & Post Information */}
            <div className="rounded-2xl bg-[#131318] border border-zinc-800/60 p-5 shadow-xl shadow-black/20">
              {/* Creator row */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => content.creator && onNavigate(`c/${content.creator.username}`)}
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden ring-2 ring-zinc-800 shrink-0"
                >
                  {content.creator?.avatar_url ? (
                    <img src={content.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-white uppercase">
                      {(content.creator?.display_name || content.creator?.username || 'C')[0]}
                    </span>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white truncate">
                      {content.creator?.display_name || content.creator?.username || 'Unknown'}
                    </p>
                    <BadgeCheck size={15} className="text-indigo-400 shrink-0" fill="currentColor" />
                  </div>
                  <p className="text-xs text-zinc-500">@{content.creator?.username || 'creator'}</p>
                </div>

                <button
                  onClick={() => content.creator && onNavigate(`c/${content.creator.username}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/80 text-zinc-200 text-xs font-semibold hover:bg-zinc-700/80 transition-colors shrink-0"
                >
                  View Profile
                  <ArrowRight size={12} />
                </button>
              </div>

              {/* Divider */}
              <div className="my-3.5 border-t border-zinc-800/60" />

              {/* Tags */}
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                {content.media_count > 1 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-[11px] font-semibold text-indigo-400">
                    <ImageIcon size={10} />
                    {content.media_count} {content.media_type === 'image' ? 'images' : 'files'}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-xl font-bold text-white leading-snug">{content.title}</h1>

              {/* Description */}
              {content.description && (
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{content.description}</p>
              )}
            </div>

            {/* 3. Checkout — email + unlock button in one cohesive block */}
            <div className="rounded-2xl bg-[#131318] border border-zinc-800/60 p-5 shadow-xl shadow-black/20">
              {/* Email input (guests only) — integrated seamlessly */}
              {!user && (
                <div className="mb-3.5">
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => {
                        setGuestEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      placeholder="Enter your email to unlock"
                      className="w-full rounded-xl bg-[#0B0B0F] border border-zinc-800 pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-rose-400 mt-2">{emailError}</p>
                  )}
                </div>
              )}

              {/* Unlock button — clean, full-width */}
              <button
                onClick={onPayToUnlock}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-base py-3.5 hover:from-indigo-400 hover:to-purple-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
              >
                <Lock size={18} />
                Unlock for ${priceDisplay}
              </button>

              {/* Tax subtext directly below button */}
              <p className="text-center text-[11px] text-zinc-600 mt-2.5">
                Tax calculated next step
              </p>

              {/* Security disclaimer box */}
              <div className="mt-3.5 rounded-xl bg-[#0B0B0F] border border-zinc-800/80 px-4 py-3 flex items-start gap-2.5">
                <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  velourmedia.site never sees, stores, or saves your card details. Cards you pay with stay on your device only — and are removed the moment you log out.
                </p>
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Shield size={14} className="text-indigo-400" />
                  Secure payment
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Zap size={14} className="text-amber-400" />
                  Instant access
                </div>
              </div>

            </div>

            {/* 4. Compact footer legal links — very bottom, subtle */}
            <div className="text-center pt-3 pb-8 space-y-2">
              <p className="text-[11px] text-zinc-600">
                By purchasing, you agree to our Customer Terms and Privacy Policy.
              </p>
              <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-600">
                <button onClick={() => onNavigate('legal')} className="hover:text-indigo-400 transition-colors">
                  Customer Terms
                </button>
                <span className="text-zinc-700">•</span>
                <button onClick={() => onNavigate('legal')} className="hover:text-indigo-400 transition-colors">
                  Privacy Policy
                </button>
                <span className="text-zinc-700">•</span>
                <button onClick={() => onNavigate('support')} className="hover:text-indigo-400 transition-colors">
                  Need help? Report abuse
                </button>
              </div>
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

  const presets = [5, 10, 20];

  const handleTip = (amount: number) => {
    if (!user) {
      openAuth('signin');
      return;
    }
    onTip(creatorId, contentId, amount);
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
            className="px-5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
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
            disabled={!customAmount || parseFloat(customAmount) < 1}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Heart size={14} />
            Send Tip
          </button>
        </div>
      )}

    </div>
  );
}
