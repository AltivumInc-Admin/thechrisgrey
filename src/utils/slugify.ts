/**
 * Convert arbitrary heading text into a stable, fragment-link-safe slug id.
 *
 * Used to give every H2/H3 on content pages a deterministic `id` so AI crawlers
 * and readers can deep-link to a section (`/aws#what-is-aws-certification`).
 * The slug is derived ONLY from the heading text, so the same heading produces
 * the same id across builds unless the text changes (VAL-AEO-005).
 *
 * Rules:
 *   - lowercase
 *   - strip HTML-unfriendly punctuation (keep alphanumerics, spaces, hyphens)
 *   - collapse whitespace to single hyphens
 *   - trim leading/trailing hyphens
 *   - empty / whitespace-only input returns an empty string (caller decides
 *     whether to omit the id)
 *
 * Accent-stripping is intentionally NOT applied: the site is English-only and
 * stripping would change the slug for legitimate non-ASCII names. Keep it
 * predictable.
 */
export const slugify = (text: string): string => {
  if (!text) return '';
  const lower = String(text).toLowerCase();
  // Drop any character that is not a letter, number, space, or hyphen.
  const stripped = lower.replace(/[^\p{L}\p{N}\s-]/gu, '');
  // Collapse runs of whitespace or hyphens into a single hyphen.
  const collapsed = stripped.trim().replace(/[\s-]+/g, '-');
  return collapsed;
};

/**
 * Extract a plain-text string from a React node-like Portable Text `children`
 * value. Portable Text block `children` are arrays of `{ _type: 'span', text }`
 * spans, but our heading renderers also receive already-flattened React
 * children / strings. We walk anything array-like, read `.text` or `.props`
 * recursively, and join the result so the slug is derived from the rendered
 * text a visitor actually sees.
 */
export const textFromChildren = (children: unknown): string => {
  if (children == null || children === false) return '';
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map((child) => textFromChildren(child)).join('');
  }
  if (typeof children === 'object' && 'text' in children) {
    return String((children as { text?: unknown }).text ?? '');
  }
  if (typeof children === 'object' && 'props' in children) {
    return textFromChildren((children as { props?: { children?: unknown } }).props?.children);
  }
  return '';
};
