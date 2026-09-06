import { createClient } from '@sanity/client';
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';

// `perspective` is pinned rather than inherited. The `production` dataset is
// public (aclMode `public`), and an unauthenticated `?perspective=drafts` request
// is served without a token — so which document versions the public site renders
// must be a decision this repo declares, not an unpinned Content Lake default
// that changed with API version v2025-02-19. Sanity Studio creates a
// `drafts.<id>` copy the moment anyone edits a published post, which is what
// would otherwise put an in-progress draft on the live blog index.
// `published` is CDN-compatible; only the drafts/previewDrafts perspectives
// disable `useCdn`.
export const client = createClient({
  projectId: 'k5950b3w',
  dataset: 'production',
  apiVersion: '2024-01-01',
  perspective: 'published',
  useCdn: true, // Enable CDN for faster reads in production
  timeout: 10000, // 10s — fail fast if Sanity is down
});

// Image URL builder
const builder = createImageUrlBuilder({ projectId: 'k5950b3w', dataset: 'production' });

// `SanityImageSource` is the exact input `@sanity/image-url` accepts — it covers
// both the dereferenced form our listing/post queries return (`{ asset: { _id, url } }`)
// and the raw-reference form (`{ asset: { _ref } }`) that un-expanded fields like
// bookReference covers arrive as. Typing to it removes the `any` without
// over-narrowing and breaking either shape.
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

// The Vector Podcast project (separate Sanity project for podcast content)
export const podcastClient = createClient({
  projectId: 'uaxzdsfa',
  dataset: 'production',
  apiVersion: '2024-01-01',
  perspective: 'published', // Same reasoning as the blog client above.
  useCdn: true,
  timeout: 10000,
});

const podcastBuilder = createImageUrlBuilder({ projectId: 'uaxzdsfa', dataset: 'production' });

export function podcastUrlFor(source: SanityImageSource) {
  return podcastBuilder.image(source);
}
