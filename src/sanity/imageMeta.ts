// Reading the asset metadata Sanity precomputes, off a fetched image source.
//
// The GROQ image projections ask for `metadata { lqip, dimensions }`, but the
// same components also render un-dereferenced sources — a bookReference cover
// arrives as `{ asset: { _ref } }` and carries no metadata at all — so every read
// here is optional and every caller keeps its existing fallback.

import type { SanityImageAssetMetadata } from './types';

/**
 * A very tall image would otherwise reserve a column-height box and push the rest
 * of the article off-screen. Wide images are left alone: a 3.8:1 banner is short,
 * not disruptive.
 */
const MIN_ASPECT_RATIO = 0.6;

/** `data:` is the only scheme lqip ever uses; anything else must not reach `url()`. */
const LQIP_PATTERN = /^data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+$/;

function assetMetadata(source: unknown): SanityImageAssetMetadata | undefined {
  if (typeof source !== 'object' || source === null) return undefined;
  const asset = (source as { asset?: unknown }).asset;
  if (typeof asset !== 'object' || asset === null) return undefined;
  const metadata = (asset as { metadata?: unknown }).metadata;
  if (typeof metadata !== 'object' || metadata === null) return undefined;
  return metadata as SanityImageAssetMetadata;
}

/**
 * The image's true width/height ratio, clamped so an extreme portrait cannot take
 * over the column. `undefined` when the source carries no dimensions, which is the
 * signal for the caller to keep whatever ratio it was going to use.
 */
export function imageAspectRatio(source: unknown): number | undefined {
  const ratio = assetMetadata(source)?.dimensions?.aspectRatio;
  if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio <= 0) return undefined;
  return Math.max(ratio, MIN_ASPECT_RATIO);
}

/**
 * The inline base64 placeholder Sanity already computed for the asset, when it is
 * a well-formed image data URI. Validated rather than trusted because the value is
 * interpolated into a CSS `url()`.
 */
export function imageLqip(source: unknown): string | undefined {
  const lqip = assetMetadata(source)?.lqip;
  if (typeof lqip !== 'string' || !LQIP_PATTERN.test(lqip)) return undefined;
  return lqip;
}
