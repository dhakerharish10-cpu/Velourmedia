import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase credentials to bypass stale Bolt .env
export const supabaseUrl = 'https://dsyyghnxebvttrdjvojq.supabase.co';
export const supabaseAnonKey = 'sb_publishable_4jMb-W-KUIhR-4OWZNuzgA_XSl6nqHQ';

// Aliases for build compatibility across components
export const supabaseKey = supabaseAnonKey;
export const supabasePublishableKey = supabaseAnonKey;

// Boolean flag required by src/main.tsx
export const isSupabaseConfigured: boolean = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export default supabase;
