/**
 * Build-time SEO validation gate for the PRERENDERED HTML.
 *
 * Runs AFTER scripts/prerender.js, BEFORE generate-sitemap. The unit tests
 * (SEO.test.tsx / schemas.test.ts) validate the JSON-LD generation logic in
 * jsdom, but nothing validated the actual dist/*.html that Google and social
 * crawlers read — the exact gap behind the #170 canonical/indexing-decay bug.
 * This step parses each prerendered route's <head> and asserts:
 *   - exactly one <script type="application/ld+json"> that is valid JSON with a
 *     non-empty @graph,
 *   - exactly one <link rel="canonical"> equal to the route's own URL
 *     (trailing-slash-insensitive),
 *   - any same-origin og:image (/og/<slug>.png) resolves to a file in dist/.
 *
 * AEO assertions (VAL-AEO-001 through VAL-AEO-006, VAL-CROSS-009):
 *   - every content route has a [data-aio-summary] element with non-empty text
 *     that appears BEFORE the first <h2> in source order,
 *   - every <h2> and <h3> on content routes has a non-empty slug-form id,
 *   - routes with a FAQPage JSON-LD node have a visible [data-aio-faq] section
 *     whose Q/A text matches the JSON-LD mainEntity text.
 *
 * #1 SAFETY CONSTRAINT (mirrors prerender.js): this step is NON-FATAL by
 * default. A route that degraded to a CSR shell (no prerendered file) is
 * reported but never fails the build, and violations only set a non-zero exit
 * when STRICT_PRERENDER=true (or STRICT_SEO_VALIDATION=true) — so a broken
 * crawl/validation never blocks the Amplify deploy. The route set is the SAME
 * SSOT as the sitemap/prerender (STATIC_ROUTES) so it can never drift.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { STATIC_ROUTES } from './generate-sitemap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '../dist');
const SITE_URL = 'https://thechrisgrey.com';

// Content routes that must carry a direct-answer summary (VAL-AEO-001).
// Excludes app-shell / non-content routes: /chat, /admin, /privacy.
const CONTENT_ROUTES = new Set([
  '/',
  '/about',
  '/altivum',
  '/foundation',
  '/podcast',
  '/aws',
  '/claude',
  '/beyond-the-assessment',
  '/blog',
  '/links',
  '/contact',
]);

// Routes where every H2/H3 must carry a stable, slug-form id (VAL-AEO-005).
// Superset of CONTENT_ROUTES: /privacy is a policy page (no direct-answer
// summary) but its headings still need fragment-linkable ids so AI crawlers
// and readers can deep-link to a section (e.g. /privacy#cookies-tracking).
const HEADING_ID_ROUTES = new Set([...CONTENT_ROUTES, '/privacy']);

// Routes that must emit a robots noindex meta (VAL-SEO-010). These are routes
// in the prerendered static set that should NOT be indexed. Currently empty
// because all STATIC_ROUTES are indexable — /chat, /admin, and the 404
// catch-all are noindex but are NOT in STATIC_ROUTES (not prerendered). If a
// noindex route is ever added to STATIC_ROUTES, list it here so the validator
// expects its robots meta instead of flagging it as a violation.
const NOINDEX_ROUTES = new Set([]);

// Per-route expected JSON-LD @graph @type entries (VAL-SD-003..VAL-SD-007,
// VAL-SD-009). The validator asserts each listed type is present in the
// prerendered @graph for that route. Routes not listed here have no
// page-specific schema requirement beyond the global Person/Organization/WebSite
// nodes already checked by the JSON-LD block assertions.
const EXPECTED_SCHEMA_TYPES_BY_ROUTE = {
  '/blog': ['CollectionPage'],
  '/podcast': ['PodcastSeries', 'PodcastEpisode'],
  '/aws': ['EducationalOccupationalCredential', 'FAQPage'],
  '/claude': ['EducationalOccupationalCredential', 'FAQPage'],
  '/links': ['FAQPage'],
};

// Routes whose page-specific schema node must carry a hasPart array with post
// references (VAL-SD-004). The /blog CollectionPage must reference the visible
// post collection so AI crawlers and search engines see the collection's
// members in the prerendered HTML.
const HASPART_ROUTES = new Set(['/blog']);

/**
 * Parse the single JSON-LD block from a prerendered HTML string and return the
 * @graph array (or [] when the block is missing/invalid). The caller already
 * asserts the block is unique and valid JSON; this helper is for per-type
 * schema assertions only and degrades to [] on any parse error.
 */
