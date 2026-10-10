/*
# Re-apply profiles RLS policies

The previous migration fixed owner_id and the trigger, but the profiles
RLS policies did not persist. Re-applying them here.
*/

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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