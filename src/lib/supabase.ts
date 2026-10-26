import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://dsyyghnxebvttrdjvojq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhbmFzZSIsInJlZiI6ImRzeXlnhm54ZWJ2dHRyZGpvanoiLCJyb2xlIjoiaW5vbiIsInthdCI6MTc4MzQ5MzGzMiwiZXhwIjoyMDk5MDY5OTgzMn0.0kDH8X9rmViKtRr64lXtxZhnV_7m8zXxTH7vAv8eX3Q',
  { auth: { persistSession: true, autoRefreshToken: true } }
);