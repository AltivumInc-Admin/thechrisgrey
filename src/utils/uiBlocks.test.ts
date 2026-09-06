import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Drift guard for the third hand-synced mirror in this repo (the other two are
 * ROUTES vs App.tsx in src/routes.test.ts and VALID_PATHS vs routes.ts in the
 * Lambda's validation-drift.test.mjs).
 *
 * src/utils/uiBlocks.ts is a hand-maintained mirror of the Zod vocabulary in
 * lambda/chat-stream/uiBlocks.mjs, and the failure mode when they diverge is
 * silent: the Lambda validates and emits a block type the frontend switch does
 * not know, GenerativeBlocks drops it, and the visitor pays a full round trip
 * for an empty area of the thread with both suites green.
 *
 * All three files are read as TEXT. zod is not a frontend dependency, so the
 * Lambda module cannot be imported here (the architectureNodes.test.ts
 * precedent), and uiBlocks.ts is types-only, so nothing survives to runtime.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const LAMBDA_VOCABULARY = resolve(HERE, '../../lambda/chat-stream/uiBlocks.mjs');
const FRONTEND_MIRROR = resolve(HERE, './uiBlocks.ts');
const RENDERER = resolve(HERE, '../components/chat/GenerativeBlocks.tsx');

// Every discriminant of the Zod union: `type: z.literal("timeline")`.
function lambdaBlockTypes(): string[] {
  const source = readFileSync(LAMBDA_VOCABULARY, 'utf8');
  return [...source.matchAll(/type:\s*z\.literal\("([^"]+)"\)/g)].map((m) => m[1]);
}

// Every discriminant of the UiBlock union mirror: `type: 'timeline';`.
function mirrorBlockTypes(): string[] {
  const source = readFileSync(FRONTEND_MIRROR, 'utf8');
  return [...source.matchAll(/^\s*type:\s*'([^']+)';/gm)].map((m) => m[1]);
}

// Every arm GenerativeBlocks actually draws: `case 'timeline':`.
function renderedBlockTypes(): string[] {
  const source = readFileSync(RENDERER, 'utf8');
  return [...source.matchAll(/case '([^']+)':/g)].map((m) => m[1]);
}

describe('uiBlocks drift guard', () => {
  it('parses a plausible number of block types from all three files', () => {
    // Vacuous-pass guard (the validation-drift.test.mjs pattern): if a quote
    // style or the `z.literal` spelling changes, fail loudly rather than
    // comparing two empty sets and passing.
    expect(lambdaBlockTypes().length).toBeGreaterThan(5);
    expect(mirrorBlockTypes().length).toBeGreaterThan(5);
    expect(renderedBlockTypes().length).toBeGreaterThan(5);
  });

  it('the frontend type mirror declares exactly the Lambda vocabulary', () => {
    expect([...mirrorBlockTypes()].sort()).toEqual([...lambdaBlockTypes()].sort());
  });

  it('GenerativeBlocks has a render arm for every block type the Lambda can emit', () => {
    // A mirrored type with no switch arm still falls through to `default` and
    // renders nothing, so mirroring the type alone is not enough.
    const rendered = new Set(renderedBlockTypes());
    for (const type of lambdaBlockTypes()) {
      expect(rendered.has(type), `GenerativeBlocks is missing a case for block type: ${type}`).toBe(true);
    }
  });

  it('GenerativeBlocks renders no block type the Lambda cannot emit', () => {
    const emittable = new Set(lambdaBlockTypes());
    for (const type of renderedBlockTypes()) {
      expect(emittable.has(type), `GenerativeBlocks renders a block type the Lambda never emits: ${type}`).toBe(true);
    }
  });
});
