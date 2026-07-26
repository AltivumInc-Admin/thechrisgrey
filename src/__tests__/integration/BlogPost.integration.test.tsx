import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Mock Sanity client
const { mockFetch, mockGetPostCache, mockSetPostCache } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockGetPostCache: vi.fn().mockReturnValue(null),
  mockSetPostCache: vi.fn(),
}));

vi.mock('../../sanity', async () => {
  // Keep the real pure helpers (shape guards + error classification) so the
  // page's validation logic is exercised for real; stub only client + caches.
  const actual = await vi.importActual<typeof import('../../sanity')>('../../sanity');
  return {
    client: { fetch: mockFetch },
    urlFor: () => ({
      width: () => ({
        height: () => ({
          auto: () => ({ quality: () => ({ url: () => 'https://mock-image.jpg' }) }),
        }),
        auto: () => ({ quality: () => ({ url: () => 'https://mock-image.jpg' }) }),
      }),
    }),
    portableTextComponents: {},
    POST_BY_SLUG_QUERY: 'mock-post-query',
    getPostCache: mockGetPostCache,
    setPostCache: mockSetPostCache,
    classifySanityError: actual.classifySanityError,
    isSanityPost: actual.isSanityPost,
  };
});

// Mock SanityResponsiveImage to avoid @sanity/image-url parsing real asset refs
vi.mock('../../components/SanityResponsiveImage', () => ({
  default: ({ alt, className }: { alt: string; className?: string }) => (
    <img src="https://mock-image.jpg" alt={alt} className={className} />
  ),
}));

// Mock the routeManifest
vi.mock('../../utils/routeManifest', () => ({
  prefetchBlogPostChunk: vi.fn(),
  prefetchRoute: vi.fn(),
}));

// Mock @portabletext/react to avoid rendering complex rich text
vi.mock('@portabletext/react', () => ({
  PortableText: ({ value }: { value: unknown[] }) => (
    <div data-testid="portable-text">{Array.isArray(value) ? `${value.length} blocks` : 'no content'}</div>
  ),
}));

import BlogPost from '../../pages/BlogPost';

const mockPost = {
  _id: 'post-1',
  _updatedAt: '2026-01-16T00:00:00Z',
  title: 'Building AI Systems on AWS',
  slug: { current: 'building-ai-systems' },
  excerpt: 'A deep dive into building production AI systems on AWS.',
  category: 'Technology',
  publishedAt: '2026-01-15',
  readingTime: 8,
  isFeatured: true,
  seoTitle: null,
  seoDescription: null,
  pdfUrl: null,
  image: {
    asset: { _id: 'img-1', url: 'https://example.com/img1.jpg' },
    alt: 'AI Systems',
  },
  body: [{ _type: 'block', _key: 'key1', children: [{ _type: 'span', text: 'Hello world' }] }],
  tags: [
    { _id: 'tag-1', title: 'AI', slug: { current: 'ai' } },
    { _id: 'tag-2', title: 'AWS', slug: { current: 'aws' } },
  ],
  series: {
    _id: 'series-1',
    title: 'Cloud Architecture Series',
    slug: { current: 'cloud-architecture' },
    description: 'A multi-part series on cloud architecture.',
  },
  seriesOrder: 1,
  relatedPosts: [
    {
      _id: 'related-1',
      title: 'Serverless Patterns',
      slug: { current: 'serverless-patterns' },
      excerpt: 'Common serverless patterns.',
      category: 'Technology',
      publishedAt: '2026-01-10',
      image: null,
    },
  ],
  seriesPosts: [
    { _id: 'post-1', title: 'Building AI Systems on AWS', slug: { current: 'building-ai-systems' }, seriesOrder: 1 },
    { _id: 'post-2', title: 'Advanced Patterns', slug: { current: 'advanced-patterns' }, seriesOrder: 2 },
  ],
};

