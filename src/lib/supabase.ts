import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in .env and in your hosting environment variables, then rebuild.'
  );
}

// Catch a key that belongs to a different project (the cause of 401s on login)
function keyProjectRef(key: string): string | null {
  try {
    return JSON.parse(atob(key.split('.')[1])).ref ?? null;
  } catch {
    return null; // new-style sb_publishable_ keys are not JWTs
  }
}
const urlRef = new URL(supabaseUrl).hostname.split('.')[0];
const keyRef = keyProjectRef(supabaseAnonKey);
if (keyRef && keyRef !== urlRef) {
  throw new Error(`Supabase key is for project "${keyRef}" but the URL is for "${urlRef}".`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
