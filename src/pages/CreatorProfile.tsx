import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Content, Profile } from './types';

export type CreatorProfileStatus = 'loading' | 'ready' | 'not_found' | 'error';

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function useCreatorProfile(username: string | undefined | null) {
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
    return () => { active = false; };
  }, [username]);

  return { profile, status };
}

export function useCreatorPosts(profileId: string | undefined | null) {
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
    return () => { active = false; };
  }, [profileId]);

  return { posts, loading };
}