function graphFromHtml(html) {
  const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (ldMatches.length !== 1) return [];
  try {
    const graph = JSON.parse(ldMatches[0][1]);
    return Array.isArray(graph['@graph']) ? graph['@graph'] : [];
  } catch {
    return [];
  }
}

/**
 * Schema-specific violations for a single prerendered HTML string
 * (VAL-SD-003..VAL-SD-007, VAL-SD-009). Exported so the test suite can
 * exercise it against fixture HTML without reading dist/.
 */
export function schemaViolations(html, route) {
  const violations = [];
  const graph = graphFromHtml(html);
  if (graph.length === 0) return violations;

  const types = graph.map((n) => n['@type']);

  // Per-route expected @types.
  const expected = EXPECTED_SCHEMA_TYPES_BY_ROUTE[route];
  if (expected) {
    for (const t of expected) {
      if (!types.includes(t)) {
        violations.push(`expected JSON-LD @type "${t}" missing from @graph (VAL-SD)`);
      }
    }
  }

  // VAL-SD-009: WebSite node must declare a SearchAction targeting the visible
  // /blog search box (or omit it). The site renders a search input on /blog, so
  // the SearchAction must be present on every route that emits the WebSite node.
  const website = graph.find((n) => n['@type'] === 'WebSite');
  if (website) {
    const action = website.potentialAction;
    const isSearchAction =
      action &&
      action['@type'] === 'SearchAction' &&
      action.target &&
      typeof action.target.urlTemplate === 'string' &&
      action.target.urlTemplate.includes('/blog?q=');
    if (!isSearchAction) {
      violations.push('WebSite node missing valid SearchAction targeting /blog?q= (VAL-SD-009)');
    }
  }

  // VAL-SD-004: CollectionPage on /blog must include hasPart references to the
  // visible post collection (at least one Article reference). Without hasPart
  // the collection node does not describe its members.
  if (HASPART_ROUTES.has(route)) {
    const collection = graph.find((n) => n['@type'] === 'CollectionPage');
    if (collection) {
      const hasPart = Array.isArray(collection.hasPart) ? collection.hasPart : null;
      if (!hasPart || hasPart.length === 0) {
        violations.push('CollectionPage missing hasPart post references (VAL-SD-004)');
      }
    }
  }

  // VAL-SD-006: EducationalOccupationalCredential nodes should carry a url
  // field where available. /aws and /claude emit page-specific credentials.
  if (route === '/aws' || route === '/claude') {
    const creds = graph.filter((n) => n['@type'] === 'EducationalOccupationalCredential');
    for (const cred of creds) {
      if (!cred.url) {
        violations.push(
          `EducationalOccupationalCredential "${cred.name || '(unnamed)'}" missing url field (VAL-SD-006)`,
        );
      }
    }
  }

  return violations;
}

// File form written by prerender.js (outPathsFor): '/' -> dist/index.html,
// '/aws' -> dist/aws.html (the bare-URL artifact that returns 200, no redirect).
function fileForRoute(route) {
  if (route === '/') return join(DIST, 'index.html');
  return join(DIST, `${route.replace(/^\//, '')}.html`);
}

// Compare two absolute URLs ignoring a trailing slash (Home's canonical is the
// bare origin; Amplify serves some routes with a trailing slash). Stripping is
// unconditional — no real canonical is short enough for it to matter.
function sameUrl(a, b) {
  const norm = (u) => u.replace(/\/+$/, '');
  return norm(a) === norm(b);
}

/**
 * Extract the FAQPage mainEntity Q/A pairs from a parsed JSON-LD @graph.
 * Returns an array of { question, answer } or [] when no FAQPage node exists.
 */
function extractFaqFromGraph(graph) {
  if (!Array.isArray(graph['@graph'])) return [];
  for (const node of graph['@graph']) {
    if (node['@type'] === 'FAQPage' && Array.isArray(node.mainEntity)) {
      return node.mainEntity.map((q) => ({
        question: q.name || '',
        answer: q.acceptedAnswer?.text || '',
      }));
    }
  }
  return [];
}

