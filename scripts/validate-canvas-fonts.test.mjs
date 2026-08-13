import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const srcDir = join(repoRoot, 'src');
const publicDir = join(repoRoot, 'public');

/**
 * Guards in-canvas 3D text against silently falling back to a third-party CDN.
 *
 * drei's <Text> is troika-three-text. It does NOT use CSS @font-face — it parses
 * font files itself, in a worker, and fetches them over the network. When no
 * `font` prop is given it resolves one at runtime from
 *   https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data
 * That origin is not in the site's connect-src allowlist, so under the enforced
 * CSP every label rendered as nothing while the rest of the scene animated
 * normally. Nothing failed loudly: no error boundary fired, no test went red, and
 * the only signal was a CSP violation line in the console.
 *
 * These assertions are deliberately a NEGATIVE oracle. The security-header tests
 * can only confirm that a token someone already thought of is present; they
 * cannot discover a newly-introduced requirement. This scans the source for the
 * pattern that CREATES the requirement, so adding a <Text> without a local font
 * fails here rather than in production.
 */

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Strip comments before scanning. Prose in a doc comment can mention `<Text>`,
 * and counting that as a real usage produces a false failure — which is exactly
 * what happened the first time this guard ran, against the comment explaining
 * the very bug it guards. The `[^:]` lookbehind on line comments keeps `https://`
 * inside string literals intact.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Extract each `<Text ...>` opening tag, tracking brace depth so a `>` inside a
 * JSX expression (e.g. `visible={n > 1}`) doesn't terminate the tag early.
 */
function extractTextTags(rawSource) {
  const source = stripComments(rawSource);
  const tags = [];
  const re = /<Text[\s/>]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    let depth = 0;
    for (let i = m.index; i < source.length; i++) {
      const ch = source[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) {
        tags.push(source.slice(m.index, i + 1));
        break;
      }
    }
  }
  return tags;
}

const filesUsingDreiText = walk(srcDir).filter((file) => {
  const src = readFileSync(file, 'utf8');
  return /import\s*\{[^}]*\bText\b[^}]*\}\s*from\s*['"]@react-three\/drei['"]/.test(src);
});

describe('in-canvas 3D text (troika / drei <Text>)', () => {
  it('finds the files that render drei <Text> (guard is not vacuously passing)', () => {
    // If drei <Text> is ever removed entirely this can legitimately become empty,
    // but an accidental zero would make every assertion below trivially true.
    expect(
      filesUsingDreiText.length,
      'no files import Text from @react-three/drei — if that is intentional, delete this spec rather than letting it pass on nothing',
    ).toBeGreaterThan(0);
  });

  describe.each(filesUsingDreiText.map((f) => [relative(repoRoot, f), f]))('%s', (rel, file) => {
    const source = readFileSync(file, 'utf8');
    const tags = extractTextTags(source);

    it('every <Text> passes an explicit font prop', () => {
      expect(tags.length, `expected at least one <Text> in ${rel}`).toBeGreaterThan(0);
      for (const tag of tags) {
        expect(
          /\bfont=/.test(tag),
          `a <Text> in ${rel} has no font prop, so troika resolves one from cdn.jsdelivr.net at runtime — ` +
            'blocked by connect-src, which renders the label as nothing. Pass a local font path.',
        ).toBe(true);
      }
    });

    it('every referenced font is self-hosted, present, and a format troika can parse', () => {
      // Collect both inline literals (font="/fonts/x.woff") and constants
      // (font={LABEL_FONT} -> const LABEL_FONT = '/fonts/x.woff').
      const paths = new Set();
      for (const tag of tags) {
        const literal = tag.match(/\bfont=["']([^"']+)["']/);
        if (literal) paths.add(literal[1]);
        const ref = tag.match(/\bfont=\{([A-Za-z_$][\w$]*)\}/);
        if (ref) {
          const decl = source.match(new RegExp(`\\b${ref[1]}\\s*=\\s*["']([^"']+)["']`));
          expect(decl, `could not resolve font constant ${ref[1]} in ${rel} to a string literal`).toBeTruthy();
          paths.add(decl[1]);
        }
      }

      expect(paths.size, `no font paths resolved in ${rel}`).toBeGreaterThan(0);

      for (const p of paths) {
        expect(p.startsWith('/'), `font ${p} in ${rel} must be a same-origin absolute path, not a remote URL`).toBe(
          true,
        );
        expect(/^https?:/.test(p), `font ${p} in ${rel} must not be a remote URL`).toBe(false);

        const onDisk = join(publicDir, p.replace(/^\//, ''));
        expect(existsSync(onDisk), `font ${p} referenced in ${rel} does not exist at public${p}`).toBe(true);

        // troika parses fonts with Typr: .ttf, .otf and .woff only. .woff2 is NOT
        // supported and fails at parse time, after the fetch succeeds.
        expect(/\.(woff|ttf|otf)$/.test(p), `font ${p} must be .woff, .ttf or .otf — troika cannot parse .woff2`).toBe(
          true,
        );

        const magic = readFileSync(onDisk).subarray(0, 4).toString('ascii');
        expect(
          magic,
          `font ${p} is actually woff2 (magic wOF2) despite its extension — troika cannot parse it`,
        ).not.toBe('wOF2');
      }
    });
  });

  it('bundled fonts ship their license alongside them', () => {
    // Manrope is SIL OFL 1.1, which requires the license accompany the font.
    const fontsDir = join(publicDir, 'fonts');
    if (!existsSync(fontsDir)) return;
    const files = readdirSync(fontsDir);
    const fonts = files.filter((f) => /\.(woff|ttf|otf)$/.test(f));
    if (fonts.length === 0) return;
    expect(
      files.some((f) => /LICENSE/i.test(f)),
      'public/fonts contains font binaries but no LICENSE file — SIL OFL requires the license accompany the font',
    ).toBe(true);
  });
});
