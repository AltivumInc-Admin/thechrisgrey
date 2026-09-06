import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Mock Sanity client at the module boundary
const { mockFetch, mockGetBlogListingCache, mockSetBlogListingCache, mockGetPostCache, mockSetPostCache } = vi.hoisted(
  () => ({
    mockFetch: vi.fn(),
    mockGetBlogListingCache: vi.fn().mockReturnValue(null),
    mockSetBlogListingCache: vi.fn(),
    mockGetPostCache: vi.fn().mockReturnValue(null),
    mockSetPostCache: vi.fn(),
  }),
);

vi.mock('../../sanity', async () => {
  // Keep the real pure helpers (shape guards + error classification) so the
  // page's validation logic is exercised for real; stub only client + caches.
  const actual = await vi.importActual<typeof import('../../sanity')>('../../sanity');
  return {
    client: { fetch: mockFetch },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    urlFor: (_source: unknown) => ({
      width: () => ({ height: () => ({ auto: () => ({ quality: () => ({ url: () => 'https://mock-image.jpg' }) }) }) }),
    }),
    BLOG_LISTING_QUERY: 'mock-blog-query',
    POST_BY_SLUG_QUERY: 'mock-post-query',
    getBlogListingCache: mockGetBlogListingCache,
    setBlogListingCache: mockSetBlogListingCache,
    getPostCache: mockGetPostCache,
    setPostCache: mockSetPostCache,
    classifySanityError: actual.classifySanityError,
    isBlogListingResult: actual.isBlogListingResult,
    isRenderableImageSource: actual.isRenderableImageSource,
    isSanityPost: actual.isSanityPost,
    isSanityPostPreview: actual.isSanityPostPreview,
  };
});

// Mock SanityResponsiveImage to avoid @sanity/image-url parsing real asset refs
vi.mock('../../components/SanityResponsiveImage', () => ({
  default: ({ alt, className }: { alt: string; className?: string }) => (
    <img src="https://mock-image.jpg" alt={alt} className={className} />
  ),
}));

// Mock the routeManifest used by Blog page
vi.mock('../../utils/routeManifest', () => ({
  prefetchBlogPostChunk: vi.fn(),
  prefetchRoute: vi.fn(),
}));

import Blog from '../../pages/Blog';

const mockPosts = [
  {
    _id: 'post-1',
    title: 'Building AI Systems on AWS',
    slug: { current: 'building-ai-systems' },
    excerpt: 'A deep dive into building production AI systems on AWS.',
    category: 'Technology',
    publishedAt: '2026-01-15',
    readingTime: 8,
    isFeatured: true,
    image: { asset: { _id: 'img-1', url: 'https://example.com/img1.jpg' }, alt: 'AI Systems' },
    tags: [
      { _id: 'tag-1', title: 'AI', slug: { current: 'ai' } },
      { _id: 'tag-2', title: 'AWS', slug: { current: 'aws' } },
    ],
    series: null,
    seriesOrder: null,
  },
  {
    _id: 'post-2',
    title: 'Leadership Lessons from Special Operations',
    slug: { current: 'leadership-lessons' },
    excerpt: 'What I learned about leadership during my time in the military.',
    category: 'Leadership',
    publishedAt: '2026-01-10',
    readingTime: 6,
    isFeatured: false,
    image: null,
    tags: [{ _id: 'tag-3', title: 'Leadership', slug: { current: 'leadership' } }],
    series: null,
    seriesOrder: null,
  },
  {
    _id: 'post-3',
    title: 'Cloud Architecture Part 1',
    slug: { current: 'cloud-arch-part-1' },
    excerpt: 'Introduction to modern cloud architecture patterns.',
    category: 'Technology',
    publishedAt: '2026-01-05',
    readingTime: 10,
    isFeatured: false,
    image: null,
    tags: [],
    series: {
      _id: 'series-1',
      title: 'Cloud Architecture Series',
      slug: { current: 'cloud-architecture' },
      description: 'A multi-part series on cloud architecture.',
    },
    seriesOrder: 1,
  },
];

const renderBlog = (route = '/blog') => {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>
        <Blog />
      </MemoryRouter>
    </HelmetProvider>,
  );
};

/** The article element wrapping a card, addressed by its visible title. */
const cardFor = (title: string): HTMLElement => {
  const card = screen.getByText(title).closest('article');
  if (!card) throw new Error(`No card found for "${title}"`);
  return card;
};

/** Wait past the hover-intent delay without asserting anything in the meantime. */
const waitPastHoverIntent = () => new Promise((resolve) => setTimeout(resolve, 250));

