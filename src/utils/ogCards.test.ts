import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { OG_CARD_PATHS, slugForOgPath, ogImageForUrl } from './ogCards';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * OG-card drift detector. Three files must agree on the route set:
 *   - scripts/generate-og-images.mjs  (OG_CARDS: renders /og/<slug>.png)
 *   - src/utils/ogCards.ts            (OG_CARD_PATHS: what SEO.tsx points og:image at)
 *   - scripts/generate-sitemap.js     (STATIC_ROUTES: the indexable routes)
 * If they drift, SEO references a card that was never generated (broken image) or
 * a card is generated but never referenced (orphan). We parse the build scripts as
 * TEXT — same idiom as routes.test.ts / the Lambda validation-drift test — to avoid
 * importing build-only ESM (and its satori/sharp deps) into a jsdom test.
 */
function readGeneratorCardPaths(): string[] {
  const src = readFileSync(resolve(HERE, '../../scripts/generate-og-images.mjs'), 'utf-8');
  const block = src.match(/export const OG_CARDS = \{([\s\S]*?)\n\};/);
  if (!block) throw new Error('Could not locate the OG_CARDS map in scripts/generate-og-images.mjs');
  const paths = new Set<string>();
  // Match only keys that introduce a card object. Two shapes exist: rendered
  // cards ('<path>': { eyebrow: ... }) and committed passthrough assets
  // ('<path>': { asset: ... }, e.g. the photographic home card).
  const re = /'([^']+)':\s*\{\s*(?:eyebrow|asset):/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block[1]))) paths.add(m[1]);
  return [...paths];
}

function readSitemapStaticPaths(): string[] {
  const src = readFileSync(resolve(HERE, '../../scripts/generate-sitemap.js'), 'utf-8');
  const block = src.match(/const staticPages = \[([\s\S]*?)\];/);
  if (!block) throw new Error('Could not locate staticPages in scripts/generate-sitemap.js');
  const paths = new Set<string>();
  const re = /url:\s*'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block[1]))) paths.add(m[1]);
  return [...paths];
}

describe('OG cards — drift detector', () => {
  it('generator OG_CARDS keys exactly match the frontend OG_CARD_PATHS', () => {
    const generated = readGeneratorCardPaths().sort();
    const referenced = [...OG_CARD_PATHS].sort();
    expect(generated).toEqual(referenced);
  });

  it('every OG card route is a real indexable route (no orphan cards)', () => {
    const indexable = new Set(readSitemapStaticPaths());
    for (const path of OG_CARD_PATHS) {
      expect(indexable.has(path), `${path} has an OG card but is not an indexable route`).toBe(true);
    }
  });
});

describe('slugForOgPath', () => {
  it('maps / to home-hero (the committed photographic card)', () => expect(slugForOgPath('/')).toBe('home-hero'));
  it('strips the leading slash', () => expect(slugForOgPath('/aws')).toBe('aws'));
  it('maps the two photographic sub-page cards to their -hero slugs', () => {
    expect(slugForOgPath('/podcast')).toBe('podcast-hero');
    expect(slugForOgPath('/beyond-the-assessment')).toBe('beyond-the-assessment-hero');
  });
  // The override above consumed the only multi-word route in the table, so the
  // general rule is pinned on an unmapped path: hyphens survive, slashes fold.
  it('keeps multi-word slugs intact for unmapped paths', () => {
    expect(slugForOgPath('/some-multi-word')).toBe('some-multi-word');
    expect(slugForOgPath('/a/b')).toBe('a-b');
  });
});

describe('ogImageForUrl', () => {
  const SITE = 'https://thechrisgrey.com';

  it('returns the per-route card for a known route', () => {
    expect(ogImageForUrl(`${SITE}/aws`)).toBe(`${SITE}/og/aws.png`);
  });
  it('normalizes a trailing slash (Amplify serves /aws/)', () => {
    expect(ogImageForUrl(`${SITE}/aws/`)).toBe(`${SITE}/og/aws.png`);
  });
  it('maps the root url (no path) to the home card', () => {
    expect(ogImageForUrl(SITE)).toBe(`${SITE}/og/home-hero.png`);
    expect(ogImageForUrl(`${SITE}/`)).toBe(`${SITE}/og/home-hero.png`);
  });
  it('falls back to /og.png for routes without a card (e.g. a blog post)', () => {
    expect(ogImageForUrl(`${SITE}/blog/some-post`)).toBe(`${SITE}/og.png`);
  });
  it('falls back to /og.png for undefined or invalid urls', () => {
    expect(ogImageForUrl(undefined)).toBe(`${SITE}/og.png`);
    expect(ogImageForUrl('not a url')).toBe(`${SITE}/og.png`);
  });
});
