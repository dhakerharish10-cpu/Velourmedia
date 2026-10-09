import { useStore } from '../lib/store';
import { Navbar } from '../components/Navbar';
import { AuthModal } from '../components/AuthModal';
import { Library, Lock, ArrowLeft, Video, Download } from 'lucide-react';

interface PurchaseLibraryProps {
  onNavigate: (path: string) => void;
}

export function PurchaseLibrary({ onNavigate }: PurchaseLibraryProps) {
  const { user, myPurchases, openAuth } = useStore();

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <Navbar onNavigate={onNavigate} currentPath="library" />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <Library size={32} className="mx-auto text-zinc-600 mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sign in to view your library</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">Your purchased content will appear here.</p>
          <button
            onClick={() => openAuth('signin')}
            className="px-6 py-2.5 rounded-xl bg-gradient-brand text-slate-900 dark:text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Sign in
          </button>
        </div>
        <AuthModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar onNavigate={onNavigate} currentPath="library" />
      <AuthModal />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => onNavigate('')} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-white mb-6">
          <ArrowLeft size={16} /> Back to Discover
        </button>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
          <Library size={22} className="text-indigo-600 dark:text-indigo-400" />
          Your Library
        </h1>

        {myPurchases.length === 0 ? (
          <div className="py-20 text-center">
            <Lock size={40} className="mx-auto text-zinc-700 mb-3" />
            <p className="text-slate-500 dark:text-zinc-400 mb-2">No purchases yet.</p>
            <p className="text-sm text-slate-400 dark:text-zinc-500">Browse content and unlock premium pieces from your favorite creators.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {myPurchases.map((purchase) => {
              const content = purchase.content;
              if (!content) return null;
              return (
                <div
                  key={purchase.id}
                  className="group relative rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-200 dark:border-zinc-700 transition-all"
                >
                  <button onClick={() => onNavigate(`u/${content.id}`)} className="block w-full text-left">
                    <div className="aspect-square overflow-hidden bg-black/40">
                      {content.media_type === 'image' ? (
                        <img
                          src={content.thumbnail_url || content.media_url}
                          alt={content.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800">
                          {content.thumbnail_url ? (
                            <img src={content.thumbnail_url} alt={content.title} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <Video size={28} className="text-zinc-600" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{content.title}</p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                        by {content.creator?.display_name || content.creator?.username || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                        <Lock size={10} />
                        <span>Owned</span>
                      </div>
                    </div>
                  </button>
                  {content.media_type === 'image' && (
                    <a
                      href={content.media_url}
                      download
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-all"
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
