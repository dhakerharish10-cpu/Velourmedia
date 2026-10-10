import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Navbar } from '../components/Navbar';
import { ContentCard } from '../components/ContentCard';
import { AuthModal } from '../components/AuthModal';
import type { Profile, Content } from '../lib/types';
import { User as UserIcon, ArrowLeft, Crown, Check } from 'lucide-react';

interface CreatorProfileProps {
  username: string;
  onNavigate: (path: string) => void;
}

export function CreatorProfile({ username, onNavigate }: CreatorProfileProps) {
  const { user, isSubscribed } = useStore();
  const [creator, setCreator] = useState<Profile | null>(null);
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      if (pErr || !active) return;
      if (!profile) {
        setLoading(false);
        return;
      }
      setCreator(profile);
      const { data: items } = await supabase
        .from('content')
        .select('*')
        .eq('creator_id', profile.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (active) {
        setContent(items || []);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [username]);

  const subscribed = creator ? isSubscribed(creator.id) : false;
  const isOwnProfile = user?.id === creator?.id;

  const onSubscribeClick = () => {
    if (!creator) return;
    onNavigate(`c/${creator.username}/subscribe`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar onNavigate={onNavigate} />
      <AuthModal onNavigate={onNavigate} />

      {/* Guest age gate removed for friction-free checkout */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => onNavigate('')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-slate-900 dark:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Discover
        </button>

        {loading ? (
          <div className="py-20 text-center text-slate-500 dark:text-zinc-500">Loading profile...</div>
        ) : !creator ? (
          <div className="py-20 text-center">
            <UserIcon size={40} className="mx-auto text-slate-300 dark:text-zinc-700 mb-3" />
            <p className="text-slate-500 dark:text-zinc-400">Creator not found.</p>
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt={creator.display_name || creator.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-slate-900 dark:text-white uppercase">{(creator.display_name || creator.username)[0]}</span>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{creator.display_name || creator.username}</h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400">@{creator.username}</p>
                {creator.bio && <p className="text-sm text-slate-600 dark:text-zinc-500 mt-1 max-w-md">{creator.bio}</p>}
              </div>

              {/* Subscribe button */}
              {!isOwnProfile && (
                <div className="flex items-center gap-2">
                  {subscribed ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      <Check size={16} />
                      <span className="text-sm font-medium">Subscribed</span>
                    </div>
                  ) : (
                    <button
                      onClick={onSubscribeClick}
                      className="px-5 py-2.5 rounded-xl bg-gradient-brand text-slate-900 dark:text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      <Crown size={16} />
                      Subscribe for $15.00/mo
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Content grid */}
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Content ({content.length})</h2>
            {content.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-zinc-500 py-12 text-center">This creator hasn't published any content yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {content.map((item) => (
                  <ContentCard key={item.id} content={item} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Subscription checkout lives on the dedicated /subscribe page */}
    </div>
  );
}
