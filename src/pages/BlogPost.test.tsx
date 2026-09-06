import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { mockFetch, mockGetPostCache, mockSetPostCache, mockIsPrerender, mockCaptureError } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockGetPostCache: vi.fn().mockReturnValue(null),
  mockSetPostCache: vi.fn(),
  mockIsPrerender: vi.fn(() => false),
  mockCaptureError: vi.fn(),
}));

vi.mock('../sanity', async () => {
  // Keep the real shape guard and error classifier so the failure branches are
  // reached the way production reaches them.
  const actual = await vi.importActual<typeof import('../sanity')>('../sanity');
  return {
    client: { fetch: mockFetch },
    urlFor: () => ({ width: () => ({ height: () => ({ auto: () => ({ quality: () => ({ url: () => '' }) }) }) }) }),
    portableTextComponents: {},
    POST_BY_SLUG_QUERY: 'mock-post-query',
    getPostCache: mockGetPostCache,
    setPostCache: mockSetPostCache,
    classifySanityError: actual.classifySanityError,
    isSanityPost: actual.isSanityPost,
  };
});

vi.mock('../utils/prerender', () => ({ isPrerender: mockIsPrerender }));

vi.mock('../utils/rum', async () => {
  const actual = await vi.importActual<typeof import('../utils/rum')>('../utils/rum');
  return { ...actual, isRumInitialized: true, captureError: mockCaptureError };
});

// Stand-in for the real <SEO>, whose effect is what sets
// window.__PRERENDER_READY__ — rendering it at all is the behaviour under test.
vi.mock('../components/SEO', () => ({
  SEO: ({ noindex }: { noindex?: boolean }) => <div data-testid="seo" data-noindex={noindex ? 'true' : 'false'} />,
}));

vi.mock('../assets/profile1.jpeg?responsive', () => ({
  default: {
    fallback: { src: '/mock-profile1.jpeg', width: 1200, height: 1500 },
    avif: [{ src: '/mock-profile1.avif', width: 1200 }],
    webp: [{ src: '/mock-profile1.webp', width: 1200 }],
    width: 1200,
    height: 1500,
  },
}));

import BlogPost from './BlogPost';

const renderBlogPost = (slug = 'a-real-post') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/blog/${slug}`]}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

describe('BlogPost failure branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPostCache.mockReturnValue(null);
    mockIsPrerender.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('prerender safety', () => {
    it('still emits noindex metadata for a visitor who lands on a missing post', async () => {
      mockFetch.mockResolvedValue(null);
      renderBlogPost('missing-post');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /article not found/i })).toBeInTheDocument();
      });
      expect(screen.getByTestId('seo')).toHaveAttribute('data-noindex', 'true');
    });

    it('withholds the prerender ready signal when a real post 404s during the crawl', async () => {
      // <SEO> sets window.__PRERENDER_READY__, the crawl's only readiness gate.
      // Rendering it here would snapshot a noindex "Article Not Found" page into
      // dist/blog/<slug>.html for a post the sitemap still advertises.
      mockIsPrerender.mockReturnValue(true);
      mockFetch.mockResolvedValue(null);
      renderBlogPost('a-real-post');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /article not found/i })).toBeInTheDocument();
      });
      expect(screen.queryByTestId('seo')).not.toBeInTheDocument();
    });

    it('withholds the prerender ready signal when the build-time fetch fails', async () => {
      mockIsPrerender.mockReturnValue(true);
      mockFetch.mockRejectedValue(new Error('Sanity 503'));
      renderBlogPost('a-real-post');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /unable to load article/i })).toBeInTheDocument();
      });
      expect(screen.queryByTestId('seo')).not.toBeInTheDocument();
    });
  });

  describe('failure reporting', () => {
    it('reports a fetch failure with the real Error, not a flattened string', async () => {
      const failure = new Error('Sanity 503');
      mockFetch.mockRejectedValue(failure);
      renderBlogPost('a-real-post');

      await waitFor(() => {
        expect(mockCaptureError).toHaveBeenCalledWith(
          failure,
          expect.objectContaining({ event: 'fetch_failed', slug: 'a-real-post' }),
        );
      });
    });

    it('reports shape drift, which no other telemetry can see', async () => {
      // The HTTP request succeeded, so RUM's http telemetry stays silent; this
      // report is the only signal that a CMS change broke the post.
      mockFetch.mockResolvedValue({ _id: 'post-1', title: 'Missing required fields' });
      renderBlogPost('malformed-post');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /unable to load article/i })).toBeInTheDocument();
      });
      expect(mockCaptureError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ event: 'shape_validation_failed', slug: 'malformed-post' }),
      );
      expect(mockSetPostCache).not.toHaveBeenCalled();
    });
  });
});
