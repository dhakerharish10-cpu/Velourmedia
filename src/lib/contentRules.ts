
// Client-side copy of the database rule in public.check_adult_content_rules().
// The database trigger is the real enforcement; this lets the app explain the problem before anything is uploaded.
// Keep this list identical to the trigger's banned_words array.
export const RESTRICTED_KEYWORDS = [
  'nude', 'nsfw', 'porn', 'xxx', 'sex', 'onlyfans', '18+',
  'adult', 'erotic', 'leaked', 'stripper', 'topless', 'naked',
] as const;

// Same matching as the trigger: case-insensitive, whole word (\y in Postgres == \b here)
const PATTERNS = RESTRICTED_KEYWORDS.map((word) => ({ word, re: new RegExp(`\\b${word}\\b`, 'i') }));

/** Returns the first restricted word found in any of the given texts, or null. */
export function findRestrictedKeyword(...texts: Array<string | null | undefined>): string | null {
  const combined = texts.map((t) => t ?? '').join(' ').toLowerCase();
  for (const { word, re } of PATTERNS) {
    if (re.test(combined)) return word;
  }
  return null;
}

export function restrictedKeywordMessage(word: string): string {
  return `The word "${word}" isn't allowed. Please change your title or description and try again.`;
}
