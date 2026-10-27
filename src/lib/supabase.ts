import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dsyyghnxebvttrdjvojq.supabase.co";
const supabaseAnonKey = "sb_publishable_4jMb-W-KUIhR-4OWZNuzgA_XSl6nqHQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
