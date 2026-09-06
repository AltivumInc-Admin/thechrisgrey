import { isBlogListingResult } from './guards';
import type { BlogListingResult } from './types';

export interface TtlCache<V> {
  get(key: string): V | null;
  /** Stores nothing and returns false when the value fails validation. */
  set(key: string, value: V): boolean;
  clear(): void;
}

/**
 * Keyed TTL cache shared by the blog-listing and post caches, which previously
 * implemented byte-for-byte the same expiry dance (read entry, compare Date.now()
 * against fetchedAt, evict, return null) over different key spaces — and then
 * diverged, one exposing a reset and the other not.
 *
 * Validation happens on WRITE, inside the cache, because it cannot be enforced at
 * the call sites: the listing page's hover prefetch wrote raw fetch results into
 * the post cache with no guard at all, and the post page rendered cache hits
 * without re-checking them — so on desktop, the ordinary hover-then-click flow
 * skipped the guards entirely. One enforcement point means a malformed document
 * cannot enter the cache no matter which caller put it there.
 *
 * `maxEntries` bounds a multi-key cache. Entries are only ever dropped by a
 * TTL-expired READ, so a key nobody reads again is never reclaimed: the post
 * cache holds whole article bodies and a visit that hovers and reads its way
 * around the blog accumulates the entire corpus for the life of the tab. With a
 * cap, the least-recently-used key is evicted instead.
 */
export function createTtlCache<V>(
  ttlMs: number,
  isValid: (value: unknown) => boolean,
  maxEntries?: number,
): TtlCache<V> {
  const entries = new Map<string, { data: V; fetchedAt: number }>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (Date.now() - entry.fetchedAt > ttlMs) {
        entries.delete(key);
        return null;
      }
      // Re-insert so Map iteration order tracks RECENCY of use, not of write:
      // the article a reader keeps returning to must not be the one evicted
      // because it was fetched first. The TTL still runs from the write.
      entries.delete(key);
      entries.set(key, entry);
      return entry.data;
    },
    set(key, value) {
      if (!isValid(value)) return false;
      entries.delete(key);
      entries.set(key, { data: value, fetchedAt: Date.now() });
      if (maxEntries !== undefined) {
        while (entries.size > maxEntries) {
          const oldest = entries.keys().next().value;
          if (oldest === undefined) break;
          entries.delete(oldest);
        }
      }
      return true;
    },
    clear() {
      entries.clear();
    },
  };
}

const LISTING_KEY = 'listing';
const listingCache = createTtlCache<BlogListingResult>(5 * 60 * 1000, isBlogListingResult);

export function getBlogListingCache(): BlogListingResult | null {
  return listingCache.get(LISTING_KEY);
}

export function setBlogListingCache(data: BlogListingResult): boolean {
  return listingCache.set(LISTING_KEY, data);
}

export function clearBlogListingCache(): void {
  listingCache.clear();
}
