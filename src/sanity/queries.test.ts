import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BLOG_LISTING_QUERY, POST_BY_SLUG_QUERY, PODCAST_GUESTS_QUERY } from './queries';

describe('GROQ queries', () => {
  describe('BLOG_LISTING_QUERY', () => {
    it('should be a non-empty string', () => {
      expect(typeof BLOG_LISTING_QUERY).toBe('string');
      expect(BLOG_LISTING_QUERY.length).toBeGreaterThan(0);
    });

    it('should query for post type', () => {
      expect(BLOG_LISTING_QUERY).toContain('_type == "post"');
    });

    it('should require defined slug', () => {
      expect(BLOG_LISTING_QUERY).toContain('defined(slug.current)');
    });

    it('should order by featured and publishedAt', () => {
      expect(BLOG_LISTING_QUERY).toContain('isFeatured desc');
      expect(BLOG_LISTING_QUERY).toContain('publishedAt desc');
    });

    it('should project essential post fields', () => {
      const expectedFields = [
        '_id',
        'title',
        'slug',
        'excerpt',
        'category',
        'publishedAt',
        'readingTime',
        'isFeatured',
        'image',
      ];
      expectedFields.forEach((field) => {
        expect(BLOG_LISTING_QUERY).toContain(field);
      });
    });

    it('should include tags projection', () => {
      expect(BLOG_LISTING_QUERY).toContain('"tags"');
      expect(BLOG_LISTING_QUERY).toContain('tags[]->');
    });

    it('should include series projection', () => {
      expect(BLOG_LISTING_QUERY).toContain('"series"');
      expect(BLOG_LISTING_QUERY).toContain('series->');
    });

    it('should include seriesOrder field', () => {
      expect(BLOG_LISTING_QUERY).toContain('seriesOrder');
    });

    it('should NOT fetch the whole tag and series collections', () => {
      // Nothing reads them: the category chips come from the posts, and the
      // tag/series filters come from URL params set by links on the cards.
      expect(BLOG_LISTING_QUERY).not.toContain('_type == "tag"');
      expect(BLOG_LISTING_QUERY).not.toMatch(/\*\[\s*_type == "series"/);
    });

    it('should exclude draft documents in the query text', () => {
      expect(BLOG_LISTING_QUERY).toContain('!(_id in path("drafts.**"))');
    });
  });

  describe('POST_BY_SLUG_QUERY', () => {
    it('should be a non-empty string', () => {
      expect(typeof POST_BY_SLUG_QUERY).toBe('string');
      expect(POST_BY_SLUG_QUERY.length).toBeGreaterThan(0);
    });

    it('should query for post type', () => {
      expect(POST_BY_SLUG_QUERY).toContain('_type == "post"');
    });

    it('should filter by slug parameter', () => {
      expect(POST_BY_SLUG_QUERY).toContain('slug.current == $slug');
    });

    it('should select first result with [0]', () => {
      expect(POST_BY_SLUG_QUERY).toContain('[0]');
    });

    it('should include body field for full content', () => {
      expect(POST_BY_SLUG_QUERY).toContain('body[]');
    });

    it('should include relatedPosts projection', () => {
      expect(POST_BY_SLUG_QUERY).toContain('relatedPosts');
    });

    it('should include seriesPosts projection', () => {
      expect(POST_BY_SLUG_QUERY).toContain('seriesPosts');
    });

    it('should include SEO fields', () => {
      expect(POST_BY_SLUG_QUERY).toContain('seoTitle');
      expect(POST_BY_SLUG_QUERY).toContain('seoDescription');
    });

    it('should include pdfUrl field', () => {
      expect(POST_BY_SLUG_QUERY).toContain('pdfUrl');
    });

    it('should project _updatedAt so dateModified is not silently publishedAt', () => {
      // BlogPost.tsx reads `post._updatedAt || post.publishedAt` for both
      // article:modified_time and the Article schema's dateModified. Unprojected,
      // the left operand is always undefined and the page contradicts the
      // <lastmod> the sitemap generator emits from that same field.
      expect(POST_BY_SLUG_QUERY).toContain('_updatedAt');
    });

    it('should exclude draft documents in the query text', () => {
      expect(POST_BY_SLUG_QUERY).toContain('!(_id in path("drafts.**"))');
    });
  });

  describe('image projections', () => {
    // metadata.dimensions is what lets the body renderer reserve a box shaped
    // like the real image instead of hard-cropping to 4:3; metadata.lqip is the
    // placeholder that replaces a second, eager CDN request per image.
    it('every dereferenced image asset asks for lqip and dimensions', () => {
      for (const [name, query] of Object.entries({ BLOG_LISTING_QUERY, POST_BY_SLUG_QUERY, PODCAST_GUESTS_QUERY })) {
        // One asset projection, allowing a single level of nesting (`metadata { ... }`).
        const assetProjections = query.match(/asset->\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) ?? [];
        expect(assetProjections.length, `${name} must dereference at least one image asset`).toBeGreaterThan(0);
        for (const projection of assetProjections) {
          expect(projection, `${name}: ${projection}`).toContain('lqip');
          expect(projection, `${name}: ${projection}`).toContain('dimensions');
        }
      }
    });
  });

  describe('PODCAST_GUESTS_QUERY', () => {
    it('should be a non-empty string', () => {
      expect(typeof PODCAST_GUESTS_QUERY).toBe('string');
      expect(PODCAST_GUESTS_QUERY.length).toBeGreaterThan(0);
    });

    it('should query for podcastGuest type', () => {
      expect(PODCAST_GUESTS_QUERY).toContain('_type == "podcastGuest"');
    });

    it('should order by order ascending', () => {
      expect(PODCAST_GUESTS_QUERY).toContain('order(order asc)');
    });

    it('should project guest fields', () => {
      const expectedFields = [
        'name',
        'role',
        'branch',
        'episodeUrl',
        'image',
        'linkedinUrl',
        'instagramUrl',
        'websiteUrl',
        'websiteLabel',
        'order',
      ];
      expectedFields.forEach((field) => {
        expect(PODCAST_GUESTS_QUERY).toContain(field);
      });
    });
  });
});

describe('POST_BY_SLUG_QUERY projects every post field the detail page reads', () => {
  // The durable guard for consumed-but-unprojected fields — the class of bug that
  // made `post._updatedAt || post.publishedAt` dead code for the life of the
  // feature. Derived from the page source, so it fails when a new `post.x` read
  // appears without a matching projection rather than needing a hand-edited list.
  //
  // Fields resolved inside the query rather than stored under the same name.
  const PROJECTED_UNDER_ANOTHER_NAME = new Set<string>([
    // `"category": coalesce(category->title, category)` — the alias is quoted.
    'category',
  ]);

  it('every `post.<field>` read in BlogPost.tsx appears in the projection', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/BlogPost.tsx'), 'utf8');
    const read = new Set([...source.matchAll(/\bpost\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]));

    expect(read.size, 'BlogPost.tsx must read at least one post field').toBeGreaterThan(0);
    for (const field of read) {
      if (PROJECTED_UNDER_ANOTHER_NAME.has(field)) {
        expect(POST_BY_SLUG_QUERY, `"${field}" must be projected under its alias`).toContain(`"${field}"`);
        continue;
      }
      expect(POST_BY_SLUG_QUERY, `BlogPost.tsx reads post.${field}, which the query never projects`).toContain(field);
    }
  });
});
