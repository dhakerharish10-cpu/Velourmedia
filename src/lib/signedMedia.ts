import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const PAID_BUCKET = 'paid-media';

/** A stored media value is either a public URL (http...) or a raw path inside the private bucket. */
export const isStoragePath = (value: string | null | undefined): value is string =>
  !!value && !/^https?:///i.test(value);

/**
 * Signs several private-bucket paths in ONE request.
 * Works for the post's creator only (the storage policy lets an owner read their own folder).
 */
export async function signPaidPaths(paths: string[], expiresInSeconds = 3600): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(isStoragePath)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage.from(PAID_BUCKET).createSignedUrls(unique, expiresInSeconds);
  if (error || !data) {
    console.error('Could not sign media paths:', error?.message);
    return {};
  }
  const result: Record<string, string> = {};
  data.forEach((row) => {
    if (row.path && row.signedUrl) result[row.path] = row.signedUrl;
  });
  return result;
}

/**
 * Turns stored media values into something an <img> / <video> can load.
 *   const resolve = useResolvedMedia(items.map((i) => i.media_url));
 *   <img src={resolve(item.media_url) ?? undefined} />
 * Public URLs pass through unchanged; raw private paths are signed (and re-signed before they expire).
 * Returns null while a path is still being signed or cannot be signed.
 */
export function useResolvedMedia(values: Array<string | null | undefined>) {
  const key = values.filter(isStoragePath).join('|');
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const paths = key ? key.split('|') : [];
    if (paths.length === 0) {
      setSigned({});
      return;
    }
    const run = () => signPaidPaths(paths).then((m) => { if (active) setSigned(m); });
    run();
    const timer = setInterval(run, 50 * 60 * 1000); // the URLs last 60 minutes
    return () => { active = false; clearInterval(timer); };
  }, [key]);

  return (value: string | null | undefined): string | null => {
    if (!value) return null;
    if (!isStoragePath(value)) return value;
    return signed[value] ?? null;
  };
}
