/*
# Create schema for Premium Creator Content Monetization Platform

1. New Tables
- `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `username` (text, unique, not null) — creator handle
  - `display_name` (text, nullable)
  - `bio` (text, nullable)
  - `avatar_url` (text, nullable)
  - `is_admin` (boolean, default false)
  - `created_at` (timestamptz, default now())

- `content`
  - `id` (uuid, primary key)
  - `creator_id` (uuid, not null, references profiles, cascade delete)
  - `title` (text, not null)
  - `description` (text, nullable)
  - `media_url` (text, not null) — public URL to stored media
  - `media_type` (text, not null) — 'image' or 'video'
  - `thumbnail_url` (text, nullable)
  - `price` (numeric, not null, default 0)
  - `is_published` (boolean, default true)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

- `purchases`
  - `id` (uuid, primary key)
  - `buyer_id` (uuid, not null, references auth.users, cascade delete)
  - `content_id` (uuid, not null, references content, cascade delete)
  - `amount_paid` (numeric, not null)
  - `created_at` (timestamptz, default now())
  - UNIQUE constraint on (buyer_id, content_id) — one purchase per content per buyer

2. Security
- Enable RLS on all tables.
- profiles: authenticated users can read all profiles; owners can update their own.
- content: authenticated users can read published content; creators can insert/update/delete their own.
- purchases: buyers can read their own purchases; buyers can insert their own purchase records.
- Storage bucket `creator-media` (public) for media uploads with owner-scoped policies.

3. Indexes
- profiles: unique index on username.
- content: index on creator_id, created_at desc.
- purchases: index on buyer_id, content_id.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_profiles" ON profiles;
CREATE POLICY "read_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- CONTENT
CREATE TABLE IF NOT EXISTS content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  thumbnail_url text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_creator_id ON content(creator_id);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);

ALTER TABLE content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_published_content" ON content;
CREATE POLICY "read_published_content" ON content FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_content" ON content;
CREATE POLICY "insert_own_content" ON content FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "update_own_content" ON content;
CREATE POLICY "update_own_content" ON content FOR UPDATE
  TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "delete_own_content" ON content;
CREATE POLICY "delete_own_content" ON content FOR DELETE
  TO authenticated USING (auth.uid() = creator_id);

-- PURCHASES
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  amount_paid numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(buyer_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_buyer_id ON purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_content_id ON purchases(content_id);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_purchases" ON purchases;
CREATE POLICY "read_own_purchases" ON purchases FOR SELECT
  TO authenticated USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "insert_own_purchase" ON purchases;
CREATE POLICY "insert_own_purchase" ON purchases FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = buyer_id);

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('creator-media', 'creator-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "read_creator_media" ON storage.objects;
CREATE POLICY "read_creator_media" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'creator-media');

DROP POLICY IF EXISTS "upload_creator_media" ON storage.objects;
CREATE POLICY "upload_creator_media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'creator-media');

DROP POLICY IF EXISTS "update_creator_media" ON storage.objects;
CREATE POLICY "update_creator_media" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'creator-media' AND owner = auth.uid()) WITH CHECK (bucket_id = 'creator-media');

DROP POLICY IF EXISTS "delete_creator_media" ON storage.objects;
CREATE POLICY "delete_creator_media" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'creator-media' AND owner = auth.uid());

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