/**
 * Decode HTML entities in a text snippet extracted from raw HTML so the DOM
 * text and JSON-LD text can be compared byte-for-byte. Covers the entities
 * Sanity / react-helmet-async emit most often.
 */
function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&nbsp;/g, ' ');
}

/**
 * AEO-specific violations for a single prerendered HTML string (VAL-AEO-001,
 * VAL-AEO-002, VAL-AEO-004, VAL-AEO-005). Exported so the test suite can
 * exercise it against fixture HTML without reading dist/.
 *
 * The direct-answer summary (VAL-AEO-001/002) and FAQ DOM cross-check
 * (VAL-AEO-004) only apply to CONTENT_ROUTES. The heading-id check
 * (VAL-AEO-005) applies to the broader HEADING_ID_ROUTES superset, which
 * adds /privacy — a policy page without a direct-answer summary whose
 * headings still need stable fragment-linkable ids.
 */
export function aeoViolations(html, route) {
  const violations = [];
  const isContentRoute = CONTENT_ROUTES.has(route);
  const isHeadingIdRoute = HEADING_ID_ROUTES.has(route);
  if (!isContentRoute && !isHeadingIdRoute) return violations;

  // --- VAL-AEO-001 / VAL-AEO-002: direct-answer summary before the first H2 ---
  // Only content routes are required to carry a direct-answer summary.
  if (isContentRoute) {
    const summaryMatch = html.match(/data-aio-summary="[^"]*"[^>]*>([\s\S]*?)<\//);
    const firstH2Index = html.search(/<h2[\s>]/);
    const summaryTagIndex = html.search(/data-aio-summary=/);
    if (summaryTagIndex === -1) {
      violations.push('missing [data-aio-summary] direct-answer element (VAL-AEO-001)');
    } else {
      const summaryText = decodeEntities((summaryMatch?.[1] || '').replace(/<[^>]+>/g, '').trim());
      if (!summaryText) {
        violations.push('[data-aio-summary] element has empty text (VAL-AEO-001)');
      } else {
        const words = summaryText.split(/\s+/).filter(Boolean).length;
        if (words < 40 || words > 80) {
          violations.push(`[data-aio-summary] is ${words} words; expected 40-80 (VAL-AEO-001)`);
        }
      }
      if (firstH2Index !== -1 && summaryTagIndex > firstH2Index) {
        violations.push('[data-aio-summary] appears AFTER the first <h2> in source order (VAL-AEO-002)');
      }
    }
  }

  // --- VAL-AEO-005: every H2/H3 has a non-empty slug-form id ---
  // Applies to HEADING_ID_ROUTES (CONTENT_ROUTES plus /privacy).
  if (isHeadingIdRoute) {
    const headingMatches = [...html.matchAll(/<(h[23])(\s[^>]*)?>/g)];
    for (const m of headingMatches) {
      const tag = m[1];
      const attrs = m[2] || '';
      const idMatch = attrs.match(/id="([^"]*)"/);
      if (!idMatch || !idMatch[1]) {
        violations.push(`<${tag}> without an id attribute (VAL-AEO-005)`);
      } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(idMatch[1])) {
        violations.push(`<${tag}> id "${idMatch[1]}" is not slug-form (VAL-AEO-005)`);
      }
    }
  }

  // --- VAL-AEO-004: FAQ content visible in DOM and matches JSON-LD ---
  // Self-gates on faqFromJsonLd.length > 0, so it is safe to run on any route.
  const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let faqFromJsonLd = [];
  if (ldMatches.length === 1) {
    try {
      const graph = JSON.parse(ldMatches[0][1]);
      faqFromJsonLd = extractFaqFromGraph(graph);
    } catch {
      // JSON-LD validity is checked by the caller; skip FAQ cross-check on parse error.
    }
  }
  if (faqFromJsonLd.length > 0) {
    const faqSectionMatch = html.match(/data-aio-faq/);
    if (!faqSectionMatch) {
      violations.push('FAQPage JSON-LD present but no visible [data-aio-faq] section in DOM (VAL-AEO-004)');
    } else {
      // Extract the text content of each visible FAQ question (<h3>) and answer
      // ([data-aio-answer]) from the DOM. We decode HTML entities so the
      // comparison against the JSON-LD text (which carries raw `&`, `'`, etc.)
      // is byte-for-byte rather than being thrown off by entity encoding.
      const visibleQuestions = [...html.matchAll(/<h3[^>]*id="[^"]*"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) =>
        decodeEntities(m[1].replace(/<[^>]+>/g, '').trim()),
      );
      const visibleAnswers = [...html.matchAll(/data-aio-answer="[^"]*"[^>]*>([\s\S]*?)<\/p>/g)].map((m) =>
        decodeEntities(m[1].replace(/<[^>]+>/g, '').trim()),
      );
      for (const qa of faqFromJsonLd) {
        if (!visibleQuestions.includes(qa.question)) {
          violations.push(`FAQ question "${qa.question.slice(0, 50)}..." not visible in DOM (VAL-AEO-004)`);
        }
        if (!visibleAnswers.includes(qa.answer)) {
          violations.push(`FAQ answer for "${qa.question.slice(0, 50)}..." not visible in DOM (VAL-AEO-004)`);
        }
      }
    }
  }

  return violations;
}

