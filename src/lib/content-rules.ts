export const RESTRICTED_KEYWORDS = [
  'nude', 'nsfw', 'porn', 'xxx', 'sex', 'onlyfans', '18+', 'adult', 'erotic', 'leaked', 'stripper', 'topless', 'naked',
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const RESTRICTED_KEYWORD_PATTERN = new RegExp(
  `(?<![a-z0-9])(${RESTRICTED_KEYWORDS.map(escapeRegex).join('|')})(?![a-z0-9])`,
  'i',
);

export function findRestrictedKeyword(...texts: (string | null | undefined)[]): string | null {
  const match = RESTRICTED_KEYWORD_PATTERN.exec(texts.filter(Boolean).join(' '));
  return match ? match[1] : null;
}
