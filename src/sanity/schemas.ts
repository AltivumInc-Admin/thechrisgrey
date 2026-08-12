// Canonical Sanity content schema for the thechrisgrey frontend.
//
// Single source of truth for the Sanity document and object types the frontend
// queries, the fields each type carries, and which Sanity project/dataset they
// live in. The Sanity studio for this site is hosted elsewhere (project
// `k5950b3w`), so without this file the data model had to be inferred from
// scattered GROQ queries (`queries.ts`) and result-shape interfaces
// (`types.ts`). Agents and tooling can import these structured definitions to
// understand the content model without grepping queries or prose docs.
//
// Validated by `schemas.test.ts`, which cross-checks every `_type` referenced in
// the GROQ queries against the definitions here and asserts every projected
// field is declared, so the schema cannot drift from the queries.

/** Sanity project the frontend reads from. */
export type SanityProjectId = 'main' | 'podcast';

/** Configuration for each Sanity project the frontend connects to. */
export interface SanityProjectConfig {
  id: SanityProjectId;
  projectId: string;
  dataset: string;
  apiVersion: string;
  useCdn: boolean;
  description: string;
}

/**
 * The two Sanity projects the frontend reads. The main project holds the blog
 * (post/tag/series/category); the podcast project holds podcast guests.
 * Values mirror `client.ts` so the schema names the same backends the code
 * talks to.
 */
export const SANITY_PROJECTS: Record<SanityProjectId, SanityProjectConfig> = {
  main: {
    id: 'main',
    projectId: 'k5950b3w',
    dataset: 'production',
    apiVersion: '2024-01-01',
    useCdn: true,
    description: 'Blog content (posts, tags, series, categories) and KB entries.',
  },
  podcast: {
    id: 'podcast',
    projectId: 'uaxzdsfa',
    dataset: 'production',
    apiVersion: '2024-01-01',
    useCdn: true,
    description: 'The Vector Podcast content (guests).',
  },
};

/** Field value types used by the Sanity schema definitions below. */
type SanityFieldType =
  | 'string'
  | 'slug'
  | 'text'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'image'
  | 'url'
  | 'reference'
  | 'array'
  | 'portableText'
  | 'object';

/** A single field on a Sanity document or object type. */
interface SanityFieldSchema {
  name: string;
  type: SanityFieldType;
  description?: string;
  /** Whether the field is required for the document to be usable by the frontend. */
  required?: boolean;
  /** For `reference` fields: the target document `_type`. */
  references?: string;
  /** For `array` fields: the element kind (`reference` target `_type`). */
  arrayOfReference?: string;
  /** For `portableText` fields: the custom block object `_type` names allowed. */
  blockTypes?: string[];
  /** For constrained string fields: the allowed values. */
  options?: { list?: string[] };
}

/** A Sanity document or embedded object type definition. */
export interface SanityTypeSchema {
  /** The `_type` value stored on each Sanity document/object. */
  name: string;
  type: 'document' | 'object';
  title: string;
  description: string;
  project: SanityProjectId;
  fields: SanityFieldSchema[];
}

/** Portable-text block object types allowed inside a post `body`. */
export const PORTABLE_TEXT_BLOCK_TYPES = [
  'codeBlock',
  'callout',
  'youtube',
  'divider',
  'pullQuote',
  'bookReference',
] as const;

/**
 * Blog post document. The central content type. Queried by
 * `BLOG_LISTING_QUERY` (listing projection) and `POST_BY_SLUG_QUERY` (full
 * projection incl. body + relatedPosts + seriesPosts). Partitioned by slug.
 */
