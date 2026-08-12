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

      it('declares required fields as required', () => {
        for (const field of schema.fields) {
          if (field.required) {
            expect(field.required).toBe(true);
          }
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

  it('BLOG_LISTING_QUERY references post, tag, and series', () => {
    const types = documentTypesInQuery(BLOG_LISTING_QUERY);
    expect(types).toContain('post');
    expect(types).toContain('tag');
    expect(types).toContain('series');
  });

  it('POST_BY_SLUG_QUERY references post', () => {
    expect(documentTypesInQuery(POST_BY_SLUG_QUERY)).toContain('post');
  });

  it('PODCAST_GUESTS_QUERY references podcastGuest', () => {
    expect(documentTypesInQuery(PODCAST_GUESTS_QUERY)).toContain('podcastGuest');
  });
});

describe('Sanity schema declares every field projected by GROQ', () => {
  it('POST schema declares all fields projected in BLOG_LISTING_QUERY', () => {
    const fields = declaredFieldNames(POST_DOCUMENT_SCHEMA);
    // Every stored field the listing projects must be declared. `_id` is system
    // and excluded from the schema (it is implicit on every Sanity document).
    for (const field of [
      'title',
      'slug',
      'excerpt',
      'category',
      'publishedAt',
      'readingTime',
      'isFeatured',
      'image',
      'tags',
      'series',
      'seriesOrder',
    ]) {
      expect(fields.has(field), `post schema must declare "${field}"`).toBe(true);
    }
  });

  it('POST schema declares all fields projected in POST_BY_SLUG_QUERY', () => {
    const fields = declaredFieldNames(POST_DOCUMENT_SCHEMA);
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
      expect(fields.has(field), `post schema must declare "${field}"`).toBe(true);
    }
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

  it('PODCAST_GUEST schema declares every field projected in PODCAST_GUESTS_QUERY', () => {
    const fields = declaredFieldNames(PODCAST_GUEST_DOCUMENT_SCHEMA);
    for (const field of [
      'name',
      'role',
      'branch',
      'episodeUrl',
      'image',
      'linkedinUrl',
      'instagramUrl',
      'websiteUrl',
      'websiteLabel',
      'order',
    ]) {
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

  it('CATEGORY schema exists as the post.category reference target', () => {
    const categoryField = POST_DOCUMENT_SCHEMA.fields.find((f) => f.name === 'category');
    expect(categoryField?.type).toBe('reference');
    expect(categoryField?.references).toBe('category');
    expect(SANITY_DOCUMENT_SCHEMAS.category).toBe(CATEGORY_DOCUMENT_SCHEMA);
    expect(declaredFieldNames(CATEGORY_DOCUMENT_SCHEMA).has('title')).toBe(true);
  });
});
