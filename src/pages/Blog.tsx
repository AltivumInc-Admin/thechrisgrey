import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ViewTransitionLink from '../components/ViewTransitionLink';
import { SEO } from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import NewsletterForm from '../components/NewsletterForm';
import { typography } from '../utils/typography';
import { formatDate } from '../utils/dateFormatter';
import { blogFAQs, buildItemListSchema } from '../utils/schemas';

const breadcrumbs = [
  { name: 'Home', url: 'https://thechrisgrey.com' },
  { name: 'Blog', url: 'https://thechrisgrey.com/blog' },
];

import {
  client,
  BLOG_LISTING_QUERY,
  POST_BY_SLUG_QUERY,
  getBlogListingCache,
  setBlogListingCache,
  getPostCache,
  setPostCache,
  classifySanityError,
  isBlogListingResult,
  type SanityPostPreview,
  type SanityPost,
  type BlogListingResult,
  type SanityError,
} from '../sanity';
import BlogPostSkeleton from '../components/BlogPostSkeleton';
import SanityResponsiveImage from '../components/SanityResponsiveImage';
import { prefetchBlogPostChunk } from '../utils/routeManifest';
import { createLogger } from '../utils/logger';

const log = createLogger('Blog');

const Blog = () => {
  const [posts, setPosts] = useState<SanityPostPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<SanityError | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filter values from URL
  const activeCategory = searchParams.get('category') || 'All';
  const activeTag = searchParams.get('tag') || null;
  const searchQuery = searchParams.get('q') || '';
  const activeSeries = searchParams.get('series') || null;

  const fetchBlogData = async () => {
    const cached = getBlogListingCache();
    if (cached) {
      setPosts(cached.posts);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    try {
      const result = await client.fetch<BlogListingResult>(BLOG_LISTING_QUERY);
      // Validate the shape before trusting/caching it — a CMS schema drift would
      // otherwise enter the cache and render as a blank page.
      if (!isBlogListingResult(result)) {
        log.error('shape_validation_failed');
        setFetchError({ kind: 'malformed', message: 'We could not load the blog right now. Please try again.' });
        return;
      }
      setBlogListingCache(result);
      setPosts(result.posts);
    } catch (error) {
      const classified = classifySanityError(error, 'Blog listing');
      log.error('fetch_failed', {
        kind: classified.kind,
        message: classified.message,
        error: error instanceof Error ? error.message : String(error),
      });
      setFetchError(classified);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Cache-then-fetch on mount. fetchBlogData manages its own setState
    // transitions (cache-hit shortcut, loading, success/error, finally).
    // Migrating to a data-fetching library to satisfy the strict rule is
    // out of scope; the pattern is canonical for this codebase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBlogData();
  }, []);

  // Filter helper function
  const setCategory = (category: string) => {
    const params = new URLSearchParams(searchParams);
    if (category === 'All') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    // Clear tag when changing category for cleaner UX
    params.delete('tag');
    setSearchParams(params);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchParams({});
  };

  // Client-side filtering logic
  const filteredPosts = useMemo(() => {
    const filtered = posts.filter((post) => {
      // Category filter
      if (activeCategory !== 'All' && post.category !== activeCategory) {
        return false;
      }

      // Tag filter
      if (activeTag && !post.tags?.some((tag) => tag.slug.current === activeTag)) {
        return false;
      }

      // Series filter
      if (activeSeries && post.series?.slug.current !== activeSeries) {
        return false;
      }

      // Search filter (title + excerpt)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = post.title.toLowerCase().includes(query);
        const matchesExcerpt = post.excerpt.toLowerCase().includes(query);
        if (!matchesTitle && !matchesExcerpt) {
          return false;
        }
      }

      return true;
    });

    // Sort by series order when viewing a series
    if (activeSeries) {
      filtered.sort((a, b) => (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999));
    }

    return filtered;
  }, [posts, activeCategory, activeTag, activeSeries, searchQuery]);

  // Prefetch blog post chunk + data on card hover
  const prefetchedSlugs = useRef<Set<string>>(new Set());
  const handleCardHover = useCallback((slug: string) => {
    if (prefetchedSlugs.current.has(slug)) return;
    prefetchedSlugs.current.add(slug);
    prefetchBlogPostChunk();
    if (!getPostCache(slug)) {
      client
        .fetch<SanityPost>(POST_BY_SLUG_QUERY, { slug })
        .then((data) => {
          if (data) setPostCache(slug, data);
        })
        .catch(() => {});
    }
  }, []);

  const categories = useMemo(() => {
    const unique = [...new Set(posts.map((p) => p.category).filter(Boolean))];
    return ['All', ...unique];
  }, [posts]);

  return (
    <div className="min-h-screen bg-altivum-dark">
      <SEO
        title="Blog"
        description="Essays and long-form writing from Christian Perez on leadership, technology, philosophy, history, and lessons from a life of service."
        keywords="Christian Perez blog, essays, leadership, technology, philosophy, history, veteran, long-form writing"
        url="https://thechrisgrey.com/blog"
        type="article"
        faq={blogFAQs}
        breadcrumbs={breadcrumbs}
        structuredData={[
          {
            '@type': 'Blog',
            '@id': 'https://thechrisgrey.com/blog/#blog',
            name: 'Christian Perez Blog',
            url: 'https://thechrisgrey.com/blog',
            description:
              'Essays and long-form writing on leadership, technology, philosophy, history, and lessons from a life of service',
            inLanguage: 'en-US',
            author: {
              '@id': 'https://thechrisgrey.com/#person',
            },
            publisher: {
              '@id': 'https://altivum.ai/#organization',
            },
          },
          ...(activeSeries && filteredPosts.length > 0 && filteredPosts[0]?.series
            ? [
                buildItemListSchema({
                  name: filteredPosts[0].series.title,
                  description: filteredPosts[0].series.description,
                  items: filteredPosts.map((p) => ({
                    name: p.title,
                    url: `https://thechrisgrey.com/blog/${p.slug.current}`,
                  })),
                }),
              ]
            : []),
        ]}
      />

      {/* Visible breadcrumb trail — mirrors the BreadcrumbList JSON-LD emitted
          by <SEO> above. Ancestors are SPA-transition links; the current page
          carries aria-current="page". */}
      <div className="pt-24 pb-3 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      {/* Hero Section */}
      <section className="py-32 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-2 bg-altivum-gold/10 rounded-md mb-6">
              <span className="text-altivum-gold font-semibold text-sm uppercase tracking-wider">Blog</span>
            </div>

            <h1 className="text-white mb-6" style={typography.heroHeader}>
              Essays & Reflections
            </h1>
            <div className="h-px w-24 bg-altivum-gold mb-8"></div>

            <p className="text-altivum-silver" style={typography.subtitle}>
              Long-form writing on leadership, technology, philosophy, history, and lessons from a life of service.
            </p>
          </div>
        </div>
      </section>

      {/* Search and Categories */}
      <section className="py-8 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Search Input */}
            <div className="relative w-full md:max-w-xs">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams);
                  if (e.target.value) {
                    params.set('q', e.target.value);
                  } else {
                    params.delete('q');
                  }
                  setSearchParams(params, { replace: true });
                }}
                className="w-full px-4 py-2 pl-10 bg-white/5 border border-white/10 rounded-full text-white placeholder-white/70 focus:outline-hidden focus:border-altivum-gold transition-colors"
              />
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-altivum-silver/50 text-lg">
                search
              </span>
              {searchQuery && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('q');
                    setSearchParams(params, { replace: true });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-altivum-silver/50 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <span className="material-icons text-lg" aria-hidden="true">
                    close
                  </span>
                </button>
              )}
            </div>

            {/* Category Buttons */}
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setCategory(category)}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeCategory === category
                      ? 'bg-white text-altivum-dark'
                      : 'bg-transparent text-altivum-silver border border-white/10 hover:border-altivum-gold hover:text-altivum-gold'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="h-px bg-linear-to-r from-transparent via-altivum-gold/15 to-transparent" />

      {/* Blog Posts */}
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Active Filters Display */}
          {(activeCategory !== 'All' || activeTag || activeSeries || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <span className="text-altivum-silver text-sm">Active filters:</span>

              {activeCategory !== 'All' && (
                <button
                  onClick={() => setCategory('All')}
                  className="flex items-center gap-1 px-3 py-1 bg-altivum-gold/20 text-altivum-gold rounded-full text-sm hover:bg-altivum-gold/30 transition-colors"
                >
                  {activeCategory}
                  <span className="material-icons text-xs">close</span>
                </button>
              )}

              {activeTag && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('tag');
                    setSearchParams(params);
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-altivum-gold/20 text-altivum-gold rounded-full text-sm hover:bg-altivum-gold/30 transition-colors"
                >
                  #{activeTag}
                  <span className="material-icons text-xs">close</span>
                </button>
              )}

              {activeSeries && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('series');
                    setSearchParams(params);
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-altivum-gold/20 text-altivum-gold rounded-full text-sm hover:bg-altivum-gold/30 transition-colors"
                >
                  <span className="material-icons text-xs">library_books</span>
                  Series: {activeSeries}
                  <span className="material-icons text-xs">close</span>
                </button>
              )}

              {searchQuery && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('q');
                    setSearchParams(params);
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-altivum-gold/20 text-altivum-gold rounded-full text-sm hover:bg-altivum-gold/30 transition-colors"
                >
                  "{searchQuery}"<span className="material-icons text-xs">close</span>
                </button>
              )}

              <button onClick={clearFilters} className="text-altivum-silver/70 text-sm hover:text-white underline ml-2">
                Clear all
              </button>
            </div>
          )}

          {activeSeries && filteredPosts.length > 0 && filteredPosts[0]?.series && (
            <div className="mb-10 p-6 bg-altivum-navy/30 rounded-lg border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-icons text-altivum-gold">library_books</span>
                <h2 className="text-white font-semibold text-lg">{filteredPosts[0].series.title}</h2>
              </div>
              {filteredPosts[0].series.description && (
                <p className="text-altivum-silver text-sm ml-9">{filteredPosts[0].series.description}</p>
              )}
              <p className="text-altivum-silver text-xs ml-9 mt-2">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'} in this series
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12" role="status" aria-label="Loading articles">
              {Array.from({ length: 6 }).map((_, i) => (
                <BlogPostSkeleton key={i} />
              ))}
            </div>
          ) : fetchError ? (
            <div className="text-center py-20">
              <span className="material-icons text-5xl text-altivum-silver mb-4 block">cloud_off</span>
              <p className="text-white mb-2" style={typography.cardTitleSmall}>
                Unable to load posts
              </p>
              <p className="text-altivum-silver mb-6" style={typography.bodyText}>
                {fetchError.message}
              </p>
              <button
                onClick={fetchBlogData}
                className="inline-flex items-center px-6 py-3 bg-altivum-gold text-altivum-dark font-medium uppercase tracking-wider text-sm hover:bg-white transition-colors duration-300"
              >
                <span className="material-icons mr-2 text-sm">refresh</span>
                Try Again
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-altivum-silver">No posts yet. Check back soon!</div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-icons text-5xl text-altivum-silver mb-4 block">search_off</span>
              <p className="text-altivum-silver mb-4">No posts match your filters.</p>
              <button onClick={clearFilters} className="text-altivum-gold hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {filteredPosts.map((post) => (
                <article
                  key={post._id}
                  className="group hover:-translate-y-0.5 transition-transform duration-300"
                  onMouseEnter={() => handleCardHover(post.slug.current)}
                >
                  <ViewTransitionLink to={`/blog/${post.slug.current}`} className="block">
                    <div className="relative overflow-hidden rounded-lg mb-6 aspect-video">
                      <div className="absolute inset-0 bg-altivum-navy/20 group-hover:bg-transparent transition-colors duration-300 z-10"></div>
                      {post.image?.asset ? (
                        <SanityResponsiveImage
                          source={post.image}
                          alt={post.image.alt || post.title}
                          aspectRatio={16 / 9}
                          widths={[320, 480, 640]}
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-altivum-navy flex items-center justify-center">
                          <span className="material-icons text-4xl text-altivum-silver">article</span>
                        </div>
                      )}
                      {post.isFeatured && (
                        <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-altivum-gold text-altivum-dark text-xs font-semibold uppercase tracking-wider rounded-sm">
                          Featured
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-xs text-altivum-gold uppercase tracking-wider font-medium">
                        <span>{post.category}</span>
                        <span>-</span>
                        <span>{formatDate(post.publishedAt)}</span>
                        {post.readingTime && (
                          <>
                            <span>-</span>
                            <span>{post.readingTime} min read</span>
                          </>
                        )}
                      </div>
                      <h3
                        className="text-white group-hover:text-altivum-gold transition-colors"
                        style={typography.cardTitleLarge}
                      >
                        {post.title}
                      </h3>
                      <p className="text-altivum-silver line-clamp-3" style={typography.bodyText}>
                        {post.excerpt}
                      </p>
                    </div>
                  </ViewTransitionLink>
                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {post.tags.slice(0, 3).map((tag) => (
                        <ViewTransitionLink
                          key={tag._id}
                          to={`/blog?tag=${tag.slug.current}`}
                          className="px-2 py-1 text-xs bg-altivum-gold/10 text-altivum-gold rounded-sm hover:bg-altivum-gold/20 transition-colors"
                        >
                          {tag.title}
                        </ViewTransitionLink>
                      ))}
                    </div>
                  )}
                  <ViewTransitionLink
                    to={`/blog/${post.slug.current}`}
                    className="inline-flex items-center text-altivum-gold text-sm font-medium mt-3 group-hover:translate-x-2 transition-transform"
                  >
                    Read Article{' '}
                    <span className="material-icons text-sm ml-1 group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </ViewTransitionLink>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <NewsletterForm variant="full" />
    </div>
  );
};

export default Blog;
