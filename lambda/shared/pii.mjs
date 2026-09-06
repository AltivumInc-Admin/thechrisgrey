/**
 * PII pattern sources — the single definition of "contact identifier" for the
 * Lambda fleet.
 *
 * Two independent controls consume these: `logger.mjs` redacts matches before a
 * line reaches CloudWatch (and, through it, Sentry), and
 * `chat-stream/memory.mjs` refuses to persist a visitor fact that matches. They
 * used to carry byte-identical copies of both regexes with a comment asking the
 * next editor to tighten both — exactly the coupling a shared module exists to
 * make mechanical.
 *
 * SOURCES, not RegExp objects, on purpose. The redactor needs /g for `.replace`
 * while the memory gate uses `.test`, and a shared /g instance would carry
 * `lastIndex` between calls and skip every other match. Each consumer builds its
 * own instance with the flags it needs, so neither can corrupt the other's state.
 *
 * Zero dependencies: logger.mjs imports this at cold start in every handler.
 */

/**
 * Email: a token containing '@' with a dotted domain. The required '.' after the
 * '@' keeps a bare social handle like "@thechrisgrey" out of the match.
 */
export const EMAIL_PATTERN_SOURCE = "[^\\s@]+@[^\\s@]+\\.[^\\s@]+";

/**
 * Phone / long digit run: 10+ digits joined only by phone-ish separators (space,
 * parens, '.', '-'). The separator class bridges real formats like
 * "+1 (512) 555-0199", while letters and commas break a run — so years (2024),
 * ZIPs (78701), and "18D for 12 years" stay under the threshold.
 */
export const PHONE_PATTERN_SOURCE = "(?:\\+?\\d[\\s().-]*){10,}";
