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
// Profile image served from public/ at full quality (no Vite optimization)
const profileImage = '/profile1.jpeg';
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
import ReadingProgressBar from '../components/ReadingProgressBar';
import BlogPostArticleSkeleton from '../components/BlogPostArticleSkeleton';
import Breadcrumbs from '../components/Breadcrumbs';
import SanityResponsiveImage from '../components/SanityResponsiveImage';
import { getYouTubeId } from '../utils/youtube';
import { buildVideoObjectSchema } from '../utils/schemas';
import { createLogger } from '../utils/logger';
import DirectAnswerSummary from '../components/aeo/DirectAnswerSummary';
import { slugify } from '../utils/slugify';

const log = createLogger('BlogPost');

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
          <span className="material-icons text-sm shrink-0 group-hover:-translate-x-1 transition-transform">
            arrow_back
          </span>
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
          <span className="material-icons text-sm shrink-0 group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
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

    // Check in-memory cache first (instant back-navigation)
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
        // Shape drift — don't cache or render a malformed post.
        log.error('shape_validation_failed', { slug });
        setFetchError({ kind: 'malformed', message: 'We could not load this article right now. Please try again.' });
      } else {
        setPost(data);
        setPostCache(slug, data);
      }
    } catch (error) {
      // Ignore abort errors (expected on unmount or slug change)
      if (error instanceof Error && error.name === 'AbortError') return;
      const classified = classifySanityError(error, 'Blog post');
      log.error('fetch_failed', {
        kind: classified.kind,
        message: classified.message,
        error: error instanceof Error ? error.message : String(error),
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
        <SEO title="Error Loading Article" description="An error occurred while loading this article." noindex={true} />
        <div className="pt-32 pb-24">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <span className="material-icons text-6xl text-altivum-silver mb-6">cloud_off</span>
            <h1 className="text-white mb-4" style={typography.sectionHeader}>
              Unable to Load Article
            </h1>
            <p className="text-altivum-silver mb-8" style={typography.bodyText}>
              {fetchError.message}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={fetchPost}
                className="inline-flex items-center px-6 py-3 bg-altivum-gold text-altivum-dark font-medium uppercase tracking-wider text-sm hover:bg-white transition-colors duration-300"
              >
                <span className="material-icons mr-2 text-sm">refresh</span>
                Try Again
              </button>
              <ViewTransitionLink
                to="/blog"
                className="inline-flex items-center px-6 py-3 border border-altivum-gold text-altivum-gold font-medium uppercase tracking-wider text-sm hover:bg-altivum-gold hover:text-altivum-dark transition-colors duration-300"
              >
                <span className="material-icons mr-2 text-sm">arrow_back</span>
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
        <SEO
          title="Article Not Found"
          description="The article you're looking for doesn't exist or has been moved."
          url={`https://thechrisgrey.com/blog/${slug}`}
          noindex={true}
        />
        <div className="pt-32 pb-24">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <span className="material-icons text-6xl text-altivum-silver mb-6">article</span>
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
              <span className="material-icons mr-2 text-sm">arrow_back</span>
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

  return (
    <div className="min-h-screen bg-altivum-dark">
      <ReadingProgressBar />
      <SEO
        title={post.seoTitle || post.title}
        description={post.seoDescription || post.excerpt}
        image={
          post.image?.asset ? urlFor(post.image).width(1200).height(630).auto('format').quality(85).url() : undefined
        }
        url={shareUrl}
        type="article"
        datePublished={post.publishedAt}
        dateModified={post._updatedAt || post.publishedAt}
        breadcrumbs={breadcrumbs}
        structuredData={[
          {
            '@type': 'BlogPosting',
            '@id': `${shareUrl}/#article`,
            headline: post.title,
            description: post.excerpt,
            datePublished: post.publishedAt,
            dateModified: post._updatedAt || post.publishedAt,
            wordCount: post.body ? getWordCount(post.body) : undefined,
            // Reference the canonical Person node (emitted in the default @graph by
            // buildPersonSchema) rather than re-declaring a partial Person with a
            // colliding @id, which would leak per-post tag titles onto the global
            // Person identity.
            author: {
              '@id': 'https://thechrisgrey.com/#person',
            },
            publisher: {
              '@id': 'https://altivum.ai/#organization',
            },
            image: post.image?.asset
              ? urlFor(post.image).width(1200).auto('format').quality(85).url()
              : 'https://thechrisgrey.com/og.png',
            articleSection: post.category,
            keywords: post.tags?.map((t) => t.title).join(', ') || '',
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': shareUrl,
            },
            inLanguage: 'en-US',
          },
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
        {post.image?.asset && (
          <div className="absolute inset-0 h-[50vh] overflow-hidden">
            <SanityResponsiveImage
              source={post.image}
              alt={post.image.alt || post.title}
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
            <span className="material-icons mr-2 text-sm">arrow_back</span>
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
              <span className="material-icons text-sm">{copied ? 'check' : 'link'}</span>
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
            <div className="prose prose-invert prose-lg max-w-none">
              <PortableText value={post.body} components={portableTextComponents} />
            </div>
          ) : (
            <p className="text-altivum-silver" style={typography.bodyText}>
              {post.excerpt}
            </p>
          )}

          {/* PDF Download */}
          {post.pdfUrl && (
            <div className="mt-16 pt-8 border-t border-white/10">
              <div className="bg-white/5 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border border-white/5 hover:border-altivum-gold/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-altivum-gold/10 rounded-lg flex items-center justify-center text-altivum-gold">
                    <span className="material-icons text-3xl">picture_as_pdf</span>
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
                  <span className="material-icons text-sm">download</span>
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
                <span className="material-icons text-altivum-gold">library_books</span>
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
                <span className="material-icons text-sm ml-1">arrow_forward</span>
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
            <img
              src={profileImage}
              alt="Christian Perez"
              className="w-20 h-20 rounded-full object-cover border-2 border-altivum-gold/30 shrink-0"
            />
            <div>
              <h3 id={slugify('About the Author')} className="text-white font-semibold text-lg mb-1">
                About the Author
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
                <span className="material-icons text-sm">arrow_forward</span>
              </ViewTransitionLink>
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {post.relatedPosts && post.relatedPosts.length > 0 && (
        <section className="py-16 border-t border-white/10">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <h2 id={slugify('Related Articles')} className="text-white mb-8" style={typography.sectionHeader}>
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {post.relatedPosts.map((relatedPost: SanityPostPreview) => (
                <ViewTransitionLink key={relatedPost._id} to={`/blog/${relatedPost.slug.current}`} className="group">
                  <div className="relative overflow-hidden rounded-lg mb-4 aspect-video">
                    <div className="absolute inset-0 bg-altivum-navy/20 group-hover:bg-transparent transition-colors duration-300 z-10"></div>
                    {relatedPost.image?.asset ? (
                      <SanityResponsiveImage
                        source={relatedPost.image}
                        alt={relatedPost.image.alt || relatedPost.title}
                        aspectRatio={16 / 9}
                        widths={[320, 400, 640]}
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        quality={75}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-altivum-navy flex items-center justify-center">
                        <span className="material-icons text-3xl text-altivum-silver">article</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-altivum-gold uppercase tracking-wider font-medium mb-2">
                    {relatedPost.category}
                  </div>
                  <h3
                    id={slugify(relatedPost.title)}
                    className="text-white group-hover:text-altivum-gold transition-colors"
                    style={typography.cardTitleSmall}
                  >
                    {relatedPost.title}
                  </h3>
                </ViewTransitionLink>
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
              <span className="material-icons mr-2 text-sm">arrow_back</span>
              More Articles
            </ViewTransitionLink>
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 bg-white/5 border border-white/10 text-white font-medium hover:border-altivum-gold hover:text-altivum-gold transition-colors"
            >
              Connect on LinkedIn
              <span className="material-icons ml-2 text-sm">open_in_new</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPost;
