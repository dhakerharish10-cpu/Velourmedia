import { createClient } from '@supabase/supabase-js';

// Env values pasted from chat/docs sometimes arrive wrapped in quotes or as a
// Markdown link like "[https://x.supabase.co](https://x.supabase.co)". Extract the
// plain URL so createClient doesn't throw "Invalid supabaseUrl" and blank the page.
function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/^['"]|['"]$/g, '').trim();
  return trimmed || undefined;
}

function cleanUrl(value: string | undefined): string | undefined {
  const raw = cleanEnv(value);
  if (!raw) return undefined;
  const match = raw.match(/https?:\/\/[^\s\])"'<>]+/);
  if (!match) return undefined;
  try {
    return new URL(match[0]).origin;
  } catch {
    return undefined;
  }
}

export const supabaseUrl = cleanUrl((import.meta.env.VITE_SUPABASE_URL || "https://dsyyghnxebvttrdjvojq.supabase.co") as string | undefined);
export const supabaseAnonKey = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

// createClient throws when the URL/key are missing, which would crash the bundle
// before React mounts and leave a blank page. Fall back to placeholders and let
// main.tsx render a configuration notice instead.
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigured) {
  console.error(
    'Missing or invalid VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. Set them as environment variables and redeploy.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
