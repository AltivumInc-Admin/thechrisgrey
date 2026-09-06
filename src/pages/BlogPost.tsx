import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ViewTransitionLink from '../components/ViewTransitionLink';
import { PortableText } from '@portabletext/react';
import { SEO } from '../components/SEO';
import NewsletterForm from '../components/NewsletterForm';
import { typography } from '../utils/typography';
import { formatDate } from '../utils/dateFormatter';
import { SOCIAL_LINKS } from '../constants/links';
import SocialIcon from '../components/SocialIcon';
import ResponsiveImage from '../components/ResponsiveImage';
// Profile image: AVIF/WebP responsive variants via the `?responsive` Vite plugin
// (VAL-PERF-004). The author bio portrait is shared across Home, BlogPost, and
// Podcast.
import profileImage from '../assets/profile1.jpeg?responsive';
import {
  client,
  urlFor,
  portableTextComponents,
  POST_BY_SLUG_QUERY,
  getPostCache,
  setPostCache,
  classifySanityError,
  isSanityPost,
  type SanityPost,
  type SanityPostPreview,
  type SanitySeriesPost,
  type SanityError,
} from '../sanity';
// Pure helpers imported from their own modules rather than the `../sanity`
// barrel, which the integration test replaces with a hand-enumerated factory:
// adding a helper here would otherwise fail that whole suite at first access.
import { isRenderableImageSource } from '../sanity/guards';
import { sanityError, isRetryableSanityError } from '../sanity/errors';
import { isAllowedHref } from '../sanity/href';
import ReadingProgressBar from '../components/ReadingProgressBar';
import BlogPostArticleSkeleton from '../components/BlogPostArticleSkeleton';
import Breadcrumbs from '../components/Breadcrumbs';
import SanityResponsiveImage from '../components/SanityResponsiveImage';
import BlogPostCard from '../components/BlogPostCard';
import { getYouTubeId } from '../utils/youtube';
import { buildVideoObjectSchema, buildArticleSchema } from '../utils/schemas';
import { createLogger } from '../utils/logger';
import { captureError, isRumInitialized } from '../utils/rum';
import { isPrerender } from '../utils/prerender';
import DirectAnswerSummary from '../components/aeo/DirectAnswerSummary';
import { slugify } from '../utils/slugify';
import Icon from '../components/icons/Icon';

const log = createLogger('BlogPost');

/**
 * Report a failure that leaves the reader on a dead-end page.
 *
 * A breadcrumb is not enough here: the logger redacts `extra` before deciding
 * whether to capture, which rebuilds an Error as `{}` (message and stack are
 * non-enumerable), and its Sentry destination is consent-gated on top of that.
 * So the raw Error is also handed to the cookieless RUM channel — the same
 * route ErrorBoundary takes — which covers every visitor. `errorMessage` keeps
 * the text readable in logs regardless of what redaction does to `error`.
 */
const reportFailure = (event: string, error: Error, context: Record<string, unknown>) => {
  log.error(event, { ...context, errorMessage: error.message, error });
  if (isRumInitialized) {
    captureError(error, { scope: 'BlogPost', event, ...context });
  }
};

/**
 * Extract word count from Portable Text blocks
 */
const getWordCount = (body: SanityPost['body']): number => {
  if (!body) return 0;

  const extractText = (blocks: typeof body): string => {
    return blocks
      .filter((block) => block._type === 'block')
      .map((block) => {
        if ('children' in block && Array.isArray(block.children)) {
          return block.children
            .filter((child: { _type: string }) => child._type === 'span')
            .map((span: { text?: string }) => span.text || '')
            .join('');
        }
        return '';
      })
      .join(' ');
  };

  const text = extractText(body);
  return text.split(/\s+/).filter((word) => word.length > 0).length;
};

/**
 * Extract YouTube video data from Portable Text body blocks
 */
const extractYouTubeVideos = (body: SanityPost['body']): { videoId: string; title: string }[] => {
  if (!body) return [];
  return body
    .filter((block) => block._type === 'youtube')
    .map((block) => {
      const url = (block as { url?: string }).url || '';
      const caption = (block as { caption?: string }).caption;
      const videoId = getYouTubeId(url);
      return videoId ? { videoId, title: caption || 'Video' } : null;
    })
    .filter((v): v is { videoId: string; title: string } => v !== null);
};

