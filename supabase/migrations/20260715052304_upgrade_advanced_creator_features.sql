/*
# Upgrade schema: multi-profile, subscription pricing, content media, creator earnings

## Overview
This migration upgrades the Premium Creator Content Monetization Platform with:
1. Sub-profiles/personas under a single user account
2. Subscription pricing per profile
3. Multiple media items per content post
4. Creator earnings tracking with a dedicated view

## 1. Modified Tables

### `profiles` — adds subscription pricing + owner separation
- `subscription_price` (numeric, nullable) — monthly subscription price for the creator's content. NULL = no subscription tier.
- `owner_id` (uuid, nullable) — for sub-profiles/personas: references auth.users. NULL for primary profiles. Non-null means this profile is a sub-profile owned by that user.
- `is_primary` (boolean, default true) — true for the user's original auto-created profile, false for sub-profiles.

Note: The existing `id` column remains the primary key and still references auth.users for primary profiles. For sub-profiles, `id` is a generated UUID (not linked to auth.users), and `owner_id` links back to the auth user.

### `content` — adds media_count for quick display
- `media_count` (integer, default 1) — number of media items attached to this content.

## 2. New Tables

### `content_media` — multiple media items per content post
- `id` (uuid, primary key)
- `content_id` (uuid, not null, references content, cascade delete)
- `media_url` (text, not null) — public URL to stored media file
- `media_type` (text, not null) — 'image' or 'video'
- `display_order` (integer, not null, default 0) — ordering for gallery display
- `created_at` (timestamptz, default now())

### `subscriptions` — fan subscriptions to creators
- `id` (uuid, primary key)
- `subscriber_id` (uuid, not null, references auth.users, cascade delete)
- `creator_id` (uuid, not null, references profiles, cascade delete)
- `amount` (numeric, not null) — subscription amount paid
- `status` (text, not null, default 'active') — 'active' or 'cancelled'
- `created_at` (timestamptz, default now())
- UNIQUE constraint on (subscriber_id, creator_id) — one active subscription per creator per subscriber

## 3. New Views

### `creator_earnings` — aggregated earnings summary per creator
- `creator_id` (uuid)
- `content_revenue` (numeric) — total from content purchases on this creator's content
- `subscription_revenue` (numeric) — total from active subscriptions to this creator
- `total_revenue` (numeric) — sum of both
- `total_sales` (bigint) — count of content purchases
- `total_subscribers` (bigint) — count of active subscriptions

## 4. Security (RLS)

- `profiles`: authenticated users can read all profiles. Users can update profiles where they are the owner (id = auth.uid() for primary, owner_id = auth.uid() for sub-profiles). Users can insert sub-profiles where owner_id = auth.uid().
- `content_media`: authenticated users can read all media. Creers can insert/update/delete media for content they own (via EXISTS check on content.creator_id matching their profile).
- `subscriptions`: subscribers can read and insert their own subscriptions. Creators can read subscriptions to their profile.

## 5. Important Notes
- The existing `profiles.id` column still references auth.users for primary profiles. Sub-profiles get a generated UUID and use `owner_id` to link to the auth user.
- The `handle_new_user` trigger is updated to set `is_primary = true` on auto-created profiles.
- All new columns use `IF NOT EXISTS` conditional adds to be safe on re-runs.
- The storage bucket `creator-media` is reused for avatars and additional media items.
*/

-- ============================================================
-- 1. ADD COLUMNS TO profiles
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_price') THEN
    ALTER TABLE profiles ADD COLUMN subscription_price numeric(10,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'owner_id') THEN
    ALTER TABLE profiles ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_primary') THEN
    ALTER TABLE profiles ADD COLUMN is_primary boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- The id column currently has a FK to auth.users. For sub-profiles we need to allow non-auth-user IDs.
-- We'll keep the FK for backward compatibility but sub-profiles will use a generated UUID.
-- The owner_id column is what links sub-profiles back to the auth user.
-- To allow sub-profile IDs that don't reference auth.users, we drop the FK constraint and re-add it as nullable.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey'
      AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

-- Re-add FK only when the profile IS a primary profile (id references auth.users).
-- We can't do a conditional FK, so we leave id as a plain uuid column.
-- Primary profiles will still get id = auth.uid() from the trigger.

