import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPostCache, setPostCache, clearPostCache } from './postCache';
import type { SanityPost } from './types';

const makeMockPost = (slug: string): SanityPost => ({
  _id: `post-${slug}`,
  title: `Post ${slug}`,
  slug: { current: slug },
  excerpt: `Excerpt for ${slug}`,
  category: 'Technology',
  publishedAt: '2026-01-01T12:00:00Z',
});

describe('postCache', () => {
  beforeEach(() => {
    clearPostCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null for a slug that has not been cached', () => {
    expect(getPostCache('nonexistent')).toBeNull();
  });

  it('should store and retrieve a cached post', () => {
    const post = makeMockPost('test-post');
    setPostCache('test-post', post);

    const cached = getPostCache('test-post');
    expect(cached).toEqual(post);
  });

  it('should return the same reference that was cached', () => {
    const post = makeMockPost('ref-test');
    setPostCache('ref-test', post);

    expect(getPostCache('ref-test')).toBe(post);
  });

  it('should return null after TTL expires (10 minutes)', () => {
    const post = makeMockPost('ttl-test');
    setPostCache('ttl-test', post);

    // Still valid at 9 minutes
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(getPostCache('ttl-test')).toEqual(post);

    // Expired at 10 minutes + 1ms
    vi.advanceTimersByTime(1 * 60 * 1000 + 1);
    expect(getPostCache('ttl-test')).toBeNull();
  });

  it('should handle multiple slugs independently', () => {
    const post1 = makeMockPost('post-1');
    const post2 = makeMockPost('post-2');

    setPostCache('post-1', post1);
    setPostCache('post-2', post2);

    expect(getPostCache('post-1')).toEqual(post1);
    expect(getPostCache('post-2')).toEqual(post2);
  });

  it('should overwrite existing cache for the same slug', () => {
    const post1 = makeMockPost('overwrite');
    const post2 = { ...makeMockPost('overwrite'), title: 'Updated Title' };

    setPostCache('overwrite', post1);
    setPostCache('overwrite', post2);

    expect(getPostCache('overwrite')?.title).toBe('Updated Title');
  });

  it('should clear all cached posts', () => {
    setPostCache('a', makeMockPost('a'));
    setPostCache('b', makeMockPost('b'));

    clearPostCache();

    expect(getPostCache('a')).toBeNull();
    expect(getPostCache('b')).toBeNull();
  });

  it('should reject a malformed post on write (the hover prefetch does not validate)', () => {
    // Blog.tsx's hover prefetch writes raw fetch results straight in, and
    // BlogPost renders cache hits without re-checking — so the guard has to live
    // here or the ordinary hover-then-click flow skips it entirely.
    const drifted = { _id: 'post-x', title: 'No slug' } as unknown as SanityPost;

    expect(setPostCache('drifted', drifted)).toBe(false);
    expect(getPostCache('drifted')).toBeNull();
  });

  it('should leave an existing entry untouched when a malformed write is rejected', () => {
    const post = makeMockPost('keep-me');
    setPostCache('keep-me', post);

    setPostCache('keep-me', { ...post, slug: {} } as unknown as SanityPost);

    expect(getPostCache('keep-me')).toEqual(post);
  });

  it('should reject a post whose tags stopped dereferencing', () => {
    // `tags[]->` returning nulls is the drift the guards were written for; the
    // listing renders `tag.slug.current` inside a .map with no null check.
    const post = { ...makeMockPost('bad-tags'), tags: [null] } as unknown as SanityPost;

    expect(setPostCache('bad-tags', post)).toBe(false);
  });

  it('should evict the least-recently-used post past the size cap', () => {
    // Article bodies are the largest thing this app holds in memory, and the
    // listing's hover prefetch writes one per card. Without a cap the only way
    // an entry left was a TTL-expired read, which a key nobody reads again
    // never gets.
    for (let i = 0; i < 11; i++) {
      setPostCache(`post-${i}`, makeMockPost(`post-${i}`));
    }

    expect(getPostCache('post-0')).toBeNull();
    expect(getPostCache('post-1')).not.toBeNull();
    expect(getPostCache('post-10')).not.toBeNull();
  });

  it('should treat a read as use, so a re-read post outlives one merely written earlier', () => {
    for (let i = 0; i < 10; i++) {
      setPostCache(`post-${i}`, makeMockPost(`post-${i}`));
    }

    // The reader goes back to the oldest article, then opens one more.
    expect(getPostCache('post-0')).not.toBeNull();
    setPostCache('post-10', makeMockPost('post-10'));

    expect(getPostCache('post-0')).not.toBeNull();
    expect(getPostCache('post-1')).toBeNull();
  });

  it('should not reset the TTL when an entry is merely read', () => {
    // Recency ordering must not turn a read into a write: a stale body would
    // otherwise live forever as long as someone kept opening it.
    setPostCache('ttl-on-read', makeMockPost('ttl-on-read'));

    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(getPostCache('ttl-on-read')).not.toBeNull();

    vi.advanceTimersByTime(1 * 60 * 1000 + 1);
    expect(getPostCache('ttl-on-read')).toBeNull();
  });

  it('should delete expired entries from the cache on access', () => {
    const post = makeMockPost('cleanup');
    setPostCache('cleanup', post);

    vi.advanceTimersByTime(11 * 60 * 1000);

    // Access triggers deletion
    getPostCache('cleanup');

    // Internal map should no longer have the entry (verified by re-caching and checking)
    setPostCache('cleanup', post);
    expect(getPostCache('cleanup')).toEqual(post);
  });
});
