#!/usr/bin/env node

/**
 * Frontend bundle size tracker + budget enforcer.
 *
 * Scans the built `dist/assets` output, measures raw and gzipped size for every
 * emitted JS/CSS chunk, aggregates the named code-split groups from
 * `vite.config.ts`, and checks them against the committed budgets in
 * `bundle-size-budgets.json`. This is the size/heavy-dependency guard for the
 * bundled frontend: a dependency that bloats a chunk past its budget fails the
 * check, and the CI job reports per-chunk deltas vs the previous run.
 *
 * The optional `assets` block in the budgets file covers unhashed binaries that
 * ship from the dist ROOT rather than dist/assets (public/alti.glb, ~1.1 MB, is
 * the largest single byte cost on the site). The chunk scan cannot see them:
 * they are neither under dist/assets nor .js/.css, so a model re-exported
 * without its meshopt/WebP compression would double the per-page transfer with
 * every budget still green. Each entry is `{ path (relative to dist/), maxBytes }`.
 *
 * Usage:
 *   node scripts/track-bundle-size.mjs                      # measure + budget check
 *   node scripts/track-bundle-size.mjs --output report.json # also write report
 *   node scripts/track-bundle-size.mjs --previous prev.json # report deltas
 *   node scripts/track-bundle-size.mjs --summary            # write $GITHUB_STEP_SUMMARY
 *
 * Run `npm run build` (or `vite build`) first so `dist/assets` exists. Exits
 * non-zero when any chunk or total exceeds its budget.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { gzipSync } from 'zlib';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(repoRoot, 'dist');
const DIST_ASSETS = join(DIST, 'assets');
const DEFAULT_BUDGETS_PATH = join(repoRoot, 'bundle-size-budgets.json');

function parseArgs() {
  const args = process.argv.slice(2);
  const valueOf = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
  };
  return {
    output: valueOf('--output'),
    previous: valueOf('--previous'),
    budgets: valueOf('--budgets') ?? DEFAULT_BUDGETS_PATH,
    summary: args.includes('--summary'),
  };
}

function readJson(path) {
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function measure() {
  if (!existsSync(DIST_ASSETS)) {
    console.error(`dist/assets not found at ${DIST_ASSETS}. Run \`npm run build\` (or \`vite build\`) first.`);
    process.exit(1);
  }
  const files = readdirSync(DIST_ASSETS).filter((f) => /\.(js|css)$/.test(f) && !f.endsWith('.map'));

  const perFile = [];
  let totalJsRaw = 0;
  let totalJsGzip = 0;
  let totalCssRaw = 0;
  let totalCssGzip = 0;

  for (const name of files) {
    const buf = readFileSync(join(DIST_ASSETS, name));
    const gzip = gzipSync(buf, { level: 9 }).length;
    const ext = name.endsWith('.css') ? 'css' : 'js';
    perFile.push({ name, ext, rawBytes: buf.length, gzipBytes: gzip });
    if (ext === 'css') {
      totalCssRaw += buf.length;
      totalCssGzip += gzip;
    } else {
      totalJsRaw += buf.length;
      totalJsGzip += gzip;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    fileCount: perFile.length,
    totalJs: { rawBytes: totalJsRaw, gzipBytes: totalJsGzip },
    totalCss: { rawBytes: totalCssRaw, gzipBytes: totalCssGzip },
    files: perFile,
  };
}

/**
 * Measure the non-JS/CSS assets named in the budgets file. Budgeted on RAW
 * bytes: these are already-compressed binaries (glb/webp/woff2), so their gzip
 * size is not what the ceiling is about.
 */
function measureAssets(budgets) {
  if (!budgets?.assets) return [];
  return Object.entries(budgets.assets).map(([label, def]) => {
    const rel = def.path ?? label;
    const file = join(DIST, rel);
    const missing = !existsSync(file);
    const rawBytes = missing ? 0 : statSync(file).size;
    const budgetBytes = typeof def.maxBytes === 'number' ? def.maxBytes : null;
    return {
      label,
      path: rel,
      rawBytes,
      budgetBytes,
      overBudget: budgetBytes !== null && rawBytes > budgetBytes,
      missing,
    };
  });
}

function aggregateChunks(report, budgets) {
  const chunks = [];
  if (!budgets?.chunks) return chunks;
  for (const [label, def] of Object.entries(budgets.chunks)) {
    const matched = report.files.filter((f) => f.ext === (def.ext ?? 'js') && f.name.startsWith(def.match));
    const rawBytes = matched.reduce((sum, f) => sum + f.rawBytes, 0);
    const gzipBytes = matched.reduce((sum, f) => sum + f.gzipBytes, 0);
    const budgetBytes = typeof def.maxGzipKB === 'number' ? def.maxGzipKB * 1024 : null;
    chunks.push({
      label,
      match: def.match,
      fileCount: matched.length,
      rawBytes,
      gzipBytes,
      budgetGzipBytes: budgetBytes,
      overBudget: budgetBytes !== null && gzipBytes > budgetBytes,
      missing: matched.length === 0,
    });
  }
  return chunks;
}

function deltaCell(currentBytes, previousBytes) {
  if (typeof previousBytes !== 'number') return '-';
  const delta = currentBytes - previousBytes;
  if (delta === 0) return 'no change';
  const pct = previousBytes > 0 ? ((delta / previousBytes) * 100).toFixed(1) : '—';
  const sign = delta > 0 ? '+' : '-';
  return `${sign}${formatKB(Math.abs(delta))} (${delta > 0 ? '+' : ''}${pct}%)`;
}

