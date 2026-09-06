import { describe, it, expect } from 'vitest';
import {
  SANITY_PROJECTS,
  SANITY_DOCUMENT_SCHEMAS,
  PORTABLE_TEXT_BLOCK_SCHEMAS,
  PORTABLE_TEXT_BLOCK_TYPES,
  ALL_SANITY_TYPE_SCHEMAS,
  POST_DOCUMENT_SCHEMA,
  TAG_DOCUMENT_SCHEMA,
  SERIES_DOCUMENT_SCHEMA,
  PODCAST_GUEST_DOCUMENT_SCHEMA,
  CATEGORY_DOCUMENT_SCHEMA,
} from './schemas';
import { BLOG_LISTING_QUERY, POST_BY_SLUG_QUERY, PODCAST_GUESTS_QUERY } from './queries';
import { isSanityPostPreview } from './guards';
import { client, podcastClient } from './client';

/** Extract every `_type == "X"` reference from a GROQ query string. */
function documentTypesInQuery(query: string): string[] {
  const matches = [...query.matchAll(/_type\s*==\s*"([a-zA-Z_][a-zA-Z0-9_]*)"/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

/**
 * Sanity built-in block/object types that appear in `_type ==` conditionals
 * inside portable-text projections (e.g. `body[] { ..., _type == "image" => }`)
 * but are NOT document types the frontend queries by filter. These are excluded
 * from the "every queried _type has a document schema" cross-check.
 */
const BUILT_IN_NON_DOCUMENT_TYPES = new Set(['image', 'block', 'span', 'geopoint', 'file', 'slug']);

/** Field names declared on a schema (excludes system `_id`/`_updatedAt`). */
function declaredFieldNames(schema: { fields: { name: string }[] }): Set<string> {
  return new Set(schema.fields.map((f) => f.name));
}

/** Sanity system fields, present on every document and never declared in a schema. */
const SYSTEM_FIELDS = new Set(['_id', '_type', '_key', '_ref', '_rev', '_createdAt', '_updatedAt']);

/**
 * Aliases computed by the query rather than stored on the document, so they have
 * no schema field to match. `seriesPosts` is a `select()` subquery over sibling
 * posts.
 */
const COMPUTED_PROJECTIONS = new Set(['seriesPosts']);

/** The `{...}` projection body that follows `marker`, with balanced braces. */
function projectionAfter(query: string, marker: string): string {
  const start = query.indexOf(marker);
  if (start === -1) throw new Error(`projection marker not found: ${marker}`);
  const open = query.indexOf('{', start + marker.length);
  if (open === -1) throw new Error(`no projection block after: ${marker}`);
  let depth = 0;
  for (let i = open; i < query.length; i += 1) {
    if (query[i] === '{') depth += 1;
    else if (query[i] === '}') {
      depth -= 1;
      if (depth === 0) return query.slice(open + 1, i);
    }
  }
  throw new Error(`unbalanced projection after: ${marker}`);
}

/**
 * Field names projected at the TOP level of a projection body, derived from the
 * query text rather than hand-listed. Nested sub-projections (an image asset's
 * `metadata`, a dereferenced tag's `slug`) describe other types and are skipped,
 * so what comes back is exactly the field set of the document being projected.
 *
 * The hand-maintained literal arrays this replaces could not detect the failure
 * the schema file claims to prevent: adding a field to a GROQ projection and
 * forgetting to declare it passed every test.
 */
function projectedFieldsInQuery(query: string, marker: string): string[] {
  const body = projectionAfter(query, marker);
  const segments: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of body) {
    if (ch === '{' || ch === '(' || ch === '[') depth += 1;
    else if (ch === '}' || ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) {
      segments.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  segments.push(current);

  const fields = new Set<string>();
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    // `"alias": expression` or a bare field name.
    const match = trimmed.match(/^"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/) ?? trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (match && !SYSTEM_FIELDS.has(match[1]) && !COMPUTED_PROJECTIONS.has(match[1])) fields.add(match[1]);
  }
  return [...fields];
}

/** Where each query's document-level projection begins. */
const LISTING_POSTS_MARKER = '| order(isFeatured desc, publishedAt desc)';
const POST_DETAIL_MARKER = '][0]';
const PODCAST_GUESTS_MARKER = '| order(order asc)';

describe('Sanity schema well-formedness', () => {
  for (const schema of ALL_SANITY_TYPE_SCHEMAS) {
    describe(`${schema.type} "${schema.name}"`, () => {
      it('has a name, title, description, project, and fields', () => {
        expect(schema.name).toBeTruthy();
        expect(schema.title).toBeTruthy();
        expect(schema.description.length).toBeGreaterThan(0);
        expect(['main', 'podcast']).toContain(schema.project);
        expect(schema.fields.length).toBeGreaterThan(0);
      });

      it('has unique field names', () => {
        const names = schema.fields.map((f) => f.name);
        expect(new Set(names).size).toBe(names.length);
      });

      it('marks a field required only with an explicit boolean true', () => {
        for (const field of schema.fields) {
          expect(['boolean', 'undefined']).toContain(typeof field.required);
        }
      });
    });
  }
});

describe('Sanity schema covers every _type queried by GROQ', () => {
  const allQueries = [BLOG_LISTING_QUERY, POST_BY_SLUG_QUERY, PODCAST_GUESTS_QUERY];

  it('every document _type referenced in any query has a document schema', () => {
    const referenced = allQueries.flatMap(documentTypesInQuery);
    const documentTypes = referenced.filter((t) => !BUILT_IN_NON_DOCUMENT_TYPES.has(t));
    expect(new Set(documentTypes).size).toBeGreaterThan(0);
    for (const type of documentTypes) {
      expect(SANITY_DOCUMENT_SCHEMAS[type], `queried document type "${type}" must have a schema`).toBeDefined();
    }
  });

  it('BLOG_LISTING_QUERY filters on post only (tags/series ride along as dereferences)', () => {
    const types = documentTypesInQuery(BLOG_LISTING_QUERY);
    expect(types).toContain('post');
    // The whole-collection scans were removed: nothing read them.
    expect(types).not.toContain('tag');
  });

  it('POST_BY_SLUG_QUERY references post', () => {
    expect(documentTypesInQuery(POST_BY_SLUG_QUERY)).toContain('post');
  });

  it('PODCAST_GUESTS_QUERY references podcastGuest', () => {
    expect(documentTypesInQuery(PODCAST_GUESTS_QUERY)).toContain('podcastGuest');
  });
});

describe('Sanity schema declares every field projected by GROQ', () => {
  // Derived from the query text, not from a literal list typed into this file:
  // add a field to a projection without declaring it and these fail.
  it('POST schema declares every field BLOG_LISTING_QUERY projects', () => {
    const fields = declaredFieldNames(POST_DOCUMENT_SCHEMA);
    const projected = projectedFieldsInQuery(BLOG_LISTING_QUERY, LISTING_POSTS_MARKER);

    expect(projected.length, 'listing projection must parse to at least one field').toBeGreaterThan(5);
    for (const field of projected) {
      expect(fields.has(field), `post schema must declare "${field}"`).toBe(true);
    }
  });

  it('POST schema declares every field POST_BY_SLUG_QUERY projects', () => {
    const fields = declaredFieldNames(POST_DOCUMENT_SCHEMA);
    const projected = projectedFieldsInQuery(POST_BY_SLUG_QUERY, POST_DETAIL_MARKER);

    expect(projected).toContain('body');
    for (const field of projected) {
      expect(fields.has(field), `post schema must declare "${field}"`).toBe(true);
    }
  });

  it('the derived parser actually sees the projected fields (guards the guard)', () => {
    // Without this, a parser that silently returned [] would make the two checks
    // above vacuously green.
    const listing = projectedFieldsInQuery(BLOG_LISTING_QUERY, LISTING_POSTS_MARKER);
    expect(listing).toEqual(
      expect.arrayContaining(['title', 'slug', 'excerpt', 'category', 'publishedAt', 'image', 'tags', 'series']),
    );
    // Nested sub-projections belong to other types and must not leak in.
    expect(listing).not.toContain('lqip');
    expect(listing).not.toContain('alt');
  });

  it('TAG schema declares fields projected in BLOG_LISTING_QUERY', () => {
    const fields = declaredFieldNames(TAG_DOCUMENT_SCHEMA);
    for (const field of ['title', 'slug']) {
      expect(fields.has(field)).toBe(true);
    }
  });

  it('SERIES schema declares fields projected in BLOG_LISTING_QUERY', () => {
    const fields = declaredFieldNames(SERIES_DOCUMENT_SCHEMA);
    for (const field of ['title', 'slug', 'description']) {
      expect(fields.has(field)).toBe(true);
    }
  });

  it('PODCAST_GUEST schema declares every field PODCAST_GUESTS_QUERY projects', () => {
    const fields = declaredFieldNames(PODCAST_GUEST_DOCUMENT_SCHEMA);
    const projected = projectedFieldsInQuery(PODCAST_GUESTS_QUERY, PODCAST_GUESTS_MARKER);

    expect(projected).toContain('name');
    for (const field of projected) {
      expect(fields.has(field), `podcastGuest schema must declare "${field}"`).toBe(true);
    }
  });

  it('POST body portableText block types match the block schema registry', () => {
    const bodyField = POST_DOCUMENT_SCHEMA.fields.find((f) => f.name === 'body');
    expect(bodyField?.type).toBe('portableText');
    expect(bodyField?.blockTypes).toBeDefined();
    for (const blockType of bodyField?.blockTypes ?? []) {
      expect(PORTABLE_TEXT_BLOCK_SCHEMAS[blockType]).toBeDefined();
    }
  });

  it('PORTABLE_TEXT_BLOCK_TYPES matches the block schema registry keys', () => {
    expect(PORTABLE_TEXT_BLOCK_TYPES.length).toBe(Object.keys(PORTABLE_TEXT_BLOCK_SCHEMAS).length);
    for (const t of PORTABLE_TEXT_BLOCK_TYPES) {
      expect(PORTABLE_TEXT_BLOCK_SCHEMAS[t]).toBeDefined();
    }
  });
});

describe('Sanity schema aligns with client.ts projects', () => {
  it('main project config matches the blog client', () => {
    // `client` is configured for project k5950b3w / production in client.ts.
    expect(SANITY_PROJECTS.main.projectId).toBe('k5950b3w');
    expect(SANITY_PROJECTS.main.dataset).toBe('production');
    // Sanity client exposes its config via `.config()`.
    const cfg = client.config();
    expect(cfg.projectId).toBe(SANITY_PROJECTS.main.projectId);
    expect(cfg.dataset).toBe(SANITY_PROJECTS.main.dataset);
  });

  it('podcast project config matches the podcast client', () => {
    expect(SANITY_PROJECTS.podcast.projectId).toBe('uaxzdsfa');
    expect(SANITY_PROJECTS.podcast.dataset).toBe('production');
    const cfg = podcastClient.config();
    expect(cfg.projectId).toBe(SANITY_PROJECTS.podcast.projectId);
    expect(cfg.dataset).toBe(SANITY_PROJECTS.podcast.dataset);
  });

  it('podcastGuest schema is the only type assigned to the podcast project', () => {
    const podcastTypes = ALL_SANITY_TYPE_SCHEMAS.filter((s) => s.project === 'podcast').map((s) => s.name);
    expect(podcastTypes).toEqual(['podcastGuest']);
  });
});

describe('Sanity schema cross-checks with TypeScript result types', () => {
  // The schema is the source of truth for the *stored* model; the TS interfaces
  // in types.ts describe the *projected* result shape. Every stored field the
  // interfaces expose must be declared in the schema so agents reading either
  // agree on the model.
  it('POST schema declares every field exposed by the SanityPost contract', () => {
    const fields = declaredFieldNames(POST_DOCUMENT_SCHEMA);
    // Mirrors the keys of SanityPost in types.ts (excluding system _id/_updatedAt
    // and the computed seriesPosts which is derived at query time, not stored).
    for (const field of [
      'title',
      'slug',
      'excerpt',
      'category',
      'publishedAt',
      'readingTime',
      'isFeatured',
      'pdfUrl',
      'seoTitle',
      'seoDescription',
      'image',
      'body',
      'tags',
      'series',
      'seriesOrder',
      'relatedPosts',
    ]) {
      expect(fields.has(field), `post schema must declare TS interface field "${field}"`).toBe(true);
    }
  });

  it('every field the runtime guard demands is one the schema marks required', () => {
    // guards.ts and schemas.ts previously contradicted each other in silence:
    // the guard hard-required excerpt and category while the schema declared
    // neither, so one post without an excerpt would have blanked the whole blog
    // index for a field this file said was optional. Probing the guard rather
    // than restating its field list keeps the two from drifting apart again.
    const validPreview: Record<string, unknown> = {
      _id: 'post-1',
      title: 'A Post',
      slug: { current: 'a-post' },
      excerpt: 'An excerpt',
      category: 'Technology',
      publishedAt: '2026-01-15',
    };
    expect(isSanityPostPreview(validPreview), 'the probe fixture must itself be valid').toBe(true);

    for (const field of POST_DOCUMENT_SCHEMA.fields) {
      const withoutField = { ...validPreview };
      delete withoutField[field.name];
      const guardDemandsIt = !isSanityPostPreview(withoutField);
      expect(
        guardDemandsIt,
        `"${field.name}": guard demands=${guardDemandsIt}, schema required=${Boolean(field.required)}`,
      ).toBe(Boolean(field.required));
    }
  });

  it('CATEGORY schema exists as the post.category reference target', () => {
    const categoryField = POST_DOCUMENT_SCHEMA.fields.find((f) => f.name === 'category');
    expect(categoryField?.type).toBe('reference');
    expect(categoryField?.references).toBe('category');
    expect(SANITY_DOCUMENT_SCHEMAS.category).toBe(CATEGORY_DOCUMENT_SCHEMA);
    expect(declaredFieldNames(CATEGORY_DOCUMENT_SCHEMA).has('title')).toBe(true);
  });
});
