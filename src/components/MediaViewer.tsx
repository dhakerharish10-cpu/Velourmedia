import { useState, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, ImageIcon, Video, Eye, BadgeCheck, Lock,
} from 'lucide-react';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || local.length <= 2) return email;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

interface MediaViewerProps {
  media: MediaItem[];
  title: string;
  creatorName?: string;
  creatorAvatar?: string | null;
  creatorUsername?: string;
  description?: string | null;
  viewsCount?: number;
  mediaType?: string;
  onCreatorClick?: () => void;
  watermarkEmail?: string | null;
}

export function MediaViewer({
  media,
  title,
  creatorName,
  creatorAvatar,
  creatorUsername,
  description,
  viewsCount,
  mediaType,
  onCreatorClick,
  watermarkEmail,
}: MediaViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i === 0 ? media.length - 1 : i - 1));
  }, [media.length]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i === media.length - 1 ? 0 : i + 1));
  }, [media.length]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleTouchStart = useCallback(() => {
    // Prevent long-press save on mobile by clearing any selection
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  }, []);

  const current = media[activeIndex];

  return (
    <div className="space-y-4">
      {/* Main media viewer */}
      <div
        className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-zinc-800 shadow-lg select-none"
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onTouchStart={handleTouchStart}
        style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      >
        {current?.type === 'image' ? (
          <img
            src={current.url}
            alt={title}
            className="w-full max-h-[600px] object-contain pointer-events-none"
            draggable={false}
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
          />
        ) : (
          <video
            src={current?.url}
            controls
            controlsList="nodownload noremoteplayback noplaybackrate"
            className="w-full max-h-[600px]"
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
          />
        )}

        {/* Gallery navigation */}
        {media.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 text-xs text-white pointer-events-none">
              {activeIndex + 1} / {media.length}
            </div>

            {/* Thumbnail strip */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {media.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
                    i === activeIndex
                      ? 'border-white scale-110 opacity-100'
                      : 'border-white/30 opacity-50 hover:opacity-80'
                  }`}
                >
                  {m.type === 'image' ? (
                    <img src={m.url} alt="" className="w-full h-full object-cover" draggable={false} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-700">
                      <Video size={12} className="text-white/60" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Protection badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 text-xs text-white pointer-events-none">
          <Lock size={10} />
          <span className="font-medium">Protected Content</span>
        </div>

        {/* Dynamic watermark overlay */}
        {watermarkEmail && (
          <>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-20deg] text-white/10 text-2xl font-bold whitespace-nowrap select-none">
                {maskEmail(watermarkEmail)}
              </div>
              <div className="absolute top-[20%] left-[10%] rotate-[-20deg] text-white/[0.07] text-lg font-semibold whitespace-nowrap select-none">
                {maskEmail(watermarkEmail)}
              </div>
              <div className="absolute bottom-[20%] right-[10%] rotate-[-20deg] text-white/[0.07] text-lg font-semibold whitespace-nowrap select-none">
                {maskEmail(watermarkEmail)}
              </div>
            </div>
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/40 text-[10px] text-white/50 font-mono pointer-events-none">
              {maskEmail(watermarkEmail)}
            </div>
          </>
        )}
      </div>

      {/* Info card */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
        {/* Creator row */}
        {creatorName && (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onCreatorClick}
              className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center overflow-hidden ring-2 ring-slate-100 dark:ring-zinc-800 shrink-0"
            >
              {creatorAvatar ? (
                <img src={creatorAvatar} alt="" className="w-full h-full object-cover" draggable={false} />
              ) : (
                <span className="text-sm font-bold text-white uppercase">
                  {creatorName[0]}
                </span>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{creatorName}</p>
                <BadgeCheck size={14} className="text-indigo-500 shrink-0" />
              </div>
              {creatorUsername && (
                <p className="text-xs text-slate-500 dark:text-zinc-400">@{creatorUsername}</p>
              )}
            </div>
            {onCreatorClick && (
              <button
                onClick={onCreatorClick}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
              >
                View Profile
              </button>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 mb-2">
          {mediaType === 'image' ? <ImageIcon size={12} /> : <Video size={12} />}
          <span className="capitalize">{mediaType}</span>
          {media.length > 1 && (
            <span className="flex items-center gap-1">
              <ImageIcon size={10} /> {media.length} files
            </span>
          )}
          {viewsCount !== undefined && (
            <span className="flex items-center gap-1">
              <Eye size={10} /> {viewsCount} views
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {description && (
          <p className="text-sm text-slate-600 dark:text-zinc-300 mt-3 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}