/** A full post that satisfies isSanityPost, as the hover prefetch expects. */
const validFullPost = {
  _id: 'post-1',
  title: 'Building AI Systems on AWS',
  slug: { current: 'building-ai-systems' },
  excerpt: 'A deep dive into building production AI systems on AWS.',
  category: 'Technology',
  publishedAt: '2026-01-15',
  body: [],
};

/** Route the listing query and the hover-prefetch query to separate payloads. */
const mockFetchRoutes = (postPayload: unknown, posts: unknown[] = mockPosts) => {
  mockFetch.mockImplementation(async (query: string) =>
    query === 'mock-post-query' ? postPayload : { posts, tags: [], series: [] },
  );
};

describe('Blog Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBlogListingCache.mockReturnValue(null);
    mockGetPostCache.mockReturnValue(null);
    mockFetch.mockResolvedValue({ posts: mockPosts, tags: [], series: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial rendering with Sanity data', () => {
    it('shows loading skeletons while fetching', () => {
      // Keep the fetch pending
      mockFetch.mockReturnValue(new Promise(() => {}));
      renderBlog();

      expect(screen.getByRole('status')).toHaveTextContent('Loading articles');
    });

    it('renders all blog posts after data loads', async () => {
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      expect(screen.getByText('Leadership Lessons from Special Operations')).toBeInTheDocument();
      expect(screen.getByText('Cloud Architecture Part 1')).toBeInTheDocument();
    });

    it('renders post excerpts', async () => {
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('A deep dive into building production AI systems on AWS.')).toBeInTheDocument();
      });
    });

    it('renders category labels for each post', async () => {
      renderBlog();

      await waitFor(() => {
        // "Technology" appears in the filter button AND in the post cards (2 posts),
        // plus possibly in "Read Article" links. Count should be >= 3
        const techLabels = screen.getAllByText('Technology');
        expect(techLabels.length).toBeGreaterThanOrEqual(3);
      });

      // "Leadership" appears as both a filter button and a post category label
      const leadershipLabels = screen.getAllByText('Leadership');
      expect(leadershipLabels.length).toBeGreaterThanOrEqual(2);
    });

    it('renders post tags as links', async () => {
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('AI')).toBeInTheDocument();
      });

      const aiTag = screen.getByRole('link', { name: 'AI' });
      expect(aiTag).toHaveAttribute('href', '/blog?tag=ai');
    });

    it('renders "Read Article" links for each post', async () => {
      renderBlog();

      await waitFor(() => {
        const readLinks = screen.getAllByText('Read Article');
        expect(readLinks).toHaveLength(3);
      });
    });

    it('caches the blog listing data after fetching', async () => {
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      expect(mockSetBlogListingCache).toHaveBeenCalledWith({
        posts: mockPosts,
        tags: [],
        series: [],
      });
    });

    it('uses cached data when available instead of fetching', async () => {
      mockGetBlogListingCache.mockReturnValue({ posts: mockPosts, tags: [], series: [] });
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Category filtering', () => {
    it('renders dynamically derived category filter buttons', async () => {
      renderBlog();

      // The category buttons are derived from the fetched posts and mount a tick
      // after the always-present "All" button, so assert all three inside the same
      // waitFor — a synchronous check on "Technology"/"Leadership" races the async
      // derivation and flakes on slower CI runners.
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Technology' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Leadership' })).toBeInTheDocument();
      });
    });

    it('filters posts when a category button is clicked', async () => {
      const user = userEvent.setup();
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Leadership' }));

      await waitFor(() => {
        expect(screen.getByText('Leadership Lessons from Special Operations')).toBeInTheDocument();
      });

      expect(screen.queryByText('Building AI Systems on AWS')).not.toBeInTheDocument();
    });

    it('shows active filter chip when a category is selected', async () => {
      const user = userEvent.setup();
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Technology' }));

      await waitFor(() => {
        expect(screen.getByText('Active filters:')).toBeInTheDocument();
      });
    });

    it('removes category filter when the filter chip is clicked', async () => {
      const user = userEvent.setup();
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Leadership' }));

      await waitFor(() => {
        expect(screen.queryByText('Building AI Systems on AWS')).not.toBeInTheDocument();
      });

      // Click "All" to clear the filter
      await user.click(screen.getByRole('button', { name: 'All' }));

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });
    });
  });

  describe('Series filtering via URL', () => {
    it('filters posts by series when ?series= param is present', async () => {
      renderBlog('/blog?series=cloud-architecture');

      await waitFor(() => {
        expect(screen.getByText('Cloud Architecture Part 1')).toBeInTheDocument();
      });

      // Non-series posts should not be visible
      expect(screen.queryByText('Building AI Systems on AWS')).not.toBeInTheDocument();
      expect(screen.queryByText('Leadership Lessons from Special Operations')).not.toBeInTheDocument();
    });

    it('shows series context banner when filtering by series', async () => {
      renderBlog('/blog?series=cloud-architecture');

      await waitFor(() => {
        expect(screen.getByText('Cloud Architecture Series')).toBeInTheDocument();
      });

      expect(screen.getByText('A multi-part series on cloud architecture.')).toBeInTheDocument();

      expect(screen.getByText('1 post in this series')).toBeInTheDocument();
    });
  });

  describe('Search filtering', () => {
    it('filters posts by search query', async () => {
      const user = userEvent.setup();
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search articles...');
      await user.type(searchInput, 'leadership');

      await waitFor(() => {
        expect(screen.getByText('Leadership Lessons from Special Operations')).toBeInTheDocument();
      });

      expect(screen.queryByText('Building AI Systems on AWS')).not.toBeInTheDocument();
    });
  });

  describe('Empty and error states', () => {
    it('shows empty state message when no posts match filters', async () => {
      const user = userEvent.setup();
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search articles...');
      await user.type(searchInput, 'xyznonexistent');

      await waitFor(() => {
        expect(screen.getByText('No posts match your filters.')).toBeInTheDocument();
      });

      // Clear filters button should be visible
      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('shows error state when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Unable to load posts')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('retries fetching when Try Again is clicked after error', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Unable to load posts')).toBeInTheDocument();
      });

      // Now resolve successfully on retry
      mockFetch.mockResolvedValueOnce({ posts: mockPosts, tags: [], series: [] });
      await user.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });
    });

    it('shows "no posts yet" when the Sanity response returns empty posts', async () => {
      mockFetch.mockResolvedValue({ posts: [], tags: [], series: [] });
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('No posts yet. Check back soon!')).toBeInTheDocument();
      });
    });
  });

  describe('SEO metadata', () => {
    it('sets the page title to Blog', async () => {
      renderBlog();

      await vi.waitFor(() => {
        expect(document.title).toBe('Blog | Christian Perez');
      });
    });
  });

  describe('Status live region', () => {
    // One region has to survive every branch. When the loading grid carried the
    // page's only role="status" it unmounted the moment results arrived, so a
    // screen reader heard nothing about the result count, a live filter change,
    // an empty result or a failed load.
    it('reports the result count once the listing loads', async () => {
      renderBlog();

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('3 articles');
      });
    });

    it('reports the new count as the visitor types in the search box', async () => {
      const user = userEvent.setup();
      renderBlog();

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('3 articles');
      });

      await user.type(screen.getByPlaceholderText('Search articles...'), 'leadership');

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('1 article');
      });
    });

    it('reports when no post matches the active filters', async () => {
      const user = userEvent.setup();
      renderBlog();

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('3 articles');
      });

      await user.type(screen.getByPlaceholderText('Search articles...'), 'xyznonexistent');

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('No articles match the current filters.');
      });
    });

    it('reports a failed load, which the error block alone never announced', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      renderBlog();

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Unable to load posts.');
      });
    });
  });

  describe('Filter accessibility', () => {
    it('marks the active category with aria-pressed', async () => {
      const user = userEvent.setup();
      renderBlog();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Technology' })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Technology' })).toHaveAttribute('aria-pressed', 'false');

      await user.click(screen.getByRole('button', { name: 'Technology' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Technology' })).toHaveAttribute('aria-pressed', 'true');
      });
      expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('names each active-filter chip with the removal it performs', async () => {
      renderBlog('/blog?category=Technology&tag=ai&q=deep');

      await waitFor(() => {
        expect(screen.getByText('Active filters:')).toBeInTheDocument();
      });

      // Without the labels the close icon is aria-hidden, so each chip announces
      // as its bare value - identical to the button that APPLIES that filter.
      expect(screen.getByRole('button', { name: 'Remove category filter: Technology' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove tag filter: ai' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear search: deep' })).toBeInTheDocument();
    });

    it('names the series chip with the series title rather than the URL slug', async () => {
      renderBlog('/blog?series=cloud-architecture');

      await waitFor(() => {
        expect(screen.getByText('Cloud Architecture Part 1')).toBeInTheDocument();
      });

      expect(
        screen.getByRole('button', { name: 'Remove series filter: Cloud Architecture Series' }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Series: cloud-architecture/)).not.toBeInTheDocument();
    });

    it('removes the category filter from the chip itself', async () => {
      const user = userEvent.setup();
      renderBlog('/blog?category=Leadership');

      await waitFor(() => {
        expect(screen.getByText('Leadership Lessons from Special Operations')).toBeInTheDocument();
      });
      expect(screen.queryByText('Building AI Systems on AWS')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Remove category filter: Leadership' }));

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });
    });

    it('gives every filter control at least a 44px tap target', async () => {
      renderBlog('/blog?category=Technology');

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      const controls = [
        screen.getByRole('button', { name: 'All' }),
        screen.getByRole('button', { name: 'Remove category filter: Technology' }),
        screen.getByRole('button', { name: 'Clear all' }),
        screen.getByRole('link', { name: 'AI' }),
      ];

      for (const control of controls) {
        expect(control.className).toContain('min-h-[44px]');
        expect(control.className).toContain('touch-manipulation');
      }
    });
  });

  describe('Post card links', () => {
    it('names the card link with the post title alone', async () => {
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      expect(screen.getByRole('link', { name: 'Building AI Systems on AWS' })).toHaveAttribute(
        'href',
        '/blog/building-ai-systems',
      );
      // The excerpt sits inside that link; without the aria-label it joins the
      // accessible name and the link announces as the whole card.
      expect(screen.queryByRole('link', { name: /A deep dive into building production/ })).not.toBeInTheDocument();
    });

    it('keeps the duplicate Read Article link out of the tree and the tab order', async () => {
      renderBlog();

      await waitFor(() => {
        expect(screen.getAllByText('Read Article')).toHaveLength(3);
      });

      // Same href as the card link, so exposing it doubles every card's stops.
      expect(screen.queryAllByRole('link', { name: /read article/i })).toHaveLength(0);
      for (const link of screen.getAllByText('Read Article')) {
        expect(link).toHaveAttribute('tabindex', '-1');
      }
    });
  });

  describe('Cover image guard', () => {
    it('renders the cover when the asset is renderable', async () => {
      renderBlog();

      await waitFor(() => {
        expect(screen.getByAltText('AI Systems')).toBeInTheDocument();
      });
    });

    it('falls back to the placeholder when the asset cannot be parsed', async () => {
      // `{ asset: {} }` is truthy but unparseable: @sanity/image-url throws on it,
      // and a throw during render blanks all of /blog through the ErrorBoundary.
      mockFetch.mockResolvedValue({
        posts: [{ ...mockPosts[0], image: { asset: {} } }],
        tags: [],
        series: [],
      });
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      expect(screen.queryByAltText('AI Systems')).not.toBeInTheDocument();
      expect(cardFor('Building AI Systems on AWS').querySelector('[data-material-icon="article"]')).not.toBeNull();
    });
  });

  describe('Hover prefetch', () => {
    it('waits for hover intent before pulling the full article', async () => {
      const user = userEvent.setup();
      mockFetchRoutes(validFullPost);
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await user.hover(cardFor('Building AI Systems on AWS'));
      // A pointer merely crossing a card must not cost a whole document.
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
      expect(mockFetch).toHaveBeenLastCalledWith('mock-post-query', { slug: 'building-ai-systems' });
    });

    it('cancels the prefetch when the pointer leaves before the delay elapses', async () => {
      const user = userEvent.setup();
      mockFetchRoutes(validFullPost);
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      const card = cardFor('Building AI Systems on AWS');
      await user.hover(card);
      await user.unhover(card);
      await waitPastHoverIntent();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('caches a prefetched article that passes the shape guard', async () => {
      const user = userEvent.setup();
      mockFetchRoutes(validFullPost);
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      await user.hover(cardFor('Building AI Systems on AWS'));

      await waitFor(() => {
        expect(mockSetPostCache).toHaveBeenCalledWith('building-ai-systems', validFullPost);
      });
    });

    it('refuses to cache a prefetched article whose shape drifted', async () => {
      // BlogPost renders a cache hit without revalidating, so an unguarded write
      // here is how a drifted payload reaches render on the hover-then-click path.
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const user = userEvent.setup();
      mockFetchRoutes({ _id: 'post-1', title: 'Building AI Systems on AWS' });
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      await user.hover(cardFor('Building AI Systems on AWS'));

      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('prefetch_shape_invalid'),
          expect.objectContaining({ slug: 'building-ai-systems' }),
        );
      });
      expect(mockSetPostCache).not.toHaveBeenCalled();
    });

    it('logs a failed prefetch and lets the card try again', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const user = userEvent.setup();
      mockFetch.mockImplementation(async (query: string) => {
        if (query === 'mock-post-query') throw new Error('Failed to fetch');
        return { posts: mockPosts, tags: [], series: [] };
      });
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });

      const card = cardFor('Building AI Systems on AWS');
      await user.hover(card);

      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('prefetch_failed'),
          expect.objectContaining({ slug: 'building-ai-systems', kind: 'network' }),
        );
      });

      // The slug is unmarked on failure, so a transient error does not kill this
      // card's prefetch for the rest of the visit.
      await user.unhover(card);
      await user.hover(card);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });

    it('stops prefetching once the per-visit ceiling is reached', async () => {
      const user = userEvent.setup();
      const manyPosts = Array.from({ length: 8 }, (_, i) => ({
        _id: `bulk-${i}`,
        title: `Bulk Post ${i}`,
        slug: { current: `bulk-post-${i}` },
        excerpt: `Excerpt ${i}`,
        category: 'Technology',
        publishedAt: '2026-01-01',
        image: null,
        tags: [],
        series: null,
        seriesOrder: null,
      }));
      mockFetchRoutes(validFullPost, manyPosts);
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Bulk Post 0')).toBeInTheDocument();
      });

      for (let i = 0; i < 6; i += 1) {
        await user.hover(cardFor(`Bulk Post ${i}`));
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledTimes(i + 2);
        });
      }

      // The seventh card is refused: one sweep must not pull the whole corpus of
      // article bodies into a cache that has no size cap.
      await user.hover(cardFor('Bulk Post 6'));
      await waitPastHoverIntent();

      expect(mockFetch).toHaveBeenCalledTimes(7);
    });
  });

  describe('Single batched listing fetch', () => {
    // The GROQ-shape tests in src/sanity/queries.noNPlusOne.test.ts prove the
    // listing query dereferences tags and series in-query. Only a render proves
    // the page ISSUES that query once instead of once per card, and only a
    // growing corpus makes the difference visible: an N+1 regression looks like
    // a rounding error at three posts and like an outage at a hundred.
    const bulkPosts = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        ...mockPosts[1],
        _id: `bulk-${i}`,
        title: `Bulk Post ${i}`,
        slug: { current: `bulk-post-${i}` },
        excerpt: `Excerpt ${i}`,
        tags: [],
      }));

    it.each([1, 10, 100])('fetches once for a listing of %i posts', async (count) => {
      mockFetch.mockResolvedValue({ posts: bulkPosts(count), tags: [], series: [] });
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText(`Bulk Post ${count - 1}`)).toBeInTheDocument();
      });

      // No hover is fired, so the prefetch path cannot account for a second call:
      // anything above one is the listing fetching per post.
      expect(mockFetch.mock.calls).toHaveLength(1);
    });
  });

  describe('Listing fetch lifecycle and reporting', () => {
    it('passes an abort signal so navigating away cancels the request', async () => {
      renderBlog();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'mock-blog-query',
        {},
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('drops only the drifted post, still renders the rest, and names what it dropped', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockResolvedValue({
        posts: [mockPosts[0], { _id: 'broken', title: 'Missing every other required field' }],
        tags: [],
        series: [],
      });
      renderBlog();

      // One bad document must cost one card, not the whole index.
      await waitFor(() => {
        expect(screen.getByText('Building AI Systems on AWS')).toBeInTheDocument();
      });
      expect(screen.queryByText('Unable to load posts')).not.toBeInTheDocument();

      // The HTTP call succeeded, so this report is the only signal an operator
      // gets. It has to name the document, or triage means diffing the dataset.
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('shape_validation_failed'),
        expect.objectContaining({ droppedIds: ['broken'] }),
      );
    });

    it('falls back to the error state only when no post survives validation', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockResolvedValue({
        posts: [{ _id: 'broken-1' }, { _id: 'broken-2' }],
        tags: [],
        series: [],
      });
      renderBlog();

      // Nothing to partially render, and the failure is deterministic, so this
      // is the one drift case that is still a page-level error.
      await waitFor(() => {
        expect(screen.getByText('Unable to load posts')).toBeInTheDocument();
      });
    });

    it('records an error capture when the listing fetch fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error('Network error'));
      renderBlog();

      await waitFor(() => {
        expect(screen.getByText('Unable to load posts')).toBeInTheDocument();
      });

      // log.error alone never leaves the browser (its Sentry gate tests the
      // redacted clone with instanceof Error). captureError is the path that
      // reaches RUM; with no app monitor configured it falls back to this
      // scoped line, so asserting it proves the capture path ran.
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RUM] uncaught_error'),
        expect.objectContaining({ scope: 'Blog', kind: 'network' }),
      );
    });
  });
});
