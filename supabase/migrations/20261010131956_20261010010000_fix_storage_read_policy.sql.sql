/*
# Fix storage policies for creator-media bucket

## Problem
The `creator-media` storage bucket was missing a SELECT (read) policy on `storage.objects`.
Although the bucket is marked `public: true`, without a SELECT policy the storage layer
blocks all read access, causing uploaded media to be inaccessible and upload operations to fail.

## Changes
1. Add a SELECT policy on `storage.objects` for the `creator-media` bucket that allows
   public read access (anyone can view creator media without authentication).
2. The existing INSERT (upload) policy only allows `authenticated` users, which is correct.
3. The existing UPDATE and DELETE policies are owner-scoped, which is correct.

## Security
- Public read access is intentional: creator content thumbnails and media need to be
  viewable by all site visitors (including non-authenticated users).
- Writes are still restricted to authenticated users only.
*/

-- Allow public read access to creator-media bucket
DROP POLICY IF EXISTS "read_creator_media" ON storage.objects;
CREATE POLICY "read_creator_media"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'creator-media');