function generateMarkdown(report, chunks, budgets, previous) {
  const lines = [];
  const prevTotals = previous
    ? { js: previous.totalJs?.gzipBytes, css: previous.totalCss?.gzipBytes }
    : { js: undefined, css: undefined };
  const prevChunks = new Map((previous?.chunks ?? []).map((c) => [c.label, c]));

  lines.push('## Bundle Size Report');
  lines.push('');
  lines.push(
    `**Total JS:** ${formatKB(report.totalJs.gzipBytes)} gzip (${formatKB(report.totalJs.rawBytes)} raw) across ${report.fileCount} files`,
  );
  lines.push(`**Total CSS:** ${formatKB(report.totalCss.gzipBytes)} gzip (${formatKB(report.totalCss.rawBytes)} raw)`);
  if (budgets) {
    const jsOver = report.totalJs.gzipBytes > budgets.totalJsGzipKB * 1024;
    const cssOver = report.totalCss.gzipBytes > budgets.totalCssGzipKB * 1024;
    lines.push(
      `**Budgets:** JS ${budgets.totalJsGzipKB} KB :${jsOver ? 'x' : 'white_check_mark'}: | CSS ${budgets.totalCssGzipKB} KB :${cssOver ? 'x' : 'white_check_mark'}:`,
    );
  }
  lines.push('');
  lines.push('| Chunk | Gzip | Raw | Budget | Delta vs prev | Status |');
  lines.push('|-------|------|-----|--------|---------------|--------|');
  for (const c of chunks) {
    const budget = c.budgetGzipBytes !== null ? formatKB(c.budgetGzipBytes) : '-';
    const delta = deltaCell(c.gzipBytes, prevChunks.get(c.label)?.gzipBytes);
    let status = 'ok';
    if (c.missing) status = 'MISSING';
    else if (c.overBudget) status = 'OVER BUDGET';
    lines.push(
      `| ${c.label} | ${formatKB(c.gzipBytes)} | ${formatKB(c.rawBytes)} | ${budget} | ${delta} | ${status} |`,
    );
  }

  if (report.assets?.length) {
    const prevAssets = new Map((previous?.assets ?? []).map((a) => [a.label, a]));
    lines.push('');
    lines.push('| Asset | Size | Budget | Delta vs prev | Status |');
    lines.push('|-------|------|--------|---------------|--------|');
    for (const a of report.assets) {
      const budget = a.budgetBytes !== null ? formatKB(a.budgetBytes) : '-';
      const delta = deltaCell(a.rawBytes, prevAssets.get(a.label)?.rawBytes);
      let status = 'ok';
      if (a.missing) status = 'MISSING';
      else if (a.overBudget) status = 'OVER BUDGET';
      lines.push(`| ${a.path} | ${formatKB(a.rawBytes)} | ${budget} | ${delta} | ${status} |`);
    }
  }

  lines.push('');
  lines.push(`**Total JS delta vs prev:** ${deltaCell(report.totalJs.gzipBytes, prevTotals.js)}`);

  const largest = [...report.files].sort((a, b) => b.gzipBytes - a.gzipBytes).slice(0, 10);
  lines.push('');
  lines.push('<details><summary>10 largest emitted files (gzip)</summary>');
  lines.push('');
  lines.push('| File | Gzip | Raw |');
  lines.push('|------|------|-----|');
  for (const f of largest) {
    lines.push(`| ${f.name} | ${formatKB(f.gzipBytes)} | ${formatKB(f.rawBytes)} |`);
  }
  lines.push('');
  lines.push('</details>');

  lines.push('');
  lines.push('---');
  lines.push(
    '*Bundle size is measured and budgeted via `scripts/track-bundle-size.mjs` against `bundle-size-budgets.json`. Interactive treemap: `npm run build:analyze`.*',
  );
  return lines.join('\n');
}

const opts = parseArgs();
const budgets = readJson(opts.budgets);
const report = measure();
const chunks = aggregateChunks(report, budgets);
report.chunks = chunks;
const assets = measureAssets(budgets);
report.assets = assets;

const previous = readJson(opts.previous);
const markdown = generateMarkdown(report, chunks, budgets, previous);

if (opts.summary && process.env.GITHUB_STEP_SUMMARY) {
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + '\n', { flag: 'a' });
  console.log('Bundle size summary written to $GITHUB_STEP_SUMMARY');
} else {
  console.log(markdown);
}

if (opts.output) {
  writeFileSync(opts.output, JSON.stringify(report, null, 2));
  console.log(`Report written to ${opts.output}`);
}

const problems = [];
const overBudgetChunks = chunks.filter((c) => c.overBudget);
const missingChunks = chunks.filter((c) => c.missing);
const overBudgetAssets = assets.filter((a) => a.overBudget);
const missingAssets = assets.filter((a) => a.missing);
if (overBudgetChunks.length > 0) problems.push(`${overBudgetChunks.length} chunk(s) over budget`);
if (missingChunks.length > 0) problems.push(`${missingChunks.length} expected chunk(s) missing`);
if (overBudgetAssets.length > 0) problems.push(`${overBudgetAssets.length} asset(s) over budget`);
if (missingAssets.length > 0) problems.push(`${missingAssets.length} budgeted asset(s) missing from dist`);
if (budgets && report.totalJs.gzipBytes > budgets.totalJsGzipKB * 1024) problems.push('total JS over budget');
if (budgets && report.totalCss.gzipBytes > budgets.totalCssGzipKB * 1024) problems.push('total CSS over budget');

if (problems.length > 0) {
  console.error(`\nBundle size problems: ${problems.join(', ')}.`);
  process.exit(1);
}
