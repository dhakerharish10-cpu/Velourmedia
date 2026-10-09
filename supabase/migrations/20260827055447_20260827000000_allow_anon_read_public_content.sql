-- Allow guest (anon) users to read published content, creator profiles, and media.
-- Previously these SELECT policies were scoped to TO authenticated only, which
-- caused non-logged-in visitors to see "Content not found" on /#/u/:id links.

DROP POLICY IF EXISTS "read_published_content" ON content;
CREATE POLICY "read_published_content" ON content FOR SELECT
  TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "read_profiles" ON profiles;
CREATE POLICY "read_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "read_content_media" ON content_media;
CREATE POLICY "read_content_media" ON content_media FOR SELECT
  TO anon, authenticated USING (true);