export const POST_DOCUMENT_SCHEMA: SanityTypeSchema = {
  name: 'post',
  type: 'document',
  title: 'Blog Post',
  description:
    'A blog post. Slug is the canonical identifier for the detail route. Category is a reference but may fall back to a plain string (coalesce in GROQ).',
  project: 'main',
  fields: [
    { name: 'title', type: 'string', required: true, description: 'Post headline.' },
    {
      name: 'slug',
      type: 'slug',
      required: true,
      description: 'URL slug; `defined(slug.current)` is the listing filter.',
    },
    { name: 'excerpt', type: 'string', description: 'Short summary for listings and SEO.' },
    {
      name: 'category',
      type: 'reference',
      references: 'category',
      description: 'Category reference; GROQ coalesces `category->title` with a bare string.',
    },
    {
      name: 'publishedAt',
      type: 'datetime',
      required: true,
      description: 'Publication timestamp; listing orders by this desc.',
    },
    { name: 'readingTime', type: 'number', description: 'Estimated read minutes.' },
    { name: 'isFeatured', type: 'boolean', description: 'Listing orders featured posts first.' },
    { name: 'pdfUrl', type: 'url', description: 'Optional PDF download URL.' },
    { name: 'seoTitle', type: 'string', description: 'Override title for SEO.' },
    { name: 'seoDescription', type: 'string', description: 'Override description for SEO.' },
    { name: 'image', type: 'image', description: 'Cover image with alt/caption.' },
    {
      name: 'body',
      type: 'portableText',
      blockTypes: [...PORTABLE_TEXT_BLOCK_TYPES],
      description: 'Portable Text body; custom block types listed in blockTypes.',
    },
    { name: 'tags', type: 'array', arrayOfReference: 'tag', description: 'References to tag documents.' },
    { name: 'series', type: 'reference', references: 'series', description: 'Optional series this post belongs to.' },
    { name: 'seriesOrder', type: 'number', description: 'Position within the series.' },
    { name: 'relatedPosts', type: 'array', arrayOfReference: 'post', description: 'Curated related-post references.' },
  ],
};

/** Tag document. Lightweight taxonomy attached to posts. */
export const TAG_DOCUMENT_SCHEMA: SanityTypeSchema = {
  name: 'tag',
  type: 'document',
  title: 'Tag',
  description: 'A tag used to label blog posts. Listed alphabetically by title.',
  project: 'main',
  fields: [
    { name: 'title', type: 'string', required: true, description: 'Display name.' },
    { name: 'slug', type: 'slug', required: true, description: 'URL slug.' },
  ],
};

/** Series document. Groups an ordered set of posts. */
export const SERIES_DOCUMENT_SCHEMA: SanityTypeSchema = {
  name: 'series',
  type: 'document',
  title: 'Series',
  description: 'A multi-part blog series. Posts reference a series and set seriesOrder.',
  project: 'main',
  fields: [
    { name: 'title', type: 'string', required: true, description: 'Series name.' },
    { name: 'slug', type: 'slug', required: true, description: 'URL slug.' },
    { name: 'description', type: 'string', description: 'Optional series summary.' },
    { name: 'image', type: 'image', description: 'Optional series cover image.' },
  ],
};

/**
 * Category document. Referenced by posts via `category`. The GROQ projection
 * dereferences only `title`, but the document carries a slug for routing in the
 * studio. Listed here so agents know the reference target exists.
 */
export const CATEGORY_DOCUMENT_SCHEMA: SanityTypeSchema = {
  name: 'category',
  type: 'document',
  title: 'Category',
  description: 'A blog category. Posts reference it; GROQ projects category->title.',
  project: 'main',
  fields: [
    { name: 'title', type: 'string', required: true, description: 'Category display name.' },
    { name: 'slug', type: 'slug', description: 'Optional URL slug.' },
  ],
};

/** Podcast guest document. Lives in the separate podcast Sanity project. */
export const PODCAST_GUEST_DOCUMENT_SCHEMA: SanityTypeSchema = {
  name: 'podcastGuest',
  type: 'document',
  title: 'Podcast Guest',
  description:
    'A guest on The Vector Podcast. Queried via podcastClient (project uaxzdsfa) and ordered by `order` ascending.',
  project: 'podcast',
  fields: [
    { name: 'name', type: 'string', required: true, description: 'Guest display name.' },
    { name: 'role', type: 'string', required: true, description: 'Guest role/title.' },
    {
      name: 'branch',
      type: 'string',
      description: 'Military branch, when applicable.',
      options: { list: ['army', 'navy', 'marines', 'air-force', 'space-force', 'coast-guard'] },
    },
    { name: 'episodeUrl', type: 'url', description: 'Link to the episode.' },
    { name: 'image', type: 'image', description: 'Guest photo.' },
    { name: 'linkedinUrl', type: 'url', description: 'LinkedIn profile URL.' },
    { name: 'instagramUrl', type: 'url', description: 'Instagram profile URL.' },
    { name: 'websiteUrl', type: 'url', description: 'Personal website URL.' },
    { name: 'websiteLabel', type: 'string', description: 'Display label for the website link.' },
    { name: 'order', type: 'number', required: true, description: 'Sort order (ascending).' },
  ],
};

/** Code block embedded in portable text. */
const CODE_BLOCK_SCHEMA: SanityTypeSchema = {
  name: 'codeBlock',
  type: 'object',
  title: 'Code Block',
  description: 'A syntax-highlighted code block in a post body.',
  project: 'main',
  fields: [
    { name: 'filename', type: 'string', description: 'Optional filename label.' },
    { name: 'code', type: 'object', description: 'Nested code object: language, code, highlightedLines.' },
  ],
};

