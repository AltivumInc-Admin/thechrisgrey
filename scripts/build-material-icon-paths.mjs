#!/usr/bin/env node
/**
 * Convert the SVG path JSON emitted by scripts/extract-material-icons-svg.py
 * into the committed TypeScript module
 * `src/components/icons/materialIconPaths.ts` (VAL-PERF-006/007).
 *
 * Rounds path coordinates to 1 decimal (sub-pixel at the 24px render size) and
 * strips redundant whitespace to minimize the bundled size of the inline-SVG
 * icon path map.
 *
 * Usage:
 *   node scripts/build-material-icon-paths.mjs <input.json>
 * (defaults to /tmp/material-icons-svg.json when no argument is given)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INPUT = process.argv[2] || '/tmp/material-icons-svg.json';
const OUTPUT = join(ROOT, 'src', 'components', 'icons', 'materialIconPaths.ts');

function optimizePath(p) {
  return p
    .replace(/(-?\d*\.?\d+(?:[eE][+-]?\d+)?)/g, (x) => {
      const n = parseFloat(x);
      if (Math.abs(n) >= 1000) return x;
      return String(Math.round(n * 10) / 10);
    })
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/([A-Za-z])(-?[\d.])/g, '$1$2');
}

async function main() {
  const data = JSON.parse(await readFile(INPUT, 'utf8'));
  const out = {};
  for (const [name, v] of Object.entries(data)) {
    out[name] = optimizePath(v.path);
  }
  const names = Object.keys(out).sort();

  let s = '// AUTO-GENERATED. Do not edit by hand.\n';
  s += '// Regenerate with: node scripts/scan-material-icons.mjs && \\\n';
  s += '//   python3 scripts/extract-material-icons-svg.py <MaterialIcons-Regular.ttf> \\\n';
  s += '//     <MaterialIcons-Regular.codepoints> scripts/material-icons-used.json \\\n';
  s += '//     /tmp/material-icons-svg.json \\\n';
  s += '// then run node scripts/build-material-icon-paths.mjs to write this file.\n';
  s += '//\n';
  s += '// SVG path data for the Material Icons used by thechrisgrey.com, extracted\n';
  s += '// from the classic Material Icons font (24x24 viewBox) so the site no longer\n';
  s += '// fetches the render-blocking Google Fonts stylesheet (VAL-PERF-006/007).\n';
  s += '// Coordinates rounded to 1 decimal (sub-pixel at render size).\n';
  s += 'export const MATERIAL_ICON_PATHS = {\n';
  for (const name of names) {
    s += `  ${JSON.stringify(name)}: ${JSON.stringify(out[name])},\n`;
  }
  s += '} as const;\n\n';
  s += 'export type MaterialIconName = keyof typeof MATERIAL_ICON_PATHS;\n';

  await writeFile(OUTPUT, s);
  console.log(`Wrote ${OUTPUT} — ${names.length} icons`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
