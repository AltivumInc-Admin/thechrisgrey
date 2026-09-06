import { describe, it, expect } from 'vitest';
import {
  isSanityImage,
  isRenderableImageSource,
  isSanityPost,
  isSanityPostPreview,
  isSanityTag,
  isSanitySeries,
  isBlogListingResult,
  filterValidPostPreviews,
  isPodcastGuest,
  isPodcastGuestArray,
} from './guards';

const validImage = { asset: { _id: 'image-abc-1200x800-jpg', url: 'https://cdn.sanity.io/x.jpg' }, alt: 'x' };
const refImage = { asset: { _ref: 'image-abc-1200x800-jpg' } };

const validPreview = {
  _id: 'post-1',
  title: 'A Post',
  slug: { current: 'a-post' },
  excerpt: 'An excerpt',
  category: 'Technology',
  publishedAt: '2026-01-15',
};

const validTag = { _id: 'tag-1', title: 'AI', slug: { current: 'ai' } };
const validSeries = { _id: 'series-1', title: 'Cloud', slug: { current: 'cloud' } };

const validGuest = { _id: 'g1', name: 'Jane', role: 'Founder', order: 1 };

describe('isSanityImage (strict, dereferenced)', () => {
  it('accepts a dereferenced asset', () => {
    expect(isSanityImage(validImage)).toBe(true);
  });
  it('rejects a raw reference (no _id/url)', () => {
    expect(isSanityImage(refImage)).toBe(false);
  });
  it('rejects missing asset / non-objects', () => {
    expect(isSanityImage({ asset: { _id: 'x' } })).toBe(false);
    expect(isSanityImage(null)).toBe(false);
    expect(isSanityImage(undefined)).toBe(false);
  });
});

describe('isRenderableImageSource (permissive)', () => {
  it('accepts both dereferenced and _ref forms', () => {
    expect(isRenderableImageSource(validImage)).toBe(true);
    expect(isRenderableImageSource(refImage)).toBe(true);
  });
  it('rejects an asset with neither _ref nor _id/url', () => {
    expect(isRenderableImageSource({ asset: {} })).toBe(false);
    expect(isRenderableImageSource({})).toBe(false);
    expect(isRenderableImageSource(undefined)).toBe(false);
  });
  it('rejects a present-but-malformed _ref that would throw inside urlFor', () => {
    // `@sanity/image-url` throws `Malformed asset _ref 'x'`, and urlFor is called
    // with no try/catch — an accepted bad ref takes the whole article down.
    expect(isRenderableImageSource({ asset: { _ref: 'x' } })).toBe(false);
    expect(isRenderableImageSource({ asset: { _ref: 'image-abc-jpg' } })).toBe(false);
    expect(isRenderableImageSource({ asset: { _ref: 'file-abc-1200x800-pdf' } })).toBe(false);
  });
});

describe('isSanityTag / isSanitySeries', () => {
  it('accepts well-formed dereferenced documents', () => {
    expect(isSanityTag(validTag)).toBe(true);
    expect(isSanitySeries({ ...validSeries, description: 'x' })).toBe(true);
  });
  it('rejects a null element or a missing slug', () => {
    expect(isSanityTag(null)).toBe(false);
    expect(isSanityTag({ _id: 't', title: 'AI' })).toBe(false);
    expect(isSanitySeries({ _id: 's', title: 'Cloud', slug: {} })).toBe(false);
  });
});

describe('isSanityPostPreview / isSanityPost', () => {
  it('accepts a record with all required core fields', () => {
    expect(isSanityPostPreview(validPreview)).toBe(true);
    expect(isSanityPost(validPreview)).toBe(true);
  });
  it('rejects when a required field is missing', () => {
    const { title: _omit, ...noTitle } = validPreview;
    void _omit;
    expect(isSanityPostPreview(noTitle)).toBe(false);
  });
  it('rejects when slug.current is missing', () => {
    expect(isSanityPost({ ...validPreview, slug: {} })).toBe(false);
  });
  it('accepts absent tags/series (GROQ returns null for an unset reference)', () => {
    expect(isSanityPostPreview({ ...validPreview, tags: [], series: null })).toBe(true);
    expect(isSanityPostPreview({ ...validPreview, tags: [validTag], series: validSeries })).toBe(true);
  });
  it('rejects a post whose tag dereference stopped resolving', () => {
    // Blog.tsx renders `tag.slug.current` inside a .map with no null check.
    expect(isSanityPostPreview({ ...validPreview, tags: [null] })).toBe(false);
    expect(isSanityPostPreview({ ...validPreview, tags: [{ _id: 't', title: 'AI' }] })).toBe(false);
    expect(isSanityPostPreview({ ...validPreview, tags: 'ai' })).toBe(false);
  });
  it('rejects a post whose series dereference stopped resolving', () => {
    expect(isSanityPostPreview({ ...validPreview, series: { _id: 's', title: 'Cloud' } })).toBe(false);
  });
});

describe('isBlogListingResult', () => {
  it('accepts a well-formed listing (incl. empty posts)', () => {
    expect(isBlogListingResult({ posts: [validPreview] })).toBe(true);
    expect(isBlogListingResult({ posts: [] })).toBe(true);
  });
  it('rejects when posts is missing or not an array', () => {
    expect(isBlogListingResult({})).toBe(false);
    expect(isBlogListingResult({ posts: 'nope' })).toBe(false);
  });
  it('rejects when a post is malformed', () => {
    expect(isBlogListingResult({ posts: [{ _id: 'x' }] })).toBe(false);
  });
  it('ignores extra top-level keys (the query no longer projects tags/series)', () => {
    expect(isBlogListingResult({ posts: [validPreview], tags: [], series: [] })).toBe(true);
  });
});

describe('filterValidPostPreviews', () => {
  it('keeps the good posts and drops only the drifted ones', () => {
    const second = { ...validPreview, _id: 'post-2', slug: { current: 'b-post' } };
    const kept = filterValidPostPreviews([validPreview, { _id: 'drifted' }, second]);

    expect(kept.map((p) => p._id)).toEqual(['post-1', 'post-2']);
  });
  it('returns an empty array when nothing survives', () => {
    expect(filterValidPostPreviews([{ _id: 'drifted' }, null])).toEqual([]);
  });
});

describe('isPodcastGuest / isPodcastGuestArray', () => {
  it('accepts a valid guest with and without a branch', () => {
    expect(isPodcastGuest(validGuest)).toBe(true);
    expect(isPodcastGuest({ ...validGuest, branch: 'army' })).toBe(true);
  });
  it('rejects an unknown branch value', () => {
    expect(isPodcastGuest({ ...validGuest, branch: 'starfleet' })).toBe(false);
  });
  it('rejects when order is not a number', () => {
    expect(isPodcastGuest({ ...validGuest, order: '1' })).toBe(false);
  });
  it('validates arrays element-wise', () => {
    expect(isPodcastGuestArray([validGuest])).toBe(true);
    expect(isPodcastGuestArray([validGuest, { _id: 'bad' }])).toBe(false);
    expect(isPodcastGuestArray('nope')).toBe(false);
  });
});
