import { createTtlCache } from './cache';
import { isSanityPost } from './guards';
import type { SanityPost } from './types';

// 10 minutes — longer than the listing TTL because a post body changes far less
// often than the index it is listed on.
//
// Capped at 10 entries: the values are whole article bodies (body[] +
// relatedPosts + seriesPosts), and the listing's hover prefetch writes one per
// card a pointer rests on. Ten covers a realistic reading session plus its
// back-navigations while keeping the ceiling bounded by the cache rather than by
// how long the tab stays open.
const MAX_CACHED_POSTS = 10;

const postCache = createTtlCache<SanityPost>(10 * 60 * 1000, isSanityPost, MAX_CACHED_POSTS);

export function getPostCache(slug: string): SanityPost | null {
  return postCache.get(slug);
}

export function setPostCache(slug: string, data: SanityPost): boolean {
  return postCache.set(slug, data);
}

export function clearPostCache(): void {
  postCache.clear();
}
