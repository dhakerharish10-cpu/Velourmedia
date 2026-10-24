import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Content } from '../lib/types';
import { useStore } from '../lib/store';
import { ImageIcon, Video, Lock, Layers } from 'lucide-react';

interface ContentCardProps {
  content: Content;
  onNavigate: (path: string) => void;
}

export function ContentCard({ content, onNavigate }: ContentCardProps) {
  const { isUnlocked } = useStore();
  const isOwned = isUnlocked(content.id);
  const isFree = content.price === 0;
  const isLocked = !isFree && !isOwned;
  const [paying, setPaying] = useState(false);

  const handlePayment = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPaying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to purchase exclusive content.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { content_id: content.id },
      });

      if (error || !data?.url) throw error ?? new Error('No checkout URL received');
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert('Could not start checkout. Please try again.');
    } finally {
      setPaying(false);
    }
  };
  
  return (
    <button
      onClick={() => onNavigate(`/u/${content.id}`)}
      className="group relative rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all text-left"
    >
      <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-black/40 relative">
        <img
          src={content.thumbnail_url || content.media_url}
          alt={content.title}
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isLocked ? 'scale-110 brightness-50' : 'group-hover:scale-105'
          }`}
          style={isLocked ? { filter: `blur(${((content.blur_percent ?? 60) / 100) * 24}px) brightness(0.5)` } : undefined}
        />
        {content.media_type === 'video' && !content.thumbnail_url && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-zinc-800">
            <Video size={32} className="text-slate-400 dark:text-zinc-600" />
          </div>
        )}

        {isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <Lock size={18} className="text-white" />
            </div>
            <button
  type="button"
  onClick={handlePayment}
  disabled={paying}
            className="px-3 py-1.5 rounded-lg bg-gradient-brand text-white text-xs font-semibold shadow-lg hover:opacity-90 disabled:opacity-50">
  {paying ? 'Starting...' : `Unlock Now for $${Number(content.price).toFixed(2)}`}
</button>
            
            
          </div>
        )}

        {content.media_count > 1 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-xs text-white z-10">
            <Layers size={10} />
            {content.media_count}
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{content.title}</p>
        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
          by {content.creator?.display_name || content.creator?.username || 'Unknown'}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-xs">
            {content.media_type === 'image' ? <ImageIcon size={12} className="text-slate-400 dark:text-zinc-500" /> : <Video size={12} className="text-slate-400 dark:text-zinc-500" />}
            <span className="text-slate-400 dark:text-zinc-500 capitalize">{content.media_type}</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold">
            {isFree ? (
              <span className="text-emerald-600 dark:text-emerald-400">Free</span>
            ) : isOwned ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Lock size={12} />
                Unlocked
              </span>
            ) : (
              <span className="text-indigo-600 dark:text-indigo-400">${Number(content.price).toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
