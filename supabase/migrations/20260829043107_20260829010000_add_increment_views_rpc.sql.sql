-- Add SECURITY DEFINER function to safely increment views_count
-- This allows anon/authenticated users to increment views without UPDATE policy
CREATE OR REPLACE FUNCTION increment_content_views(p_content_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE content
  SET views_count = views_count + 1
  WHERE id = p_content_id;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION increment_content_views(uuid) TO anon, authenticated;
