// Hand-written runtime type guards for the Sanity data boundary (no Zod).
//
// `client.fetch<T>()` does NOT validate its result at runtime — the generic is a
// compile-time promise only. A schema drift in the CMS (a renamed field, a
// reference that stopped dereferencing) would otherwise reach `render`/cache as
// the wrong shape and crash to a blank page. These guards validate the documented
// REQUIRED fields before fetched data is trusted or cached.

import type {
  SanityImage,
  SanityPost,
  SanityPostPreview,
  SanitySeries,
  SanityTag,
  BlogListingResult,
  PodcastGuest,
} from './types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasStringField(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === 'string';
}

function hasSlug(obj: Record<string, unknown>): boolean {
  const slug = obj.slug;
  return isObject(slug) && typeof slug.current === 'string';
}

/**
 * The id form `@sanity/image-url` can parse: `image-<hash>-<w>x<h>-<ext>`.
 * Anything else makes `builder.image()` throw `Malformed asset _ref`.
 */
const IMAGE_REF_PATTERN = /^image-[a-zA-Z0-9]+-\d+x\d+-[a-z0-9]+$/;

/**
 * Strict: a fully-dereferenced image whose asset was projected to `{ _id, url }`,
 * as the listing/post GROQ queries return.
 */
export function isSanityImage(value: unknown): value is SanityImage {
  if (!isObject(value)) return false;
  const asset = value.asset;
  return isObject(asset) && typeof asset._id === 'string' && typeof asset.url === 'string';
}

/**
 * Permissive: anything `@sanity/image-url` can build a URL from — either a
 * dereferenced asset (`{ _id, url }`) OR a raw reference (`{ _ref }`). Used at the
 * RENDER boundary, where un-expanded fields (e.g. a bookReference cover) arrive as
 * `{ asset: { _ref } }` and must NOT be rejected.
 *
 * The `_ref` must match the id form the builder can parse, not merely be a string:
 * `urlFor` is called three times per image with no try/catch, so a `_ref` of `'x'`
 * throws during render and takes the whole article to the error boundary — the
 * exact outcome this guard exists to prevent.
 */
export function isRenderableImageSource(value: unknown): boolean {
  if (!isObject(value)) return false;
  const asset = value.asset;
  if (!isObject(asset)) return false;
  if (typeof asset._ref === 'string') return IMAGE_REF_PATTERN.test(asset._ref);
  return typeof asset._id === 'string' && typeof asset.url === 'string';
}

export function isSanityTag(value: unknown): value is SanityTag {
  return isObject(value) && hasStringField(value, '_id') && hasStringField(value, 'title') && hasSlug(value);
}

export function isSanitySeries(value: unknown): value is SanitySeries {
  return isObject(value) && hasStringField(value, '_id') && hasStringField(value, 'title') && hasSlug(value);
}

/**
 * `null` is what GROQ returns for an absent optional field, so an optional
 * reference is only checked when it actually carries a value.
 */
function isAbsent(value: unknown): boolean {
  return value === undefined || value === null;
}

function hasPostPreviewCore(obj: Record<string, unknown>): boolean {
  // tags/series are optional, but when present must be usable: the listing
  // renders `tag.slug.current` inside a `.map` and filters on
  // `post.series?.slug.current`, both unguarded. A dereference that started
  // returning null (a renamed tag field, a deleted tag document) would throw
  // through render rather than fail validation here.
  if (!isAbsent(obj.tags) && !(Array.isArray(obj.tags) && obj.tags.every(isSanityTag))) return false;
  if (!isAbsent(obj.series) && !isSanitySeries(obj.series)) return false;
  return (
    hasStringField(obj, '_id') &&
    hasStringField(obj, 'title') &&
    hasSlug(obj) &&
    hasStringField(obj, 'excerpt') &&
    hasStringField(obj, 'category') &&
    hasStringField(obj, 'publishedAt')
  );
}

export function isSanityPostPreview(value: unknown): value is SanityPostPreview {
  return isObject(value) && hasPostPreviewCore(value);
}

export function isSanityPost(value: unknown): value is SanityPost {
  // The full post shares the same required core as the preview; the extra fields
  // (body, tags, series, ...) are all optional in SanityPost.
  return isObject(value) && hasPostPreviewCore(value);
}

/**
 * Drop the post previews that would crash the listing, keep the rest. One drifted
 * document should cost the visitor one card, not the whole blog index — an
 * all-or-nothing check hands them an error state whose "Try Again" button re-runs
 * the identical deterministic query and can never succeed.
 */
export function filterValidPostPreviews(posts: readonly unknown[]): SanityPostPreview[] {
  return posts.filter(isSanityPostPreview);
}

export function isBlogListingResult(value: unknown): value is BlogListingResult {
  return isObject(value) && Array.isArray(value.posts) && value.posts.every(isSanityPostPreview);
}

const MILITARY_BRANCHES = new Set(['army', 'navy', 'marines', 'air-force', 'space-force', 'coast-guard']);

export function isPodcastGuest(value: unknown): value is PodcastGuest {
  if (!isObject(value)) return false;
  // branch is optional, but when present must be a known enum value.
  if (value.branch !== undefined && (typeof value.branch !== 'string' || !MILITARY_BRANCHES.has(value.branch))) {
    return false;
  }
  return (
    hasStringField(value, '_id') &&
    hasStringField(value, 'name') &&
    hasStringField(value, 'role') &&
    typeof value.order === 'number'
  );
}

export function isPodcastGuestArray(value: unknown): value is PodcastGuest[] {
  return Array.isArray(value) && value.every(isPodcastGuest);
}
