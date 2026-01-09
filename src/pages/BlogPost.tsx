import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PortableText } from '@portabletext/react';
import { SEO } from '../components/SEO';
import { typography } from '../utils/typography';
import { SOCIAL_LINKS } from '../constants/links';
import {
  client,
  urlFor,
  portableTextComponents,
  POST_BY_SLUG_QUERY,
  type SanityPost,
  type SanityPostPreview
} from '../sanity';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<SanityPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      if (!slug) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        const data = await client.fetch<SanityPost>(POST_BY_SLUG_QUERY, { slug });
        if (data) {
          setPost(data);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPost();
  }, [slug]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Share functionality
  const shareUrl = `https://thechrisgrey.com/blog/${slug}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareToTwitter = () => {
    const text = post?.title || 'Check out this article';
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const shareToLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-altivum-dark flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-altivum-gold border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-altivum-silver">Loading article...</p>
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
        />
        <div className="pt-32 pb-24">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <span className="material-icons text-6xl text-altivum-slate mb-6">article</span>
            <h1 className="text-white mb-4" style={typography.sectionHeader}>
              Article Not Found
            </h1>
            <p className="text-altivum-silver mb-8" style={typography.bodyText}>
              The article you're looking for doesn't exist or has been moved.
            </p>
            <Link
              to="/blog"
              className="inline-flex items-center px-6 py-3 bg-altivum-gold text-altivum-dark font-semibold hover:bg-white transition-colors"
            >
              <span className="material-icons mr-2 text-sm">arrow_back</span>
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-altivum-dark">
      <SEO
        title={post.seoTitle || post.title}
        description={post.seoDescription || post.excerpt}
        image={post.image?.asset ? urlFor(post.image).width(1200).height(630).url() : undefined}
        url={shareUrl}
        type="article"
        breadcrumbs={[
          { name: "Home", url: "https://thechrisgrey.com" },
          { name: "Blog", url: "https://thechrisgrey.com/blog" },
          { name: post.title, url: shareUrl }
        ]}
        structuredData={[
          {
            "@type": "BlogPosting",
            "@id": `${shareUrl}/#article`,
            "headline": post.title,
            "description": post.excerpt,
            "datePublished": post.publishedAt,
            "dateModified": post.publishedAt,
            "author": {
              "@id": "https://thechrisgrey.com/#person"
            },
            "publisher": {
              "@id": "https://altivum.ai/#organization"
            },
            "image": post.image?.asset ? urlFor(post.image).width(1200).url() : "https://thechrisgrey.com/og.png",
            "articleSection": post.category,
            "keywords": post.tags?.map(t => t.title).join(', ') || '',
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": shareUrl
            },
            "inLanguage": "en-US"
          }
        ]}
      />

      {/* Hero Section */}
      <section className="relative pt-24 pb-12">
        {/* Background Image */}
        {post.image?.asset && (
          <div className="absolute inset-0 h-[50vh] overflow-hidden">
            <img
              src={urlFor(post.image).width(1920).height(600).url()}
              alt={post.image.alt || post.title}
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-altivum-dark/50 via-altivum-dark/80 to-altivum-dark"></div>
          </div>
        )}

        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 pt-16">
          {/* Back link */}
          <Link
            to="/blog"
            className="inline-flex items-center text-altivum-silver hover:text-altivum-gold transition-colors mb-8"
          >
            <span className="material-icons mr-2 text-sm">arrow_back</span>
            Back to Blog
          </Link>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-altivum-gold uppercase tracking-wider font-medium mb-6">
            <span>{post.category}</span>
            <span className="text-altivum-slate">-</span>
            <span>{formatDate(post.publishedAt)}</span>
            {post.readingTime && (
              <>
                <span className="text-altivum-slate">-</span>
                <span>{post.readingTime} min read</span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-white mb-6" style={typography.heroHeader}>
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="text-altivum-silver/80 mb-8" style={typography.subtitle}>
            {post.excerpt}
          </p>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map(tag => (
                <Link
                  key={tag._id}
                  to={`/blog?tag=${tag.slug.current}`}
                  className="px-3 py-1 text-sm bg-altivum-gold/10 text-altivum-gold rounded hover:bg-altivum-gold/20 transition-colors"
                >
                  {tag.title}
                </Link>
              ))}
            </div>
          )}

          {/* Share buttons */}
          <div className="flex items-center gap-4 pb-8 border-b border-white/10">
            <span className="text-altivum-silver text-sm">Share:</span>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded hover:border-altivum-gold hover:text-altivum-gold transition-colors text-altivum-silver text-sm"
              title="Copy link"
            >
              <span className="material-icons text-sm">{copied ? 'check' : 'link'}</span>
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              onClick={shareToTwitter}
              className="flex items-center justify-center w-10 h-10 bg-white/5 border border-white/10 rounded hover:border-altivum-gold hover:text-altivum-gold transition-colors text-altivum-silver"
              title="Share on X (Twitter)"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
            <button
              onClick={shareToLinkedIn}
              className="flex items-center justify-center w-10 h-10 bg-white/5 border border-white/10 rounded hover:border-altivum-gold hover:text-altivum-gold transition-colors text-altivum-silver"
              title="Share on LinkedIn"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-12">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          {post.body ? (
            <div className="prose prose-invert prose-lg max-w-none">
              <PortableText
                value={post.body}
                components={portableTextComponents}
              />
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
                  <h3 className="text-white font-medium">{post.series.title}</h3>
                </div>
              </div>
              {post.series.description && (
                <p className="text-altivum-silver/70 text-sm">{post.series.description}</p>
              )}
              <Link
                to={`/blog?series=${post.series.slug.current}`}
                className="inline-flex items-center mt-4 text-altivum-gold text-sm hover:underline"
              >
                View all posts in this series
                <span className="material-icons text-sm ml-1">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Related Posts */}
      {post.relatedPosts && post.relatedPosts.length > 0 && (
        <section className="py-16 border-t border-white/10">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <h2 className="text-white mb-8" style={typography.sectionHeader}>
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {post.relatedPosts.map((relatedPost: SanityPostPreview) => (
                <Link
                  key={relatedPost._id}
                  to={`/blog/${relatedPost.slug.current}`}
                  className="group"
                >
                  <div className="relative overflow-hidden rounded-lg mb-4 aspect-video">
                    <div className="absolute inset-0 bg-altivum-navy/20 group-hover:bg-transparent transition-colors duration-300 z-10"></div>
                    {relatedPost.image?.asset ? (
                      <img
                        src={urlFor(relatedPost.image).width(400).height(225).url()}
                        alt={relatedPost.image.alt || relatedPost.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-altivum-navy flex items-center justify-center">
                        <span className="material-icons text-3xl text-altivum-slate">article</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-altivum-gold uppercase tracking-wider font-medium mb-2">
                    {relatedPost.category}
                  </div>
                  <h3 className="text-white group-hover:text-altivum-gold transition-colors" style={typography.cardTitleSmall}>
                    {relatedPost.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Author & CTA */}
      <section className="py-16 bg-gradient-to-b from-altivum-dark to-altivum-navy/30 border-t border-white/10">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h3 className="text-white mb-4" style={typography.cardTitleLarge}>
            Enjoyed this article?
          </h3>
          <p className="text-altivum-silver mb-8" style={typography.bodyText}>
            Subscribe to get new articles delivered directly to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/blog"
              className="inline-flex items-center justify-center px-6 py-3 bg-white/5 border border-white/10 text-white font-medium hover:border-altivum-gold hover:text-altivum-gold transition-colors"
            >
              <span className="material-icons mr-2 text-sm">arrow_back</span>
              More Articles
            </Link>
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 bg-altivum-gold text-altivum-dark font-medium hover:bg-white transition-colors"
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
