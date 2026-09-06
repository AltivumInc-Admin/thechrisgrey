#!/usr/bin/env node
/**
 * rewrite-blog-headings.mjs
 *
 * Rewrites the H2/H3 headings of the published Sanity blog posts to
 * question-based form so each post satisfies VAL-AEO-003 (>=50% of H2/H3
 * headings are questions or explicit answer titles).
 *
 * - For posts that already have H2/H3 headings, existing non-question headings
 *   are rewritten in place (portable text `body` blocks with `style: h2|h3`).
 * - For posts with zero H2/H3 headings, a single orienting question-form H2 is
 *   inserted after the opening paragraph so the post unambiguously satisfies
 *   the ratio (1/1 = 100%) and gains an AEO-oriented section anchor.
 *
 * THE PLAN (scripts/lib/blog-heading-plan.mjs) IS ALREADY APPLIED to the
 * production dataset (commit bac21a7).
 * It is kept as the auditable record of that migration and as the re-run path
 * for a restored dataset, which is why writing now requires an explicit
 * `--apply`: the default is a dry run. A heading whose current text no longer
 * matches the plan's `before` is SKIPPED rather than force-written, because a
 * mismatch means an editor re-worded it in the Studio after the plan was
 * authored and a force-write would silently revert their published wording.
 * `--force` opts back into overwriting those.
 *
 * Writes a JSON patch report to the path given by `--out=<path>`
 * (default: ./blog-heading-rewrite-patch.json). The report is written even when
 * individual patches fail, so a half-applied run always leaves an audit trail
 * naming the documents it touched and their previous headings.
 *
 * Usage:
 *   node scripts/rewrite-blog-headings.mjs                    # dry run + report
 *   node scripts/rewrite-blog-headings.mjs --apply            # apply + report
 *   node scripts/rewrite-blog-headings.mjs --apply --force    # also overwrite drifted headings
 *   node scripts/rewrite-blog-headings.mjs --out=/path/to/patch.json
 *
 * Applying requires `SANITY_WRITE_TOKEN` in the environment.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createBuildClient, SANITY_BUILD_CONFIG } from './lib/sanity-build-client.js';
import { REWRITES, INSERTIONS } from './lib/blog-heading-plan.mjs';

// Writes are opt-in. `node scripts/rewrite-blog-headings.mjs` with a write
// token in the environment used to issue ~50 live patches against production
// with no flag at all.
const isApply = process.argv.includes('--apply');
const isDryRun = !isApply;
const isForced = process.argv.includes('--force');
const outArg = process.argv.find((a) => a.startsWith('--out='));
const outPath = outArg ? outArg.slice(6) : './blog-heading-rewrite-patch.json';

// 60s (vs the shared 15s) because this issues many sequential mutations.
const client = createBuildClient({ token: process.env.SANITY_WRITE_TOKEN, timeout: 60000 });

// Generate a Sanity-compatible random _key (12 hex chars).
const newKey = () => randomBytes(6).toString('hex');

const isQuestion = (text) =>
  /\?\s*$/.test(text.trim()) ||
  /^(what|how|why|when|where|who|which|can|do|does|is|are|should|will|would|could)\b/i.test(text.trim());

// The rewrite/insert plan itself is pure data, kept in a sibling module so this
// file reads as the executable it is.

const blockText = (b) => (b && Array.isArray(b.children) ? b.children.map((c) => c.text).join('') : '');

/**
 * Patch a heading's text. When the block holds a single span we set only that
 * span's `text`, so its marks (and the block's markDefs those marks point at)
 * survive; replacing the whole `children` array — the only path this had — drops
 * every inline mark and orphans the markDefs behind it.
 */