const renderBlogPost = (slug = 'building-ai-systems') => {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/blog/${slug}`]}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
};

describe('BlogPost Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPostCache.mockReturnValue(null);
    mockFetch.mockResolvedValue(mockPost);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading state', () => {
    it('shows loading skeleton while fetching the post', () => {
      mockFetch.mockReturnValue(new Promise(() => {}));
      renderBlogPost();

      // BlogPostArticleSkeleton renders aria-hidden elements
      // We just check that the main content is not yet visible
      expect(screen.queryByText('Building AI Systems on AWS')).not.toBeInTheDocument();
    });
  });

  describe('Post rendering', () => {
    it('renders the post title', async () => {
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Building AI Systems on AWS' })).toBeInTheDocument();
      });
    });

    it('renders the post category', async () => {
      renderBlogPost();

      await waitFor(() => {
        // "Technology" may appear in multiple places (e.g., category label and related post card)
        const categoryElements = screen.getAllByText('Technology');
        expect(categoryElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders the reading time', async () => {
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByText('8 min read')).toBeInTheDocument();
      });
    });

    it('renders the post excerpt', async () => {
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByText('A deep dive into building production AI systems on AWS.')).toBeInTheDocument();
      });
    });

    it('renders the post body via PortableText', async () => {
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByTestId('portable-text')).toBeInTheDocument();
      });
    });

    it('renders tag links', async () => {
      renderBlogPost();

      await waitFor(() => {
        const aiTag = screen.getByRole('link', { name: 'AI' });
        expect(aiTag).toHaveAttribute('href', '/blog?tag=ai');

        const awsTag = screen.getByRole('link', { name: 'AWS' });
        expect(awsTag).toHaveAttribute('href', '/blog?tag=aws');
      });
    });

    it('renders the "Back to Blog" link', async () => {
      renderBlogPost();

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to blog/i });
        expect(backLink).toHaveAttribute('href', '/blog');
      });
    });

    it('renders share buttons', async () => {
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByText('Share:')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
      });
    });
  });

  describe('Author bio section', () => {
    it('renders the author bio', async () => {
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByText('Who is the Author?')).toBeInTheDocument();
        expect(screen.getByText(/Christian Perez - Founder & CEO, Altivum Inc./i)).toBeInTheDocument();
      });
    });

    it('renders a link to the about page', async () => {
      renderBlogPost();

      await waitFor(() => {
        const learnMoreLink = screen.getByRole('link', {
          name: /learn more about christian/i,
        });
        expect(learnMoreLink).toHaveAttribute('href', '/about');
      });
    });
  });

  describe('Series navigation', () => {
    it('renders the series section when the post belongs to a series', async () => {
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByText('Cloud Architecture Series')).toBeInTheDocument();
        expect(screen.getByText('A multi-part series on cloud architecture.')).toBeInTheDocument();
      });
    });

    it('renders "View all posts in this series" link', async () => {
      renderBlogPost();

      await waitFor(() => {
        const seriesLink = screen.getByRole('link', {
          name: /view all posts in this series/i,
        });
        expect(seriesLink).toHaveAttribute('href', '/blog?series=cloud-architecture');
      });
    });

    it('renders next post navigation in the series', async () => {
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByText('Advanced Patterns')).toBeInTheDocument();
      });
    });
  });

  describe('Related posts', () => {
    it('renders related articles section', async () => {
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /what should you read next\?/i })).toBeInTheDocument();
        expect(screen.getByText('Serverless Patterns')).toBeInTheDocument();
      });
    });

    it('related posts link to their blog post page', async () => {
      renderBlogPost();

      await waitFor(() => {
        const relatedLink = screen.getByRole('link', { name: /serverless patterns/i });
        expect(relatedLink).toHaveAttribute('href', '/blog/serverless-patterns');
      });
    });
  });

  describe('Not found state', () => {
    it('shows article not found when post does not exist', async () => {
      mockFetch.mockResolvedValue(null);
      renderBlogPost('nonexistent-slug');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /article not found/i })).toBeInTheDocument();
      });

      expect(screen.getByText(/doesn't exist or has been moved/i)).toBeInTheDocument();

      const backLink = screen.getByRole('link', { name: /back to blog/i });
      expect(backLink).toHaveAttribute('href', '/blog');
    });
  });

  describe('Error state', () => {
    it('shows error state when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('API error'));
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /unable to load article/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      const backLink = screen.getByRole('link', { name: /back to blog/i });
      expect(backLink).toHaveAttribute('href', '/blog');
    });

    it('retries fetching when Try Again is clicked', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('API error'));
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /unable to load article/i })).toBeInTheDocument();
      });

      // Retry with success
      mockFetch.mockResolvedValueOnce(mockPost);
      await user.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Building AI Systems on AWS' })).toBeInTheDocument();
      });
    });
  });

  describe('Caching', () => {
    it('uses cached post data when available', async () => {
      mockGetPostCache.mockReturnValue(mockPost);
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Building AI Systems on AWS' })).toBeInTheDocument();
      });

      // Should not have called fetch since we had cache
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('caches the post after fetching', async () => {
      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Building AI Systems on AWS' })).toBeInTheDocument();
      });

      expect(mockSetPostCache).toHaveBeenCalledWith('building-ai-systems', mockPost);
    });
  });

  describe('SEO metadata', () => {
    it('sets the page title to the post title', async () => {
      renderBlogPost();

      await vi.waitFor(() => {
        expect(document.title).toBe('Building AI Systems on AWS | Christian Perez');
      });
    });

    it('uses seoTitle when provided', async () => {
      mockFetch.mockResolvedValue({ ...mockPost, seoTitle: 'Custom SEO Title' });
      renderBlogPost();

      await vi.waitFor(() => {
        expect(document.title).toBe('Custom SEO Title | Christian Perez');
      });
    });

    it('sets noindex when post is not found', async () => {
      mockFetch.mockResolvedValue(null);
      renderBlogPost('nonexistent');

      await vi.waitFor(() => {
        const meta = document.querySelector('meta[name="robots"]');
        expect(meta).toHaveAttribute('content', 'noindex, nofollow');
      });
    });
  });

  describe('Share functionality', () => {
    it('copies the URL to clipboard when Copy link is clicked', async () => {
      const user = userEvent.setup();
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      renderBlogPost();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /copy link/i }));

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('https://thechrisgrey.com/blog/building-ai-systems');
      });

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });
  });
});
