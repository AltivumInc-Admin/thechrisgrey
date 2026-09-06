import { isMotionDisabled } from '../utils/motion';

const ShimmerBlock = ({ className }: { className: string }) => (
  <div data-shimmer className={`bg-altivum-navy/50 rounded-sm ${className}`} aria-hidden="true" />
);

/**
 * Loading placeholder for a single article.
 *
 * The layout deliberately mirrors BlogPost's hero — an absolutely positioned
 * h-[50vh] background behind a max-w-4xl column at pt-24 + pt-16, then a
 * max-w-3xl body column — so the article does not visibly jump up and widen
 * when the fetch lands.
 *
 * The shimmer is applied from the root as a descendant variant so it can be
 * dropped in one place: `animate-pulse` is a Tailwind utility that the
 * reduced-motion block in index.css does not neutralise, so it is gated at the
 * component level the way the rest of the site gates motion.
 *
 * Deliberately no <SEO> here (BlogPost returns this branch early), which is why
 * the tab title lags during load: rendering <SEO> on a skeleton would hand the
 * build-time prerender crawl a __PRERENDER_READY__ signal for a page with no
 * article in it.
 */
const BlogPostArticleSkeleton = () => {
  const shimmer = isMotionDisabled() ? '' : '[&_[data-shimmer]]:animate-pulse';

  return (
    <div className={`min-h-screen bg-altivum-dark ${shimmer}`} role="status" aria-label="Loading article">
      {/* Hero */}
      <section className="relative pt-24 pb-12">
        <div data-shimmer className="absolute inset-0 h-[50vh] bg-altivum-navy/30" aria-hidden="true" />

        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 pt-16">
          {/* Breadcrumbs */}
          <ShimmerBlock className="h-4 w-56 mb-6" />

          {/* Back link */}
          <ShimmerBlock className="h-5 w-32 mb-8" />

          {/* Category, date, reading time */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <ShimmerBlock className="h-4 w-24" />
            <ShimmerBlock className="h-4 w-32" />
            <ShimmerBlock className="h-4 w-24" />
          </div>

          {/* Title */}
          <ShimmerBlock className="h-12 w-full mb-3" />
          <ShimmerBlock className="h-12 w-3/4 mb-6" />

          {/* Excerpt */}
          <div className="space-y-3 mb-8">
            <ShimmerBlock className="h-5 w-full" />
            <ShimmerBlock className="h-5 w-5/6" />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            <ShimmerBlock className="h-7 w-16 rounded-full" />
            <ShimmerBlock className="h-7 w-20 rounded-full" />
          </div>

          {/* Share row */}
          <div className="flex items-center gap-4 pb-8 border-b border-white/10">
            <ShimmerBlock className="h-9 w-32" />
            <ShimmerBlock className="h-10 w-10" />
            <ShimmerBlock className="h-10 w-10" />
          </div>
        </div>
      </section>

      {/* Article body */}
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12">
        <div className="space-y-4">
          <ShimmerBlock className="h-4 w-full" />
          <ShimmerBlock className="h-4 w-full" />
          <ShimmerBlock className="h-4 w-5/6" />
          <ShimmerBlock className="h-4 w-full" />
          <ShimmerBlock className="h-4 w-4/5" />
          <ShimmerBlock className="h-4 w-full" />
          <ShimmerBlock className="h-4 w-3/4" />
          <ShimmerBlock className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
};

export default BlogPostArticleSkeleton;
