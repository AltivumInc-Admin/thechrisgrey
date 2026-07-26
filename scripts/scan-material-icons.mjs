#!/usr/bin/env node
/**
 * Scan the source tree for every Material Icons glyph name the app could pass
 * to <Icon name={...} />, so the inline-SVG path map covers exactly that set
 * (VAL-PERF-006/007).
 *
 * The site uses an inline-SVG `<Icon name="..." />` component. `name` can be:
 *   - a static literal: `<Icon name="cloud_off" />`
 *   - a JSX expression: `name={topic.icon}`, `name={kindIcon[kind] ?? 'auto_awesome'}`,
 *     `name={copied ? 'check' : 'link'}`
 *
 * The icon names reach <Icon> through a few shapes, all covered below:
 *   1. `<Icon name="literal" ...>` (static)
 *   2. string literals inside `name={...}` expressions (ternary branches,
 *      `?? 'fallback'`, member-access fallbacks)
 *   3. `icon: 'literal'` object fields (data arrays: credentials, contact
 *      topics, blueprint highlights, CapabilityIntro, PortableText callouts)
 *   4. `icon="literal"` / `icon='literal'` JSX attributes (IconButton, ToolDraftCard)
 *   5. string values in `*Icon*`-named Record/object maps (e.g. kindIcon)
 *
 * Output: `scripts/material-icons-used.json` (sorted JSON array) + stdout list.
 * The extractor intersects this with the Material Icons codepoint map, so any
 * non-icon string that slips through is dropped at path-generation time.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function uniq(arr) {
  return [...new Set(arr)].filter(Boolean).sort();
}

const NAME = /^[a-z][a-z0-9_]+$/;

function extractStringLiterals(text) {
  const out = new Set();
  const re = /['"]([a-z][a-z0-9_]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) if (NAME.test(m[1])) out.add(m[1]);
  return out;
}

function extractIcons(text) {
  const names = new Set();

  // 1. <Icon name="literal" ...>
  const staticNameRe = /<Icon\s+name="([a-z][a-z0-9_]+)"/g;
  let m;
  while ((m = staticNameRe.exec(text)) !== null) names.add(m[1]);

  // 2. string literals inside name={...} expressions. Capture the expression
  //    body up to the matching `}` (naive: up to the next `}` on the same or
  //    following lines, which is fine for our usage) and pull its literals.
  const dynNameRe = /<Icon\s[^>]*name=\{([^}]*)\}/g;
  while ((m = dynNameRe.exec(text)) !== null) {
    for (const lit of extractStringLiterals(m[1])) names.add(lit);
  }

  // 3. icon: 'literal' object fields
  const iconFieldRe = /\bicon:\s*['"]([a-z][a-z0-9_]+)['"]/g;
  while ((m = iconFieldRe.exec(text)) !== null) names.add(m[1]);

  // 4. icon="literal" / icon='literal' JSX attributes
  const iconAttrRe = /\bicon\s*=\s*['"]([a-z][a-z0-9_]+)['"]/g;
  while ((m = iconAttrRe.exec(text)) !== null) names.add(m[1]);

  // 5. string values in *Icon* / *icon*-named Record/object maps, e.g.
  //    `const kindIcon: Record<string, string> = { skill: 'stars', ... }`.
  //    Match the object body following such a declaration.
  const mapRe = /\b(?:const|let|var)\s+(\w*[Ii]con\w*)\b[^={]*=\s*\{([^}]*)\}/g;
  while ((m = mapRe.exec(text)) !== null) {
    for (const lit of extractStringLiterals(m[2])) names.add(lit);
  }

  return names;
}

async function main() {
  const files = await walk(SRC);
  const all = new Set();
  for (const f of files) {
    if (f.endsWith('materialIconPaths.ts')) continue;
    const text = await readFile(f, 'utf8');
    for (const name of extractIcons(text)) all.add(name);
  }

  const sorted = uniq([...all]);
  const outPath = join(__dirname, 'material-icons-used.json');
  await writeFile(outPath, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`Found ${sorted.length} candidate icon names in src/`);
  console.log(sorted.join('\n'));
  console.log(`\nWrote ${outPath}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('scan-material-icons.mjs')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { extractIcons };
