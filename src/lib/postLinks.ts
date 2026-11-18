// One place that builds shareable links, so every screen produces the same clean URLs
// (no "#"): posts share as /l/<short_code>, profiles as /c/<username>.
export const SHORT_CODE_RE = /^[a-z0-9]{4,12}$/i;
function origin(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'https://velourmedia.site';
}
/** Short link when the post has a code (https://velourmedia.site/l/cc280d5), otherwise the long /u/<id> link. */
export function postShareLink(post: { id: string; short_code?: string | null }): string {
  const code = post.short_code?.trim();
  return code && SHORT_CODE_RE.test(code) ? `${origin()}/l/${code}` : `${origin()}/u/${post.id}`;
}
export function profileShareLink(username: string): string {
  return `${origin()}/c/${encodeURIComponent(username)}`;
}