/**
 * Per-route SEO meta-tag violations (VAL-SEO-001, VAL-SEO-004, VAL-SEO-006,
 * VAL-SEO-007, VAL-SEO-008, VAL-SEO-010, VAL-SEO-011). Exported so the test
 * suite can exercise it against fixture HTML without reading dist/.
 *
 * Checks that are per-route (not cross-route):
 *   - exactly one <title> ending with "| Christian Perez" and under 70 chars
 *   - exactly one <meta name="description">, 70–160 chars
 *   - exactly one <h1>
 *   - OG tags: og:title, og:description, og:type, og:url, og:image, og:image:alt
 *   - Twitter tags: twitter:card, twitter:title, twitter:description,
 *     twitter:image, twitter:creator, twitter:site
 *   - robots meta: present on NOINDEX_ROUTES, absent on indexable routes
 *   - no hreflang tags (single-language site — VAL-SEO-004)
 *   - RSS feed <link rel="alternate" type="application/rss+xml"> on indexable
 *     pages (VAL-SEO-009)
 *   - every content <img> has a non-empty alt or explicit decorative marker
 *     (alt="" + role="presentation" or aria-hidden — VAL-SEO-011)
 *
 * Cross-route uniqueness (title/description) is handled by the caller in main().
 */

// --- VAL-SEO-006: exactly one per-page <title> ---
// The static shell no longer carries a <title> (it was removed from index.html
// to avoid a duplicate <title> in every prerendered page — VAL-SEO-006). The
// shell title constant is retained as a safety net in case a stale shell is
// ever served; it is filtered out before counting so the check targets the
// per-page title emitted by react-helmet-async.
const SHELL_TITLE = 'Christian Perez - thechrisgrey';

function titleViolations(html) {
  const violations = [];
  const titleMatches = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/g)];
  const perPageTitles = titleMatches.map((m) => decodeEntities(m[1].trim())).filter((t) => t !== SHELL_TITLE);
  if (perPageTitles.length !== 1) {
    violations.push(`expected exactly 1 per-page <title>, found ${perPageTitles.length} (VAL-SEO-006)`);
    return violations;
  }
  const title = perPageTitles[0];
  if (!title) {
    violations.push('<title> is empty (VAL-SEO-006)');
    return violations;
  }
  if (!title.endsWith('| Christian Perez') && title !== 'Christian Perez | thechrisgrey') {
    violations.push(`<title> "${title.slice(0, 50)}..." does not end with "| Christian Perez" (VAL-SEO-006)`);
  }
  if (title.length > 70) {
    violations.push(`<title> is ${title.length} chars; expected <= 70 (VAL-SEO-006)`);
  }
  return violations;
}