/** Callout block embedded in portable text. */
const CALLOUT_BLOCK_SCHEMA: SanityTypeSchema = {
  name: 'callout',
  type: 'object',
  title: 'Callout',
  description: 'An admonition block (note/tip/warning/important).',
  project: 'main',
  fields: [
    {
      name: 'type',
      type: 'string',
      required: true,
      description: 'Admonition kind.',
      options: { list: ['note', 'tip', 'warning', 'important'] },
    },
    { name: 'text', type: 'string', required: true, description: 'Callout body text.' },
  ],
};

/** YouTube embed block embedded in portable text. */
const YOUTUBE_BLOCK_SCHEMA: SanityTypeSchema = {
  name: 'youtube',
  type: 'object',
  title: 'YouTube Embed',
  description: 'An embedded YouTube video in a post body.',
  project: 'main',
  fields: [
    { name: 'url', type: 'string', required: true, description: 'YouTube video URL.' },
    { name: 'caption', type: 'string', description: 'Optional caption.' },
  ],
};

/** Divider block embedded in portable text. */
const DIVIDER_BLOCK_SCHEMA: SanityTypeSchema = {
  name: 'divider',
  type: 'object',
  title: 'Divider',
  description: 'A visual divider between body blocks.',
  project: 'main',
  fields: [
    {
      name: 'style',
      type: 'string',
      description: 'Divider visual style.',
      options: { list: ['line', 'dots', 'space'] },
    },
  ],
};

/** Pull quote block embedded in portable text. */
const PULL_QUOTE_BLOCK_SCHEMA: SanityTypeSchema = {
  name: 'pullQuote',
  type: 'object',
  title: 'Pull Quote',
  description: 'A highlighted quote in a post body.',
  project: 'main',
  fields: [
    { name: 'quote', type: 'string', required: true, description: 'The quote text.' },
    { name: 'attribution', type: 'string', description: 'Optional attribution.' },
  ],
};

/** Book reference block embedded in portable text. */
const BOOK_REFERENCE_BLOCK_SCHEMA: SanityTypeSchema = {
  name: 'bookReference',
  type: 'object',
  title: 'Book Reference',
  description: 'A referenced book with cover and link in a post body.',
  project: 'main',
  fields: [
    { name: 'title', type: 'string', required: true, description: 'Book title.' },
    { name: 'author', type: 'string', required: true, description: 'Book author.' },
    { name: 'cover', type: 'image', description: 'Optional cover image.' },
    { name: 'description', type: 'string', description: 'Optional blurb.' },
    { name: 'link', type: 'url', description: 'Optional purchase/reference link.' },
  ],
};

/** All portable-text block object type schemas, keyed by `_type`. */
export const PORTABLE_TEXT_BLOCK_SCHEMAS: Record<string, SanityTypeSchema> = {
  codeBlock: CODE_BLOCK_SCHEMA,
  callout: CALLOUT_BLOCK_SCHEMA,
  youtube: YOUTUBE_BLOCK_SCHEMA,
  divider: DIVIDER_BLOCK_SCHEMA,
  pullQuote: PULL_QUOTE_BLOCK_SCHEMA,
  bookReference: BOOK_REFERENCE_BLOCK_SCHEMA,
};

/** All Sanity document type schemas the frontend queries, keyed by `_type`. */
export const SANITY_DOCUMENT_SCHEMAS: Record<string, SanityTypeSchema> = {
  post: POST_DOCUMENT_SCHEMA,
  tag: TAG_DOCUMENT_SCHEMA,
  series: SERIES_DOCUMENT_SCHEMA,
  category: CATEGORY_DOCUMENT_SCHEMA,
  podcastGuest: PODCAST_GUEST_DOCUMENT_SCHEMA,
};

/** Every type schema (documents + block objects) the frontend relies on. */
export const ALL_SANITY_TYPE_SCHEMAS: SanityTypeSchema[] = [
  POST_DOCUMENT_SCHEMA,
  TAG_DOCUMENT_SCHEMA,
  SERIES_DOCUMENT_SCHEMA,
  CATEGORY_DOCUMENT_SCHEMA,
  PODCAST_GUEST_DOCUMENT_SCHEMA,
  CODE_BLOCK_SCHEMA,
  CALLOUT_BLOCK_SCHEMA,
  YOUTUBE_BLOCK_SCHEMA,
  DIVIDER_BLOCK_SCHEMA,
  PULL_QUOTE_BLOCK_SCHEMA,
  BOOK_REFERENCE_BLOCK_SCHEMA,
];
