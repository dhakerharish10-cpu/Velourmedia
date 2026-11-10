import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Navbar } from '../components/Navbar';
import { ContentCard } from '../components/ContentCard';
import { AuthModal } from '../components/AuthModal';
import type { Profile, Content } from '../lib/types';
import { User as UserIcon, ArrowLeft } from 'lucide-react';

export type CreatorProfileStatus = 'loading' | 'ready' | 'not_found' | 'error';

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function useCreatorProfile(username: string | undefined | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<CreatorProfileStatus>('loading');

  useEffect(() => {
    let active = true;
    const name = (username ?? '').trim();
    if (!name) {
      setProfile(null);
      setStatus('not_found');
      return;
    }

    setStatus('loading');
    (async () => {
      try {
        let { data, error } = await supabase
          .from('public_profiles')
          .select('*')
          .eq('username', name)
          .limit(1)
          .maybeSingle();

        if (!error && !data) {
          const res = await supabase
            .from('public_profiles')
            .select('*')
            .ilike('username', escapeLike(name))
            .limit(1)
            .maybeSingle();
          data = res.data;
          error = res.error;
        }

        if (!active) return;
        if (error) {
          console.error('Could not load creator profile:', error.message);
          setProfile(null);
          setStatus('error');
          return;
        }
        setProfile((data as unknown as Profile) ?? null);
        setStatus(data ? 'ready' : 'not_found');
      } catch (e) {
        if (!active) return;
        console.error('Creator profile request failed:', e);
        setProfile(null);
        setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [username]);

  return { profile, status };
}

function useCreatorPosts(profileId: string | undefined | null) {
  const [posts, setPosts] = useState<Content[]>([]);
  const [loading, setLoading] = useState<boolean>(!!profileId);

  useEffect(() => {
    let active = true;
    if (!profileId) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('creator_id', profileId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) console.error('Could not load creator posts:', error.message);
      setPosts((data as unknown as Content[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [profileId]);

  return { posts, loading };
}

interface CreatorProfileProps {
  username: string;
  onNavigate: (path: string) => void;
}

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export function CreatorProfile({ username, onNavigate }: CreatorProfileProps) {
  const decodedUsername = safeDecode(username);
  const { profile: creator, status } = useCreatorProfile(decodedUsername);
  const { posts: content, loading: postsLoading } = useCreatorPosts(creator?.id);

  const loading = status === 'loading' || (status === 'ready' && postsLoading);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar onNavigate={onNavigate} />
      <AuthModal onNavigate={onNavigate} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => onNavigate('')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Discover
        </button>

        {loading ? (
          <div className="py-20 text-center text-slate-500 dark:text-zinc-500">Loading profile...</div>
        ) : status === 'not_found' || !creator ? (
          <div className="py-20 text-center">
            <UserIcon size={40} className="mx-auto text-slate-300 dark:text-zinc-700 mb-3" />
            <p className="text-slate-500 dark:text-zinc-400">Creator not found.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
                {creator.avatar_url ? (
                  <img
                    src={creator.avatar_url}
                    alt={creator.display_name || creator.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-slate-900 dark:text-white uppercase">
                    {(creator.display_name || creator.username)[0]}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {creator.display_name || creator.username}
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400">@{creator.username}</p>
                {creator.bio && (
                  <p className="text-sm text-slate-600 dark:text-zinc-500 mt-1 max-w-md">
                    {creator.bio}
                  </p>
                )}
              </div>
            </div>

            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Content ({content.length})
            </h2>
            {content.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-zinc-500 py-12 text-center">
                This creator hasn't published any content yet.
              </p>
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
    </div>
  );
}