// --- VAL-SEO-006: exactly one <meta name="description">, 70–160 chars ---
function descriptionViolations(html) {
  const violations = [];
  const descMatches = [...html.matchAll(/<meta\s+name="description"\s+content="([^"]*)"/g)];
  if (descMatches.length !== 1) {
    violations.push(`expected exactly 1 <meta name="description">, found ${descMatches.length} (VAL-SEO-006)`);
    return violations;
  }
  const desc = decodeEntities(descMatches[0][1].trim());
  if (!desc) {
    violations.push('<meta name="description"> is empty (VAL-SEO-006)');
  } else if (desc.length < 70 || desc.length > 160) {
    violations.push(`<meta name="description"> is ${desc.length} chars; expected 70-160 (VAL-SEO-006)`);
  }
  return violations;
}

// --- VAL-SEO-006: exactly one <h1> ---
function h1Violations(html) {
  const violations = [];
  const h1Matches = [...html.matchAll(/<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/g)];
  if (h1Matches.length !== 1) {
    violations.push(`expected exactly 1 <h1>, found ${h1Matches.length} (VAL-SEO-006)`);
    return violations;
  }
  const h1Text = decodeEntities(h1Matches[0][2].replace(/<[^>]+>/g, '').trim());
  if (!h1Text) {
    violations.push('<h1> has empty text (VAL-SEO-006)');
  }
  return violations;
}

