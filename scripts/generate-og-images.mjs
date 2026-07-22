/**
 * Build-time Open Graph image generator (site-audit rec #5).
 *
 * Renders a branded 1200x630 social-share card per route into dist/og/<slug>.png,
 * so every shared link unfurls with a distinct, on-brand card instead of one
 * generic image. Runs AFTER `vite build` (dist/ must exist), BEFORE prerender so
 * the files are present when the crawl serializes each route's <meta og:image>.
 *
 * Pipeline: satori renders the card to SVG with glyphs embedded as vector PATHS
 * (so no font is needed at raster time), then sharp rasterizes SVG -> PNG. sharp
 * is already a dependency (vite-plugin-image-optimizer); only satori is new.
 *
 * Design: "editorial wordmark" — dark altivum palette, gold accent, no photo.
 * gold uppercase eyebrow (category) -> large light-weight title -> gold rule;
 * name + role and the domain along the bottom. No emojis (project rule).
 *
 * SAFETY: like prerender, this step is best-effort. main() catches everything and
 * exits 0 so a generation failure degrades to the shared /og.png fallback rather
 * than breaking the "&&"-chained build / Amplify deploy.
 *
 * The card copy lives in OG_CARDS keyed by route path. The frontend derives the
 * matching `/og/<slug>.png` URL from the same path set via src/utils/ogCards.ts;
 * a drift test keeps the two in sync.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { realpathSync } from 'fs';
import satori from 'satori';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, 'og-assets');
const DIST_OG = resolve(__dirname, '../dist/og');

const fontLight = readFileSync(join(ASSETS, 'Barlow-Light.ttf'));
const fontSemi = readFileSync(join(ASSETS, 'Barlow-SemiBold.ttf'));

const SITE = 'thechrisgrey.com';

// Palette (mirrors the @theme block in src/index.css).
const C = {
  dark: '#0A0F1C',
  gradMid: '#0d1526',
  gradEnd: '#16223e',
  gold: '#C5A572',
  silver: '#9BA6B8',
  text: '#F5F7FA',
  white: '#FFFFFF',
};

// Per-route card copy. eyebrow = uppercase category; title = a punchy headline
// (NOT the raw SEO <title>). Keyed by route path; the slug is derived below.
// Keep this set in sync with src/utils/ogCards.ts (drift test enforces it).
export const OG_CARDS = {
  '/': { eyebrow: 'CHRISTIAN PEREZ', title: 'Founder. Green Beret. Builder.' },
  '/about': { eyebrow: 'ABOUT', title: 'From Special Forces medic to AI engineer.' },
  '/altivum': { eyebrow: 'ALTIVUM INC', title: 'Mission-driven technology, built to serve.' },
  '/foundation': { eyebrow: 'THE ALTIVUM FOUNDATION', title: 'Veteran scholarships in cloud, AI & robotics.' },
  '/podcast': { eyebrow: 'THE VECTOR PODCAST', title: 'Conversations on service, leadership & technology.' },
  '/beyond-the-assessment': {
    eyebrow: 'BEYOND THE ASSESSMENT',
    title: 'What it really takes to earn the Green Beret.',
  },
  '/aws': { eyebrow: 'AMAZON WEB SERVICES', title: 'AWS Community Builder in AI Engineering.' },
  '/claude': { eyebrow: 'CLAUDE', title: 'Applied AI engineering with Anthropic’s Claude.' },
  '/blog': { eyebrow: 'BLOG', title: 'Field notes on AI, cloud, and leadership.' },
  '/links': { eyebrow: 'LINKS', title: 'Find me across the web.' },
  '/contact': { eyebrow: 'CONTACT & SPEAKING', title: 'Work with me — or book me to speak.' },
  '/privacy': { eyebrow: 'PRIVACY', title: 'How thechrisgrey.com handles your data.' },
};

/** Route path -> output slug. '/' -> 'home'; '/aws' -> 'aws'. */
export function slugForPath(path) {
  if (path === '/') return 'home';
  return path.replace(/^\//, '').replace(/\//g, '-');
}

// --- satori VDOM (plain objects; no JSX needed in a .mjs build script) --------
const el = (type, style, children) => ({ type, props: { style, ...(children !== undefined ? { children } : {}) } });

function card({ eyebrow, title }) {
  return el(
    'div',
    {
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '80px 84px',
      backgroundColor: C.dark,
      backgroundImage: `linear-gradient(135deg, ${C.dark} 0%, ${C.gradMid} 55%, ${C.gradEnd} 100%)`,
      fontFamily: 'Barlow',
      color: C.text,
    },
    [
      // Top: eyebrow -> title -> gold rule
      el('div', { display: 'flex', flexDirection: 'column' }, [
        el('div', { fontSize: '26px', fontWeight: 600, letterSpacing: '5px', color: C.gold }, eyebrow),
        el(
          'div',
          { fontSize: '72px', fontWeight: 300, lineHeight: 1.12, marginTop: '30px', maxWidth: '1000px', color: C.text },
          title,
        ),
        el('div', { width: '96px', height: '3px', backgroundColor: C.gold, marginTop: '38px' }),
      ]),
      // Bottom: name + role (left), domain (right)
      el('div', { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, [
        el('div', { display: 'flex', flexDirection: 'column' }, [
          el('div', { fontSize: '33px', fontWeight: 600, color: C.white }, 'Christian Perez'),
          el(
            'div',
            { fontSize: '23px', fontWeight: 300, color: C.silver, marginTop: '6px' },
            'Founder & CEO, Altivum Inc  ·  Former Green Beret',
          ),
        ]),
        el('div', { fontSize: '24px', fontWeight: 600, color: C.gold }, SITE),
      ]),
    ],
  );
}

export async function renderCard(content) {
  const svg = await satori(card(content), {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Barlow', data: fontLight, weight: 300, style: 'normal' },
      { name: 'Barlow', data: fontSemi, weight: 600, style: 'normal' },
    ],
  });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

async function generateAll() {
  mkdirSync(DIST_OG, { recursive: true });
  let ok = 0;
  for (const [path, content] of Object.entries(OG_CARDS)) {
    const slug = slugForPath(path);
    const png = await renderCard(content);
    writeFileSync(join(DIST_OG, `${slug}.png`), png);
    ok += 1;
    console.log(`  [og] ok ${path} -> dist/og/${slug}.png (${Math.round(png.length / 1024)}KB)`);
  }
  console.log(`[og] Generated ${ok} OG cards.`);
}

// `--sample <routePath> <outFile>` renders a single card anywhere (used to
// preview the design without a full build). Otherwise generates all into dist/og.
async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--sample') {
    const [, routePath, outFile] = args;
    const content = OG_CARDS[routePath] || OG_CARDS['/'];
    const png = await renderCard(content);
    writeFileSync(outFile, png);
    console.log(`[og] sample ${routePath} -> ${outFile} (${Math.round(png.length / 1024)}KB)`);
    return;
  }
  await generateAll();
}

// Run only when invoked directly (so the exports can be imported by a test).
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (invokedDirectly) {
  main().catch((err) => {
    // Best-effort: never break the build. Degrades to the shared /og.png fallback.
    console.warn(
      '[og] WARN OG image generation failed — falling back to /og.png:',
      err && err.message ? err.message : err,
    );
    process.exit(0);
  });
}
