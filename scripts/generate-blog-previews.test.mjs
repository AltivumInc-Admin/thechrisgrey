import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateBlogPreviews, QUERY } from './generate-blog-previews.js';

// The 18 committed previews this file stands in for. Blog.tsx feeds them to
// buildBlogCollectionPageSchema, which omits `hasPart` entirely for an empty
// array — so losing them ships /blog with a CollectionPage referencing nothing.
const COMMITTED = [
  { title: 'A Post', slug: 'a-post' },
  { title: 'Another Post', slug: 'another-post' },
];

let dir;
let outputPath;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'blog-previews-'));
  outputPath = join(dir, 'generatedBlogPreviews.json');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

const seedCommitted = () => writeFileSync(outputPath, JSON.stringify(COMMITTED, null, 2) + '\n', 'utf-8');

describe('generateBlogPreviews', () => {
  it('writes the fetched previews', async () => {
    const fetchPosts = async () => [{ title: 'Fresh', slug: 'fresh', excerpt: 'ignored' }];
    const result = await generateBlogPreviews({ fetchPosts, outputPath });

    expect(result).toEqual({ status: 'written', count: 1 });
    expect(JSON.parse(readFileSync(outputPath, 'utf-8'))).toEqual([{ title: 'Fresh', slug: 'fresh' }]);
  });

  it('keeps the committed previews when the Sanity fetch fails', async () => {
    seedCommitted();
    const fetchPosts = async () => {
      throw new Error('ETIMEDOUT');
    };

    const result = await generateBlogPreviews({ fetchPosts, outputPath });

    expect(result.status).toBe('kept');
    expect(JSON.parse(readFileSync(outputPath, 'utf-8'))).toEqual(COMMITTED);
  });

  it('keeps the committed previews when the fetch returns no rows', async () => {
    seedCommitted();

    const result = await generateBlogPreviews({ fetchPosts: async () => [], outputPath });

    expect(result.status).toBe('kept');
    expect(JSON.parse(readFileSync(outputPath, 'utf-8'))).toEqual(COMMITTED);
  });

  it('bootstraps an empty array only when no previews file exists yet', async () => {
    expect(existsSync(outputPath)).toBe(false);

    const result = await generateBlogPreviews({
      fetchPosts: async () => {
        throw new Error('ETIMEDOUT');
      },
      outputPath,
    });

    expect(result.status).toBe('bootstrapped');
    expect(JSON.parse(readFileSync(outputPath, 'utf-8'))).toEqual([]);
  });
});

describe('QUERY', () => {
  it('orders by featured then publishedAt so hasPart matches the listing order', () => {
    expect(QUERY).toContain('order(isFeatured desc, publishedAt desc)');
  });
});
