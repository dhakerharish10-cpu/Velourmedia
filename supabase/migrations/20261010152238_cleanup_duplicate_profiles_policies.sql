/*
# Clean up duplicate profiles RLS policies

Older policies with singular names (delete_own_profile, insert_own_profile,
read_profiles, update_own_profile) were superseded by the new ones added
in the previous migration. Removing the duplicates to avoid confusion.
*/

DROP POLICY IF EXISTS "delete_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;