// --- VAL-SEO-007/008: check a list of meta tags for presence and non-empty content ---
function metaTagViolations(html, tagList, attr, valRef) {
  const violations = [];
  for (const name of tagList) {
    const m = html.match(new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`, 'i'));
    if (!m) {
      violations.push(`missing ${name} (${valRef})`);
    } else if (!m[1].trim()) {
      violations.push(`${name} is empty (${valRef})`);
    }
  }
  return violations;
}

// --- VAL-SEO-008: twitter:card must be summary_large_image ---
function twitterCardViolations(html) {
  const violations = [];
  const cardMatch = html.match(/<meta[^>]*name="twitter:card"[^>]*content="([^"]*)"/i);
  if (cardMatch && cardMatch[1] !== 'summary_large_image') {
    violations.push(`twitter:card is "${cardMatch[1]}"; expected "summary_large_image" (VAL-SEO-008)`);
  }
  return violations;
}

// --- VAL-SEO-010: robots meta ---
function robotsMetaViolations(html, route) {
  const violations = [];
  const robotsMatch = html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i);
  if (NOINDEX_ROUTES.has(route)) {
    if (!robotsMatch || !robotsMatch[1].includes('noindex')) {
      violations.push(`${route} should have robots noindex meta but does not (VAL-SEO-010)`);
    }
  } else if (robotsMatch && robotsMatch[1].includes('noindex')) {
    // Indexable routes must NOT carry noindex
    violations.push(`${route} is indexable but carries robots noindex meta (VAL-SEO-010)`);
  }
  return violations;
}

// --- VAL-SEO-004: no hreflang, html lang, og:locale ---
function hreflangAndLocaleViolations(html) {
  const violations = [];
  const hreflangMatches = [...html.matchAll(/<link[^>]*rel="alternate"[^>]*hreflang=/gi)];
  if (hreflangMatches.length > 0) {
    violations.push(
      `found ${hreflangMatches.length} hreflang link tag(s); expected 0 on single-language site (VAL-SEO-004)`,
    );
  }
  const htmlLangMatch = html.match(/<html\s+[^>]*lang="([^"]*)"/i);
  if (!htmlLangMatch) {
    violations.push('<html> tag missing lang attribute (VAL-SEO-004)');
  } else if (htmlLangMatch[1] !== 'en' && htmlLangMatch[1] !== 'en-US') {
    violations.push(`<html lang="${htmlLangMatch[1]}">; expected "en" or "en-US" (VAL-SEO-004)`);
  }
  const ogLocaleMatch = html.match(/<meta[^>]*property="og:locale"[^>]*content="([^"]*)"/i);
  if (!ogLocaleMatch) {
    violations.push('missing og:locale (VAL-SEO-004)');
  } else if (ogLocaleMatch[1] !== 'en_US') {
    violations.push(`og:locale is "${ogLocaleMatch[1]}"; expected "en_US" (VAL-SEO-004)`);
  }
  return violations;
}

// --- VAL-SEO-009: RSS feed link on indexable pages ---
function rssLinkViolations(html, route) {
  if (NOINDEX_ROUTES.has(route)) return [];
  // The RSS <link> is in the static shell (index.html) with attributes in
  // any order (rel, type, title, href). Match flexibly across newlines.
  const rssMatch = html.match(/<link\s+[^>]*rel="alternate"[^>]*type="application\/rss\+xml"[^>]*>/i);
  if (!rssMatch) {
    return ['missing RSS <link rel="alternate" type="application/rss+xml"> (VAL-SEO-009)'];
  }
  return [];
}

// --- VAL-SEO-011: content images have descriptive alt or decorative marker ---
function imageAltViolations(html) {
  const violations = [];
  // Skip images inside <script> blocks (JSON-LD can contain <img> in strings).
  // We look at <img> tags in the body, excluding those inside JSON-LD scripts.
  const bodyStart = html.search(/<body/i);
  const bodyHtml = bodyStart !== -1 ? html.slice(bodyStart) : html;
  const imgMatches = [...bodyHtml.matchAll(/<img\s+([^>]*)>/gi)];
  for (const m of imgMatches) {
    const attrs = m[1];
    const altMatch = attrs.match(/alt="([^"]*)"/i);
    const alt = altMatch ? altMatch[1] : null;
    if (alt === null) {
      violations.push('<img> missing alt attribute (VAL-SEO-011)');
    } else if (alt === '') {
      // Decorative image — must have role="presentation" or aria-hidden="true"
      const hasPresentation = /role="presentation"/i.test(attrs);
      const hasAriaHidden = /aria-hidden="true"/i.test(attrs);
      if (!hasPresentation && !hasAriaHidden) {
        violations.push('<img> with empty alt lacks role="presentation" or aria-hidden="true" (VAL-SEO-011)');
      }
    }
  }
  return violations;
}

// --- VAL-SEO-007: og:type must be "website" for static (non-article) routes ---
// Blog posts (og:type=article) are not in STATIC_ROUTES, so every route the
// validator checks must emit og:type=website. Catches the prior /about (profile),
// /beyond-the-assessment (book), and /blog (article) misconfigurations.
function ogTypeViolations(html) {
  const violations = [];
  const m = html.match(/<meta[^>]*property="og:type"[^>]*content="([^"]*)"/i);
  if (m && m[1] !== 'website') {
    violations.push(`og:type is "${m[1]}"; expected "website" for a non-article route (VAL-SEO-007)`);
  }
  return violations;
}

// --- VAL-SD-010: JSON-LD primary image must match og:image ---
// For routes without a page-specific schema image (Article, PodcastSeries),
// the Person.image is primary and must equal the og:image URL. This check
// compares the Person node's image against the og:image meta tag.
function schemaImageMatchViolations(html) {
  const violations = [];
  const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i);
  if (!ogMatch) return violations; // missing og:image is flagged elsewhere
  const ogImage = ogMatch[1];
  const graph = graphFromHtml(html);
  if (graph.length === 0) return violations;
  const person = graph.find((n) => n['@type'] === 'Person');
  if (person && person.image && person.image !== ogImage) {
    violations.push(`Person.image (${person.image}) does not match og:image (${ogImage}) (VAL-SD-010)`);
  }
  return violations;
}

export function seoMetaViolations(html, route) {
  const OG_TAGS = ['og:title', 'og:description', 'og:type', 'og:url', 'og:image', 'og:image:alt'];
  const TWITTER_TAGS = [
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image',
    'twitter:creator',
    'twitter:site',
  ];

  return [
    ...titleViolations(html),
    ...descriptionViolations(html),
    ...h1Violations(html),
    ...metaTagViolations(html, OG_TAGS, 'property', 'VAL-SEO-007'),
    ...metaTagViolations(html, TWITTER_TAGS, 'name', 'VAL-SEO-008'),
    ...twitterCardViolations(html),
    ...ogTypeViolations(html),
    ...robotsMetaViolations(html, route),
    ...hreflangAndLocaleViolations(html),
    ...rssLinkViolations(html, route),
    ...imageAltViolations(html),
    ...schemaImageMatchViolations(html),
  ];
}

function validateRoute(route) {
  const file = fileForRoute(route);
  if (!existsSync(file)) {
    return { route, degraded: true, violations: [] };
  }
  const html = readFileSync(file, 'utf-8');
  const violations = [];

  // --- JSON-LD ---
  const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (ldMatches.length !== 1) {
    violations.push(`expected exactly 1 JSON-LD block, found ${ldMatches.length}`);
  } else {
    try {
      const graph = JSON.parse(ldMatches[0][1]);
      if (graph['@context'] !== 'https://schema.org') {
        violations.push('JSON-LD @context is not https://schema.org');
      }
      if (!Array.isArray(graph['@graph']) || graph['@graph'].length === 0) {
        violations.push('JSON-LD has no non-empty @graph array');
      }
    } catch (err) {
      violations.push(`JSON-LD is not valid JSON: ${err && err.message}`);
    }
  }

  // --- canonical ---
  const canonMatches = [...html.matchAll(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/g)];
  if (canonMatches.length !== 1) {
    violations.push(`expected exactly 1 canonical link, found ${canonMatches.length}`);
  } else {
    const expected = `${SITE_URL}${route === '/' ? '' : route}`;
    if (!sameUrl(canonMatches[0][1], expected)) {
      violations.push(`canonical ${canonMatches[0][1]} != expected ${expected}`);
    }
  }

  // --- og:image (only validate same-origin generated cards) ---
  const og = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
  if (!og) {
    violations.push('missing og:image');
  } else {
    const ogUrl = og[1];
    if (ogUrl.startsWith(`${SITE_URL}/og/`)) {
      const rel = ogUrl.slice(SITE_URL.length); // /og/<slug>.png
      if (!existsSync(join(DIST, rel))) {
        violations.push(`og:image ${rel} does not exist in dist/`);
      }
    }
  }

  // --- og:image:alt (VAL-SEO-007) ---
  const ogAlt = html.match(/<meta[^>]*property="og:image:alt"[^>]*content="([^"]+)"/);
  if (!ogAlt) {
    violations.push('missing og:image:alt (VAL-SEO-007)');
  } else if (!ogAlt[1].trim()) {
    violations.push('og:image:alt is empty (VAL-SEO-007)');
  }

  // --- Expanded SEO meta assertions (VAL-SEO-001/004/006/007/008/009/010/011) ---
  violations.push(...seoMetaViolations(html, route));

  // --- AEO assertions (VAL-AEO-001/002/004/005) ---
  violations.push(...aeoViolations(html, route));

  // --- Schema assertions (VAL-SD-003..007, VAL-SD-009) ---
  violations.push(...schemaViolations(html, route));

  return { route, degraded: false, violations };
}

function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.warn('[seo-gate] dist/index.html not found — skipping (run the build first). Non-fatal.');
    process.exit(0);
  }

  const results = STATIC_ROUTES.map(validateRoute);
  const degraded = results.filter((r) => r.degraded).map((r) => r.route);
  const withViolations = results.filter((r) => r.violations.length > 0);
  const totalViolations = withViolations.reduce((n, r) => n + r.violations.length, 0);

  // --- Cross-route uniqueness: titles (VAL-SEO-006) ---
  // Filter out the invariant shell title so we compare per-page titles only.
  // SHELL_TITLE is the module-level constant shared with titleViolations().
  const titleMap = new Map(); // title -> [routes]
  for (const r of results) {
    if (r.degraded) continue;
    const file = fileForRoute(r.route);
    const html = readFileSync(file, 'utf-8');
    const tm = html.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    if (tm) {
      const title = decodeEntities(tm[1].trim());
      if (title === SHELL_TITLE) continue; // skip the invariant shell title
      if (!titleMap.has(title)) titleMap.set(title, []);
      titleMap.get(title).push(r.route);
    }
  }
  const duplicateTitles = [];
  for (const [title, routes] of titleMap) {
    if (routes.length > 1) {
      duplicateTitles.push({ title: title.slice(0, 60), routes });
    }
  }

  // --- Cross-route uniqueness: descriptions (VAL-SEO-006) ---
  const descMap = new Map(); // desc -> [routes]
  for (const r of results) {
    if (r.degraded) continue;
    const file = fileForRoute(r.route);
    const html = readFileSync(file, 'utf-8');
    const dm = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    if (dm) {
      const desc = decodeEntities(dm[1].trim());
      if (!descMap.has(desc)) descMap.set(desc, []);
      descMap.get(desc).push(r.route);
    }
  }
  const duplicateDescs = [];
  for (const [desc, routes] of descMap) {
    if (routes.length > 1) {
      duplicateDescs.push({ desc: desc.slice(0, 60), routes });
    }
  }

  // --- VAL-SEO-009 / VAL-CROSS-005: RSS items match sitemap blog set ---
  let rssViolation = null;
  const rssFile = join(DIST, 'rss.xml');
  const sitemapFile = join(DIST, 'sitemap.xml');
  if (existsSync(rssFile) && existsSync(sitemapFile)) {
    try {
      const rssXml = readFileSync(rssFile, 'utf-8');
      const sitemapXml = readFileSync(sitemapFile, 'utf-8');
      // Extract blog slugs from RSS items
      const rssLinks = [...rssXml.matchAll(/<link>([^<]+)<\/link>/g)].map((m) => m[1].trim());
      const rssBlogSlugs = new Set(
        rssLinks
          .filter((l) => l.includes('/blog/'))
          .map((l) => l.replace(/^https?:\/\/[^/]+\/blog\//, '').replace(/\/$/, '')),
      );
      // Extract blog slugs from sitemap
      const sitemapLocs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
      const sitemapBlogSlugs = new Set(
        sitemapLocs
          .filter((l) => l.includes('/blog/'))
          .map((l) => l.replace(/^https?:\/\/[^/]+\/blog\//, '').replace(/\/$/, '')),
      );
      // Check set equality (RSS items should match the sitemap blog set)
      const inRssNotSitemap = [...rssBlogSlugs].filter((s) => !sitemapBlogSlugs.has(s));
      const inSitemapNotRss = [...sitemapBlogSlugs].filter((s) => !rssBlogSlugs.has(s));
      if (inRssNotSitemap.length > 0 || inSitemapNotRss.length > 0) {
        rssViolation = `RSS/sitemap blog set mismatch: in RSS not sitemap: [${inRssNotSitemap.join(', ')}]; in sitemap not RSS: [${inSitemapNotRss.join(', ')}]`;
      }
    } catch {
      // Non-fatal — RSS/sitemap consistency check is best-effort
    }
  }

  console.log(
    `[seo-gate] ${STATIC_ROUTES.length} static routes checked; ` +
      `${totalViolations} violation(s); ${degraded.length} degraded to CSR` +
      (degraded.length ? `: ${degraded.join(', ')}` : ''),
  );
  for (const r of withViolations) {
    for (const v of r.violations) console.error(`  [seo-gate] ${r.route}: ${v}`);
  }
  for (const dup of duplicateTitles) {
    console.error(`  [seo-gate] DUPLICATE TITLE "${dup.title}" on: ${dup.routes.join(', ')} (VAL-SEO-006)`);
  }
  for (const dup of duplicateDescs) {
    console.error(`  [seo-gate] DUPLICATE DESCRIPTION "${dup.desc}" on: ${dup.routes.join(', ')} (VAL-SEO-006)`);
  }
  if (rssViolation) {
    console.error(`  [seo-gate] ${rssViolation} (VAL-SEO-009)`);
  }

  const crossRouteViolations = duplicateTitles.length + duplicateDescs.length + (rssViolation ? 1 : 0);
  const strict = process.env.STRICT_PRERENDER === 'true' || process.env.STRICT_SEO_VALIDATION === 'true';
  if (strict && (totalViolations > 0 || crossRouteViolations > 0)) {
    console.error(
      `[seo-gate] STRICT mode: exiting 1 due to ${totalViolations + crossRouteViolations} SEO violation(s) in prerendered HTML.`,
    );
    process.exit(1);
  }
  // Default: strictly non-fatal so a broken prerender/validation never blocks the deploy.
  process.exit(0);
}

// Only run main() when executed directly (not when imported by the test suite).
// The test suite imports `aeoViolations` and should not trigger the dist scan.
const isDirectInvocation = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectInvocation) {
  main();
}