const patchHeadingText = (docId, blockKey, block, text) => {
  const path =
    Array.isArray(block.children) && block.children.length === 1
      ? { [`body[_key=="${blockKey}"].children[0].text`]: text }
      : { [`body[_key=="${blockKey}"].children`]: [{ _type: 'span', _key: newKey(), marks: [], text }] };
  // autoGenerateArrayKeys (the option was misspelled `autoGenerationArray` here,
  // so the client silently ignored it) backstops the manual newKey() above.
  return client.patch(docId).set(path).commit({ autoGenerateArrayKeys: true });
};

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
const main = async () => {
  if (isApply && !process.env.SANITY_WRITE_TOKEN) {
    console.error('SANITY_WRITE_TOKEN is not set. Aborting.');
    process.exit(1);
  }

  // Validate the report destination BEFORE mutating anything: a bad --out= used
  // to surface only after every patch had been committed, losing the audit
  // trail for a run that had already changed production.
  const outDir = dirname(resolve(outPath));
  if (!existsSync(outDir)) {
    console.error(`--out= directory does not exist: ${outDir}. Aborting before any writes.`);
    process.exit(1);
  }

  // Fetch all posts with body so we can verify current state and skip no-ops.
  const posts = await client.fetch(
    `*[_type == "post" && defined(slug.current)] | order(publishedAt asc) { _id, slug, title, body }`,
  );
  const byId = new Map(posts.map((p) => [p._id, p]));

  const appliedRewrites = [];
  const skippedRewrites = [];
  const failedRewrites = [];
  const appliedInsertions = [];
  const skippedInsertions = [];
  const failedInsertions = [];

  // --- Apply rewrites ---
  for (const r of REWRITES) {
    const post = byId.get(r.docId);
    if (!post) {
      skippedRewrites.push({ ...r, reason: 'document not found' });
      continue;
    }
    // Match on _key AND shape. A bare _key match would happily rewrite a
    // paragraph, or a non-block entry, that carries the same key — the
    // insertion loop below already holds itself to this standard.
    const block = (post.body || []).find(
      (b) => b && b._key === r.blockKey && b._type === 'block' && (b.style === 'h2' || b.style === 'h3'),
    );
    if (!block) {
      skippedRewrites.push({ ...r, reason: 'no h2/h3 block with that key' });
      continue;
    }
    const currentText = blockText(block);
    if (currentText === r.after) {
      skippedRewrites.push({ ...r, reason: 'already rewritten', currentText });
      continue;
    }
    if (currentText !== r.before) {
      // The heading no longer reads as the plan recorded it, so an editor
      // re-worded it in the Studio after the plan was authored. Overwriting
      // would silently revert their published copy; skip unless --force.
      if (!isForced) {
        skippedRewrites.push({ ...r, reason: 'heading changed since plan', currentText });
        continue;
      }
      r.actualBefore = currentText;
    }
    if (!isDryRun) {
      try {
        await patchHeadingText(r.docId, r.blockKey, block, r.after);
      } catch (error) {
        // Record and keep going: a throw here used to abort the whole run with
        // production already partly mutated and no report on disk.
        failedRewrites.push({ ...r, currentText, error: error?.message ?? String(error) });
        continue;
      }
    }
    appliedRewrites.push({ ...r, currentTextBefore: currentText });
  }

  // --- Apply insertions ---
  for (const ins of INSERTIONS) {
    const post = byId.get(ins.docId);
    if (!post) {
      skippedInsertions.push({ ...ins, reason: 'document not found' });
      continue;
    }
    const body = post.body || [];
    const hasHeadings = body.some((b) => b && b._type === 'block' && (b.style === 'h2' || b.style === 'h3'));
    if (hasHeadings) {
      skippedInsertions.push({ ...ins, reason: 'post already has H2/H3 headings' });
      continue;
    }
    // Skip if an identical question heading already exists (idempotent re-run).
    const alreadyHas = body.some(
      (b) => b && b._type === 'block' && b.style === 'h2' && blockText(b) === ins.headingText,
    );
    if (alreadyHas) {
      skippedInsertions.push({ ...ins, reason: 'question heading already present' });
      continue;
    }
    const refBlock = body.find((b) => b._key === ins.afterBlockKey);
    if (!refBlock) {
      skippedInsertions.push({ ...ins, reason: 'afterBlockKey not found' });
      continue;
    }
    const newBlock = {
      _type: 'block',
      _key: newKey(),
      style: 'h2',
      markDefs: [],
      children: [{ _type: 'span', _key: newKey(), marks: [], text: ins.headingText }],
    };
    if (!isDryRun) {
      try {
        await client
          .patch(ins.docId)
          .insert('after', `body[_key=="${ins.afterBlockKey}"]`, [newBlock])
          .commit({ autoGenerateArrayKeys: true });
      } catch (error) {
        failedInsertions.push({ ...ins, error: error?.message ?? String(error) });
        continue;
      }
    }
    appliedInsertions.push({ ...ins, newBlockKey: newBlock._key });
  }

  // --- Re-fetch and compute final ratios ---
  // A failed re-fetch must not cost us the report: fall back to the pre-patch
  // bodies and say so, rather than throwing past the writeFileSync below.
  let finalPosts = posts;
  let ratiosReflect = isDryRun ? 'pre-patch' : 'post-patch';
  if (!isDryRun) {
    try {
      finalPosts = await client.fetch(
        `*[_type == "post" && defined(slug.current)] | order(publishedAt asc) { _id, slug, title, body }`,
      );
    } catch (error) {
      ratiosReflect = 'pre-patch';
      console.warn('Final re-fetch failed; ratios below reflect the pre-patch state:', error?.message ?? error);
    }
  }
  const perPost = finalPosts.map((p) => {
    const headings = (p.body || []).filter((b) => b && b._type === 'block' && (b.style === 'h2' || b.style === 'h3'));
    const texts = headings.map(blockText);
    const questions = texts.filter(isQuestion);
    const total = headings.length;
    const ratio = total === 0 ? 1 : questions.length / total; // vacuous pass on 0
    return {
      docId: p._id,
      slug: p.slug.current,
      title: p.title,
      h2h3Count: total,
      questionCount: questions.length,
      ratio: Number(ratio.toFixed(2)),
      satisfiesVALAEO003: ratio >= 0.5,
      headings: texts,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: isDryRun,
    forced: isForced,
    ratiosReflect,
    sanityProject: SANITY_BUILD_CONFIG.projectId,
    dataset: SANITY_BUILD_CONFIG.dataset,
    summary: {
      postsTotal: perPost.length,
      rewritesApplied: appliedRewrites.length,
      rewritesSkipped: skippedRewrites.length,
      rewritesFailed: failedRewrites.length,
      insertionsApplied: appliedInsertions.length,
      insertionsSkipped: skippedInsertions.length,
      insertionsFailed: failedInsertions.length,
      postsSatisfyingAEO003: perPost.filter((p) => p.satisfiesVALAEO003).length,
    },
    rewrites: appliedRewrites.map((r) => ({
      docId: r.docId,
      slug: r.slug,
      title: r.title,
      blockKey: r.blockKey,
      before: r.actualBefore || r.before,
      after: r.after,
    })),
    insertions: appliedInsertions.map((i) => ({
      docId: i.docId,
      slug: i.slug,
      title: i.title,
      afterBlockKey: i.afterBlockKey,
      newBlockKey: i.newBlockKey,
      addedHeading: i.headingText,
      kind: 'added-h2-question',
    })),
    skipped: { rewrites: skippedRewrites, insertions: skippedInsertions },
    failed: { rewrites: failedRewrites, insertions: failedInsertions },
    perPost,
  };

  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('Patch report written to:', outPath);
  console.log('Summary:', JSON.stringify(report.summary, null, 2));
  for (const p of perPost) {
    console.log(
      `  ${p.slug.padEnd(60)} h2/h3=${p.h2h3Count} q=${p.questionCount} ratio=${p.ratio} ${p.satisfiesVALAEO003 ? 'PASS' : 'FAIL'}`,
    );
  }
  if (isDryRun) {
    console.log('\n(dry run: no changes were committed to Sanity. Re-run with --apply to write.)');
  }
  const failures = failedRewrites.length + failedInsertions.length;
  if (failures > 0) {
    console.error(`\n${failures} patch(es) failed; see "failed" in ${outPath}.`);
    process.exitCode = 1;
  }
};

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
