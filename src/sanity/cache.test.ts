import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBlogListingCache, setBlogListingCache, clearBlogListingCache } from './cache';
import type { BlogListingResult } from './types';

describe('cache', () => {
  const mockData: BlogListingResult = {
    posts: [
      {
        _id: 'post-1',
        title: 'Test Post',
        slug: { current: 'test-post' },
        excerpt: 'A test post excerpt',
        category: 'Technology',
        publishedAt: '2026-01-01',
      },
    ],
  };

  beforeEach(() => {
    // The cache is module-scoped and shared across tests in this file; without
    // this reset, "returns null when empty" would pass only by running first.
    clearBlogListingCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return null when cache is empty', () => {
    expect(getBlogListingCache()).toBeNull();
  });

  it('should return null when cache is empty even after another test populated it', () => {
    // Ordering guard: this test only means anything because beforeEach clears.
    setBlogListingCache(mockData);
    clearBlogListingCache();
    expect(getBlogListingCache()).toBeNull();
  });

  it('should return cached data after setting it', () => {
    setBlogListingCache(mockData);
    const result = getBlogListingCache();
    expect(result).toEqual(mockData);
  });

  it('should return the same data object that was set', () => {
    setBlogListingCache(mockData);
    const result = getBlogListingCache();
    expect(result?.posts).toHaveLength(1);
    expect(result?.posts[0].title).toBe('Test Post');
  });

  it('should return null after TTL (5 minutes) expires', () => {
    setBlogListingCache(mockData);

    // Verify data is cached
    expect(getBlogListingCache()).toEqual(mockData);

    // Advance time by 5 minutes + 1ms
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    // Cache should be expired
    expect(getBlogListingCache()).toBeNull();
  });

  it('should return data just before TTL expires', () => {
    setBlogListingCache(mockData);

    // Advance time to just under 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000 - 1);

    expect(getBlogListingCache()).toEqual(mockData);
  });

  it('should overwrite previous cache when set again', () => {
    const updatedData: BlogListingResult = {
      posts: [
        {
          _id: 'post-2',
          title: 'Updated Post',
          slug: { current: 'updated-post' },
          excerpt: 'An updated excerpt',
          category: 'AI',
          publishedAt: '2026-02-01',
        },
      ],
    };

    setBlogListingCache(mockData);
    setBlogListingCache(updatedData);

    const result = getBlogListingCache();
    expect(result).toEqual(updatedData);
    expect(result?.posts[0].title).toBe('Updated Post');
  });

  it('should reset TTL when cache is overwritten', () => {
    setBlogListingCache(mockData);

    // Advance time by 4 minutes
    vi.advanceTimersByTime(4 * 60 * 1000);

    // Overwrite cache (resets TTL)
    setBlogListingCache(mockData);

    // Advance another 4 minutes (total 8 minutes from start, but only 4 from last set)
    vi.advanceTimersByTime(4 * 60 * 1000);

    // Should still be valid since TTL was reset
    expect(getBlogListingCache()).toEqual(mockData);
  });

  it('should return null after cache expires and then remains null on subsequent reads', () => {
    setBlogListingCache(mockData);

    // Expire the cache
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    expect(getBlogListingCache()).toBeNull();
    // Second read should also be null
    expect(getBlogListingCache()).toBeNull();
  });

  it('should reject a malformed listing on write, so no caller can poison the cache', () => {
    // A post missing its required core: the guard must stop this at the cache,
    // not rely on every call site remembering to validate first.
    const drifted = { posts: [{ _id: 'only-an-id' }] } as unknown as BlogListingResult;

    expect(setBlogListingCache(drifted)).toBe(false);
    expect(getBlogListingCache()).toBeNull();
  });

  it('should leave a previously cached listing untouched when a malformed write is rejected', () => {
    setBlogListingCache(mockData);

    setBlogListingCache({ posts: 'not-an-array' } as unknown as BlogListingResult);

    expect(getBlogListingCache()).toEqual(mockData);
  });
});
