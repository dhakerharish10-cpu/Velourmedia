/*
# Fix profiles RLS policies, owner_id, and content insert permissions

## Problem
When authenticated creators try to upload a post, two errors occur:
1. Storage upload fails with "Failed to fetch" — caused by profiles not being
   readable (profiles table has RLS enabled but NO policies, so the client
   can't load any profiles, meaning activeProfileId stays null, and the
   upload code falls back to user.id which is not a valid profile UUID).
2. Database insert fails with 42501 ("violates row-level security policy
   for table content") — the content INSERT policy checks
   `profiles.owner_id = auth.uid()`, but the handle_new_user trigger never
   sets owner_id, so it's always NULL and the check always fails.

## Changes

### 1. Fix handle_new_user trigger function
- Updated to set `owner_id = NEW.id` so the profile's owner is the auth user.
- This ensures future signups have a valid owner_id for RLS checks.

### 2. Backfill existing profiles
- Set `owner_id = id` for all existing rows where `owner_id IS NULL`.
- For the primary profile created by the trigger, id already equals the
  auth user's id, so this is the correct backfill.

### 3. Add RLS policies to profiles table
- SELECT: authenticated users can read profiles where they are the owner
  (owner_id = auth.uid()) OR where the profile id equals their auth uid
  (covers the primary profile case where id = auth uid and owner_id was
  just backfilled).
- INSERT: authenticated users can create profiles they own.
- UPDATE: authenticated users can update profiles they own.
- DELETE: authenticated users can delete profiles they own.
- Also allow anon/authenticated to SELECT all profiles (public creator
  profiles are visible to everyone for browsing creator pages).

### 4. Content INSERT policy
- The existing content INSERT policy checks
  `profiles.id = content.creator_id AND profiles.owner_id = auth.uid()`.
  With owner_id now properly set, this policy will work correctly.
  No change needed to content policies.

## Security
- profiles table: RLS was already enabled but had zero policies (locked down).
  Now has proper owner-scoped CRUD policies plus public SELECT for browsing.
- content table: no policy changes needed — the fix to owner_id makes the
  existing INSERT policy work correctly.
*/

-- 1. Fix the handle_new_user trigger function to set owner_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, is_primary, owner_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    true,
    NEW.id
  );
  RETURN NEW;
END;
$function$;

-- 2. Backfill owner_id for existing profiles where it's NULL
-- For primary profiles created by the trigger, id = auth user id, so owner_id = id is correct.
-- For sub-profiles created via createSubProfile, owner_id was already set by the app.
UPDATE public.profiles SET owner_id = id WHERE owner_id IS NULL;

-- 3. Add RLS policies to profiles table (it had RLS enabled but zero policies)
-- Public SELECT: anyone can browse creator profiles
DROP POLICY IF EXISTS "public_read_profiles" ON public.profiles;
CREATE POLICY "public_read_profiles"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Owner-scoped INSERT
DROP POLICY IF EXISTS "insert_own_profiles" ON public.profiles;
CREATE POLICY "insert_own_profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Owner-scoped UPDATE
DROP POLICY IF EXISTS "update_own_profiles" ON public.profiles;
CREATE POLICY "update_own_profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Owner-scoped DELETE
DROP POLICY IF EXISTS "delete_own_profiles" ON public.profiles;
CREATE POLICY "delete_own_profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);