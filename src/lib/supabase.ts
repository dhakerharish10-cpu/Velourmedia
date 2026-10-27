import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://dsyyghnxebvttrdjvojq.supabase.co';
export const supabaseAnonKey = 'sb_publishable_4jMb-W-KUIhR-4OWZNuzgA_XSl6nqHQ';

export const supabaseKey = supabaseAnonKey;
export const supabasePublishableKey = supabaseAnonKey;
export const isSupabaseConfigured: boolean = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export default supabase;
