import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsyyghnxebvttrdjvojq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzeXlnaG54ZWJ2dHRyZGp2b2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0OTM4MzIsImV4cCI6MjA5OTA2OTgzMn0.0kDH8X9rmViKtRr64lXtxZhnV_7m8zXxTH7vAv8eX3Q';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.'
  );
}

// Catch a key that belongs to a different project (the cause of 401s on login)
function keyProjectRef(key: string): string | null {
  try {
    return JSON.parse(atob(key.split('.')[1])).ref ?? null;
  } catch {
    return null;
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