function SeriesNavigation({ seriesPosts, currentId }: { seriesPosts: SanitySeriesPost[]; currentId: string }) {
  if (seriesPosts.length <= 1) return null;

  const currentIndex = seriesPosts.findIndex((p) => p._id === currentId);
  const prevPost = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null;

  if (!prevPost && !nextPost) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
      {prevPost ? (
        <ViewTransitionLink
          to={`/blog/${prevPost.slug.current}`}
          className="group flex items-center gap-2 text-altivum-silver hover:text-altivum-gold transition-colors text-sm min-w-0"
        >
          <Icon name="arrow_back" className="text-sm shrink-0 group-hover:-translate-x-1 transition-transform" />
          <div className="min-w-0">
            <div className="text-xs text-altivum-silver uppercase tracking-wider mb-0.5">
              {prevPost.seriesOrder != null ? `Part ${prevPost.seriesOrder}` : 'Previous'}
            </div>
            <div className="truncate">{prevPost.title}</div>
          </div>
        </ViewTransitionLink>
      ) : (
        <div />
      )}
      {nextPost ? (
        <ViewTransitionLink
          to={`/blog/${nextPost.slug.current}`}
          className="group flex items-center gap-2 text-altivum-silver hover:text-altivum-gold transition-colors text-sm text-right min-w-0"
        >
          <div className="min-w-0">
            <div className="text-xs text-altivum-silver uppercase tracking-wider mb-0.5">
              {nextPost.seriesOrder != null ? `Part ${nextPost.seriesOrder}` : 'Next'}
            </div>
            <div className="truncate">{nextPost.title}</div>
          </div>
          <Icon name="arrow_forward" className="text-sm shrink-0 group-hover:translate-x-1 transition-transform" />
        </ViewTransitionLink>
      ) : (
        <div />
      )}
    </div>
  );
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<SanityPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<SanityError | null>(null);
  const [copied, setCopied] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPost = useCallback(async () => {
    if (!slug) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    // Check in-memory cache first (instant back-navigation). No re-validation
    // here on purpose: setPostCache runs isSanityPost on WRITE and stores
    // nothing that fails, so a hit is already the same shape the network path
    // enforces. That is the only place the check can live — the listing's hover
    // prefetch is a second writer, and hover-then-click is the common path.
    const cached = getPostCache(slug);
    if (cached) {
      setPost(cached);
      setIsLoading(false);
      return;
    }

    // Abort any previous in-flight fetch
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setFetchError(null);
    setNotFound(false);

    try {
      const data = await client.fetch<SanityPost>(POST_BY_SLUG_QUERY, { slug }, { signal: controller.signal });
      if (!data) {
        setNotFound(true);
      } else if (!isSanityPost(data)) {
        // Shape drift — don't cache or render a malformed post. The HTTP call
        // succeeded, so RUM's http telemetry sees nothing: this branch is the
        // only signal that a CMS change has broken every reader of this post.
        // The Error is both logged (so the logger has a real capture target,
        // not a string) and recorded, because breadcrumbs alone only surface
        // when some *other* error is captured.
        const shapeError = new Error(`Sanity post failed shape validation: ${slug}`);
        reportFailure('shape_validation_failed', shapeError, { slug, kind: 'malformed' });
        setFetchError(sanityError('malformed', 'Blog post'));
      } else {
        setPost(data);
        setPostCache(slug, data);
      }
    } catch (error) {
      // Ignore abort errors (expected on unmount or slug change)
      if (error instanceof Error && error.name === 'AbortError') return;
      const classified = classifySanityError(error, 'Blog post');
      reportFailure('fetch_failed', error instanceof Error ? error : new Error(String(error)), {
        slug,
        kind: classified.kind,
        message: classified.message,
      });
      setFetchError(classified);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // Slug-driven fetch with cache-then-network and AbortController cleanup.
    // fetchPost owns its setState transitions; migrating to a data-fetching
    // library to satisfy the strict rule is out of scope. See useSiteHealth /
    // Blog for the same suppression rationale.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPost();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchPost]);

  // Share functionality
  const shareUrl = `https://thechrisgrey.com/blog/${slug}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      log.error('clipboard_failed', { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const shareToTwitter = () => {
    const text = post?.title || 'Check out this article';
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const shareToLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  // Loading state
  if (isLoading) {
    return <BlogPostArticleSkeleton />;
  }

  // Fetch error state
  if (fetchError) {
    return (
      <div className="min-h-screen bg-altivum-dark">
        {/* Withheld under the prerender crawl: <SEO> is what sets
            window.__PRERENDER_READY__, the crawl's only readiness gate, so
            rendering it here would bake this noindex error page into
            dist/blog/<slug>.html for a post the sitemap still advertises. With
            no ready signal the crawl times out, counts the route failed, writes
            nothing, and the SPA shell (which refetches on hydration) ships
            instead. Real visitors are unaffected. */}
        {!isPrerender() && (
          <SEO
            title="Error Loading Article"
            description="An error occurred while loading this article."
            noindex={true}
          />
        )}
        <div className="pt-32 pb-24">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <Icon name="cloud_off" className="text-6xl text-altivum-silver mb-6" />
            <h1 className="text-white mb-4" style={typography.sectionHeader}>
              Unable to Load Article
            </h1>
            <p className="text-altivum-silver mb-8" style={typography.bodyText}>
              {fetchError.message}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Only the transport-level failures get a retry. A 'malformed'
                  article is deterministic — the same query returns the same
                  drifted document until the CMS is fixed — so the button
                  promised a remedy the reader could not reach, and Back to Blog
                  is the action that still works. */}
              {isRetryableSanityError(fetchError.kind) && (
                <button
                  onClick={fetchPost}
                  className="inline-flex items-center px-6 py-3 bg-altivum-gold text-altivum-dark font-medium uppercase tracking-wider text-sm hover:bg-white transition-colors duration-300"
                >
                  <Icon name="refresh" className="mr-2 text-sm" />
                  Try Again
                </button>
              )}
              <ViewTransitionLink
                to="/blog"
                className="inline-flex items-center px-6 py-3 border border-altivum-gold text-altivum-gold font-medium uppercase tracking-wider text-sm hover:bg-altivum-gold hover:text-altivum-dark transition-colors duration-300"
              >
                <Icon name="arrow_back" className="mr-2 text-sm" />
                Back to Blog
              </ViewTransitionLink>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 404 state
  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-altivum-dark">
        {/* Withheld under the prerender crawl for the same reason as the fetch
            error branch above — a build-time Sanity blip must not snapshot a
            noindex "Article Not Found" page over a real post. */}
        {!isPrerender() && (
          <SEO
            title="Article Not Found"
            description="The article you're looking for doesn't exist or has been moved."
            url={`https://thechrisgrey.com/blog/${slug}`}
            noindex={true}
          />
        )}
        <div className="pt-32 pb-24">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <Icon name="article" className="text-6xl text-altivum-silver mb-6" />
            <h1 className="text-white mb-4" style={typography.sectionHeader}>
              Article Not Found
            </h1>
            <p className="text-altivum-silver mb-8" style={typography.bodyText}>
              The article you're looking for doesn't exist or has been moved.
            </p>
            <ViewTransitionLink
              to="/blog"
              className="inline-flex items-center px-6 py-3 bg-altivum-gold text-altivum-dark font-semibold hover:bg-white transition-colors"
            >
              <Icon name="arrow_back" className="mr-2 text-sm" />
              Back to Blog
            </ViewTransitionLink>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { name: 'Home', url: 'https://thechrisgrey.com' },
    { name: 'Blog', url: 'https://thechrisgrey.com/blog' },
    { name: post.title, url: shareUrl },
  ];

  // Single canonical image URL for both the og:image meta tag and the Article
  // JSON-LD image field (VAL-SD-010). Uses the 1200x630 crop when a Sanity
  // image is available; otherwise the shared /og.png fallback.
  // Shape, not truthiness. `post.image?.asset` passes an asset that never
  // dereferenced, and urlFor is called here OUTSIDE any component boundary — so
  // it throws straight through the article's render, past the /og.png fallback
  // this expression exists to provide. One derived value serves the hero, the
  // og:image and the Article JSON-LD so the three cannot disagree.
  const coverImage = isRenderableImageSource(post.image) ? post.image : null;
  const articleImageUrl = coverImage
    ? urlFor(coverImage).width(1200).height(630).auto('format').quality(85).url()
    : 'https://thechrisgrey.com/og.png';

  return (
    <div className="min-h-screen bg-altivum-dark">
      <ReadingProgressBar />
      <SEO
        title={post.seoTitle || post.title}
        description={post.seoDescription || post.excerpt}
        image={coverImage ? articleImageUrl : undefined}
        imageAlt={coverImage?.alt ? coverImage.alt : `Cover image for "${post.title}" by Christian Perez`}
        url={shareUrl}
        type="article"
        datePublished={post.publishedAt}
        dateModified={post._updatedAt || post.publishedAt}
        breadcrumbs={breadcrumbs}
        structuredData={[
          buildArticleSchema({
            headline: post.title,
            description: post.excerpt,
            url: shareUrl,
            datePublished: post.publishedAt,
            dateModified: post._updatedAt || post.publishedAt,
            image: articleImageUrl,
            articleSection: post.category,
            keywords: post.tags?.map((t) => t.title).join(', ') || '',
            wordCount: post.body ? getWordCount(post.body) : undefined,
          }),
          ...extractYouTubeVideos(post.body).map((v) =>
            buildVideoObjectSchema({
              videoId: v.videoId,
              title: v.title,
              uploadDate: post.publishedAt,
            }),
          ),
        ]}
      />

      {/* Hero Section */}
      <section className="relative pt-24 pb-12">
        {/* Background Image */}
        {coverImage && (
          <div className="absolute inset-0 h-[50vh] overflow-hidden">
            <SanityResponsiveImage
              source={coverImage}
              alt={coverImage.alt || post.title}
              aspectRatio={16 / 5}
              widths={[640, 960, 1280, 1920]}
              sizes="100vw"
              quality={85}
              priority
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-linear-to-b from-altivum-dark/50 via-altivum-dark/80 to-altivum-dark"></div>
          </div>
        )}

        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 pt-16">
          {/* Visible breadcrumb trail — mirrors the BreadcrumbList JSON-LD
              emitted by <SEO> above. Ancestors are SPA-transition links; the
              current page (this post) carries aria-current="page". */}
          <Breadcrumbs items={breadcrumbs} className="mb-6" />

          {/* Back link */}
          <ViewTransitionLink
            to="/blog"
            className="inline-flex items-center text-altivum-silver hover:text-altivum-gold transition-colors mb-8"
          >
            <Icon name="arrow_back" className="mr-2 text-sm" />
            Back to Blog
          </ViewTransitionLink>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-altivum-gold uppercase tracking-wider font-medium mb-6">
            <span>{post.category}</span>
            <span className="text-altivum-silver">-</span>
            <span>{formatDate(post.publishedAt)}</span>
            {post.readingTime && (
              <>
                <span className="text-altivum-silver">-</span>
                <span>{post.readingTime} min read</span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-white mb-6" style={typography.heroHeader}>
            {post.title}
          </h1>

          {/* Excerpt — also serves as the direct-answer summary (data-aio-summary)
              before the first H2 in the article body (VAL-AEO-001, VAL-AEO-002).
              The excerpt is the author's own concise summary; marking it with the
              stable selector lets AI crawlers extract it from prerendered HTML. */}
          <DirectAnswerSummary text={post.excerpt} className="mb-8" />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map((tag) => (
                <ViewTransitionLink
                  key={tag._id}
                  to={`/blog?tag=${tag.slug.current}`}
                  className="px-3 py-1 text-sm bg-altivum-gold/10 text-altivum-gold rounded-sm hover:bg-altivum-gold/20 transition-colors"
                >
                  {tag.title}
                </ViewTransitionLink>
              ))}
            </div>
          )}

          {/* Share buttons */}
          <div className="flex items-center gap-4 pb-8 border-b border-white/10">
            <span className="text-altivum-silver text-sm">Share:</span>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-sm hover:border-altivum-gold hover:text-altivum-gold transition-colors text-altivum-silver text-sm"
              title="Copy link"
            >
              <Icon name={copied ? 'check' : 'link'} className="text-sm" />
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              onClick={shareToTwitter}
              className="flex items-center justify-center w-10 h-10 bg-white/5 border border-white/10 rounded-sm hover:border-altivum-gold hover:text-altivum-gold transition-colors text-altivum-silver"
              title="Share on X (Twitter)"
            >
              <SocialIcon platform="twitter" className="w-4 h-4" />
            </button>
            <button
              onClick={shareToLinkedIn}
              className="flex items-center justify-center w-10 h-10 bg-white/5 border border-white/10 rounded-sm hover:border-altivum-gold hover:text-altivum-gold transition-colors text-altivum-silver"
              title="Share on LinkedIn"
            >
              <SocialIcon platform="linkedin" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-12">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          {post.body ? (
            // No prose wrapper: @tailwindcss/typography is not installed and
            // index.css never registers it, so prose/prose-invert/prose-lg
            // emitted no CSS at all. Body typography comes from
            // portableTextComponents, which is where it should be changed.
            <PortableText value={post.body} components={portableTextComponents} />
          ) : (
            <p className="text-altivum-silver" style={typography.bodyText}>
              {post.excerpt}
            </p>
          )}

          {/* PDF Download. The href is CMS-supplied, so it goes through the same
              scheme allowlist as the Portable Text link mark and the
              bookReference card: the deployed Studio schema validates pdfUrl to
              http/https, but Studio validation is advisory and a document
              written through the API bypasses it. A rejected href renders no
              card at all rather than a download button pointing at
              `javascript:`/`data:`. */}
          {post.pdfUrl && isAllowedHref(post.pdfUrl) && (
            <div className="mt-16 pt-8 border-t border-white/10">
              <div className="bg-white/5 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border border-white/5 hover:border-altivum-gold/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-altivum-gold/10 rounded-lg flex items-center justify-center text-altivum-gold">
                    <Icon name="picture_as_pdf" className="text-3xl" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-lg">Download Article PDF</h4>
                    <p className="text-altivum-silver text-sm">Read the full article offline</p>
                  </div>
                </div>
                <a
                  href={post.pdfUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-altivum-gold text-altivum-dark font-semibold rounded-lg hover:bg-white transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  Download PDF
                  <Icon name="download" className="text-sm" />
                </a>
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Series Navigation */}
      {post.series && (
        <section className="py-12 border-t border-white/10">
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <div className="bg-altivum-navy/30 rounded-xl p-6 border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <Icon name="library_books" className="text-altivum-gold" />
                <div>
                  <p className="text-altivum-silver text-sm">Part of series</p>
                  <h3 id={slugify(post.series.title)} className="text-white font-medium">
                    {post.series.title}
                  </h3>
                </div>
              </div>
              {post.series.description && <p className="text-altivum-silver/70 text-sm">{post.series.description}</p>}
              <ViewTransitionLink
                to={`/blog?series=${post.series.slug.current}`}
                className="inline-flex items-center mt-4 text-altivum-gold text-sm hover:underline"
              >
                View all posts in this series
                <Icon name="arrow_forward" className="text-sm ml-1" />
              </ViewTransitionLink>
              {post.seriesPosts && <SeriesNavigation seriesPosts={post.seriesPosts} currentId={post._id} />}
            </div>
          </div>
        </section>
      )}

      {/* Author Bio Section */}
      <section className="py-12 border-t border-white/10">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start gap-6 p-6 bg-altivum-navy/30 rounded-lg border border-white/5">
            <ResponsiveImage
              src={profileImage}
              alt="Christian Perez"
              sizes="80px"
              className="w-20 h-20 rounded-full object-cover border-2 border-altivum-gold/30 shrink-0"
            />
            <div>
              <h3 id={slugify('Who is the Author?')} className="text-white font-semibold text-lg mb-1">
                Who is the Author?
              </h3>
              <p className="text-altivum-gold text-sm mb-3">Christian Perez - Founder & CEO, Altivum Inc.</p>
              <p className="text-altivum-silver text-sm leading-relaxed mb-4">
                Former Green Beret, host of The Vector Podcast, and author of "Beyond the Assessment." Christian writes
                about AI adoption, veteran entrepreneurship, and lessons learned from a decade in Special Operations.
              </p>
              <ViewTransitionLink
                to="/about"
                className="text-altivum-gold text-sm hover:text-white transition-colors inline-flex items-center gap-1"
              >
                Learn more about Christian
                <Icon name="arrow_forward" className="text-sm" />
              </ViewTransitionLink>
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {post.relatedPosts && post.relatedPosts.length > 0 && (
        <section className="py-16 border-t border-white/10">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <h2 id={slugify('What Should You Read Next?')} className="text-white mb-8" style={typography.sectionHeader}>
              What Should You Read Next?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {post.relatedPosts.map((relatedPost: SanityPostPreview) => (
                <BlogPostCard key={relatedPost._id} post={relatedPost} variant="related" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter & CTA */}
      <section className="py-16 bg-linear-to-b from-altivum-dark to-altivum-navy/30 border-t border-white/10">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h3 id={slugify('Enjoyed this article?')} className="text-white mb-4" style={typography.cardTitleLarge}>
            Enjoyed this article?
          </h3>
          <p className="text-altivum-silver mb-8" style={typography.bodyText}>
            Subscribe to get new articles delivered directly to your inbox.
          </p>

          <NewsletterForm variant="compact" />

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <ViewTransitionLink
              to="/blog"
              className="inline-flex items-center justify-center px-6 py-3 bg-white/5 border border-white/10 text-white font-medium hover:border-altivum-gold hover:text-altivum-gold transition-colors"
            >
              <Icon name="arrow_back" className="mr-2 text-sm" />
              More Articles
            </ViewTransitionLink>
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 bg-white/5 border border-white/10 text-white font-medium hover:border-altivum-gold hover:text-altivum-gold transition-colors"
            >
              Connect on LinkedIn
              <Icon name="open_in_new" className="ml-2 text-sm" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPost;
