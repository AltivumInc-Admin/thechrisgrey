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
 */
export function aeoViolations(html, route) {
  const violations = [];
  if (!CONTENT_ROUTES.has(route)) return violations;

  // --- VAL-AEO-001 / VAL-AEO-002: direct-answer summary before the first H2 ---
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

  // --- VAL-AEO-005: every H2/H3 has a non-empty slug-form id ---
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

  // --- VAL-AEO-004: FAQ content visible in DOM and matches JSON-LD ---
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

  // --- AEO assertions (VAL-AEO-001/002/004/005) ---
  violations.push(...aeoViolations(html, route));

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

  console.log(
    `[seo-gate] ${STATIC_ROUTES.length} static routes checked; ` +
      `${totalViolations} violation(s); ${degraded.length} degraded to CSR` +
      (degraded.length ? `: ${degraded.join(', ')}` : ''),
  );
  for (const r of withViolations) {
    for (const v of r.violations) console.error(`  [seo-gate] ${r.route}: ${v}`);
  }

  const strict = process.env.STRICT_PRERENDER === 'true' || process.env.STRICT_SEO_VALIDATION === 'true';
  if (strict && totalViolations > 0) {
    console.error(`[seo-gate] STRICT mode: exiting 1 due to ${totalViolations} SEO violation(s) in prerendered HTML.`);
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