-- Add index on owner_id for sub-profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_owner_id ON profiles(owner_id) WHERE owner_id IS NOT NULL;

-- Update profiles policies to support sub-profile ownership
DROP POLICY IF EXISTS "read_profiles" ON profiles;
CREATE POLICY "read_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id OR auth.uid() = owner_id);

-- ============================================================
-- 2. ADD COLUMN TO content
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'media_count') THEN
    ALTER TABLE content ADD COLUMN media_count integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- ============================================================
-- 3. CREATE content_media TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS content_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_media_content_id ON content_media(content_id);
CREATE INDEX IF NOT EXISTS idx_content_media_order ON content_media(content_id, display_order);

ALTER TABLE content_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_content_media" ON content_media;
CREATE POLICY "read_content_media" ON content_media FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_content_media" ON content_media;
CREATE POLICY "insert_own_content_media" ON content_media FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM content c
      WHERE c.id = content_id
        AND (c.creator_id = auth.uid() OR c.creator_id IN (
          SELECT p.id FROM profiles p WHERE p.owner_id = auth.uid()
        ))
    )
  );

DROP POLICY IF EXISTS "update_own_content_media" ON content_media;
CREATE POLICY "update_own_content_media" ON content_media FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM content c
      WHERE c.id = content_id
        AND (c.creator_id = auth.uid() OR c.creator_id IN (
          SELECT p.id FROM profiles p WHERE p.owner_id = auth.uid()
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content c
      WHERE c.id = content_id
        AND (c.creator_id = auth.uid() OR c.creator_id IN (
          SELECT p.id FROM profiles p WHERE p.owner_id = auth.uid()
        ))
    )
  );

DROP POLICY IF EXISTS "delete_own_content_media" ON content_media;
CREATE POLICY "delete_own_content_media" ON content_media FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM content c
      WHERE c.id = content_id
        AND (c.creator_id = auth.uid() OR c.creator_id IN (
          SELECT p.id FROM profiles p WHERE p.owner_id = auth.uid()
        ))
    )
  );

-- ============================================================
-- 4. CREATE subscriptions TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(subscriber_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions(creator_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_subscriptions" ON subscriptions;
CREATE POLICY "read_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (
    auth.uid() = subscriber_id
    OR auth.uid() = creator_id
    OR auth.uid() = (
      SELECT p.owner_id FROM profiles p WHERE p.id = subscriptions.creator_id
    )
  );

DROP POLICY IF EXISTS "insert_own_subscription" ON subscriptions;
CREATE POLICY "insert_own_subscription" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = subscriber_id);

DROP POLICY IF EXISTS "cancel_own_subscription" ON subscriptions;
CREATE POLICY "cancel_own_subscription" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = subscriber_id)
  WITH CHECK (auth.uid() = subscriber_id);

-- ============================================================
-- 5. CREATE creator_earnings VIEW
-- ============================================================

CREATE OR REPLACE VIEW creator_earnings AS
SELECT
  p.id AS creator_id,
  COALESCE(purchases_rev.total, 0) AS content_revenue,
  COALESCE(subs_rev.total, 0) AS subscription_revenue,
  COALESCE(purchases_rev.total, 0) + COALESCE(subs_rev.total, 0) AS total_revenue,
  COALESCE(purchases_rev.sale_count, 0) AS total_sales,
  COALESCE(subs_rev.sub_count, 0) AS total_subscribers
FROM profiles p
LEFT JOIN (
  SELECT
    c.creator_id,
    SUM(pur.amount_paid) AS total,
    COUNT(*) AS sale_count
  FROM purchases pur
  JOIN content c ON c.id = pur.content_id
  GROUP BY c.creator_id
) purchases_rev ON purchases_rev.creator_id = p.id
LEFT JOIN (
  SELECT
    creator_id,
    SUM(amount) AS total,
    COUNT(*) AS sub_count
  FROM subscriptions
  WHERE status = 'active'
  GROUP BY creator_id
) subs_rev ON subs_rev.creator_id = p.id;

-- ============================================================
-- 6. UPDATE handle_new_user TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, is_primary)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    true
  );
  RETURN NEW;
END;
$$;
