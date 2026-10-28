import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://dsyyghnxebvttrdjvojq.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzeXlnaG54ZWJ2dHRyZGp2b2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0OTM4MzIsImV4cCI6MjA5OTA2OTgzMn0.0kDH8X9rmViKtRr64lXtxZhnV_7m8zXxTH7vAv8eX3Q';

export const supabaseKey = supabaseAnonKey;
export const supabasePublishableKey = supabaseAnonKey;
export const isSupabaseConfigured: boolean = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export default supabase;
