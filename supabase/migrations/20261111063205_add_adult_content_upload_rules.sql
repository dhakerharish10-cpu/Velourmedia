/*
# Add adult content approval and upload rules

1. Plain-English summary
- Creators can be approved to post 18+ / sensitive content. Everyone else is blocked from it.
- Uploads from unapproved accounts are rejected by the database if they are marked 18+ or if their title or description contains restricted keywords.

2. Modified tables
- `profiles`: new column `can_post_adult` (boolean, default false). Users cannot change it themselves; only the existing column-level update grants apply, which do not include this column.
- `content`: new column `is_adult` (boolean, default false) marking a post as 18+ / sensitive.

3. New function and trigger
- `enforce_content_upload_rules()` runs before a content row is inserted or when its title, description or is_adult value is updated.
- For accounts without `can_post_adult`, it rejects any row with `is_adult = true` or a restricted keyword in the title or description.
- Keyword matching is case-insensitive and only matches whole words.

4. Security notes
- The function runs with definer rights so it can read the creator's permission flag regardless of the caller's row access.
- Its execute permission is revoked from public, anon and authenticated roles; only the database trigger mechanism invokes it.
- Existing content rows are not changed.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_post_adult boolean NOT NULL DEFAULT false;
ALTER TABLE content ADD COLUMN IF NOT EXISTS is_adult boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.enforce_content_upload_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_can_post_adult boolean;
BEGIN
  SELECT p.can_post_adult INTO creator_can_post_adult
  FROM profiles p
  WHERE p.id = NEW.creator_id;

  IF NOT COALESCE(creator_can_post_adult, false) THEN
    IF NEW.is_adult THEN
      RAISE EXCEPTION 'enforce_content_upload_rules: restricted content is not permitted for this account'
        USING ERRCODE = 'check_violation';
    END IF;

    IF concat_ws(' ', NEW.title, NEW.description) ~* '(^|[^a-z0-9])(nude|nsfw|porn|xxx|sex|onlyfans|18\+|adult|erotic|leaked|stripper|topless|naked)([^a-z0-9]|$)' THEN
      RAISE EXCEPTION 'enforce_content_upload_rules: restricted keywords are not permitted for this account'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_content_upload_rules() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_content_upload_rules ON content;
CREATE TRIGGER enforce_content_upload_rules
BEFORE INSERT OR UPDATE OF title, description, is_adult ON content
FOR EACH ROW
EXECUTE FUNCTION public.enforce_content_upload_rules();
