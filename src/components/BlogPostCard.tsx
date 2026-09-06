import ViewTransitionLink from './ViewTransitionLink';
import SanityResponsiveImage from './SanityResponsiveImage';
import Icon from './icons/Icon';
import { typography } from '../utils/typography';
import { formatDate } from '../utils/dateFormatter';
import { slugify } from '../utils/slugify';
// Imported from the module rather than the `../sanity` barrel: the barrel pulls
// in the configured client and PortableTextComponents, neither of which a card
// needs to render.
import { isRenderableImageSource } from '../sanity/guards';
import type { SanityPostPreview } from '../sanity/types';

interface BlogPostCardProps {
  post: SanityPostPreview;
  /**
   * `listing` is the two-column card on /blog (meta row, excerpt, tags, featured
   * badge); `related` is the compact three-up card under an article.
   */
  variant?: 'listing' | 'related';
  /** Hover-intent hook the listing uses to warm the article. Related cards pass neither. */
  onHover?: (slug: string) => void;
  onHoverEnd?: () => void;
}

/**
 * The cover box both variants share: a fixed 16:9 well, the hover overlay, and a
 * placeholder for a post with no usable image.
 *
 * `isRenderableImageSource` rather than `post.image?.asset`, because the post
 * guards validate six scalar fields and never inspect `image`. A truthy-but-
 * unparseable asset makes @sanity/image-url throw, and a throw during render
 * takes the whole route to the top-level ErrorBoundary instead of falling
 * through to the placeholder — which is the point of having a placeholder.
 */
function CardCover({
  post,
  widths,
  sizes,
  quality,
  iconClassName,
}: {
  post: SanityPostPreview;
  widths: number[];
  sizes: string;
  quality?: number;
  iconClassName: string;
}) {
  if (!isRenderableImageSource(post.image)) {
    return (
      <div className="w-full h-full bg-altivum-navy flex items-center justify-center">
        <Icon name="article" className={iconClassName} />
      </div>
    );
  }

  return (
    <SanityResponsiveImage
      source={post.image}
      alt={post.image?.alt || post.title}
      aspectRatio={16 / 9}
      widths={widths}
      sizes={sizes}
      quality={quality}
      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
    />
  );
}

/**
 * One card for a blog post preview.
 *
 * The listing grid and the related-posts grid rendered the cover well, the hover
 * overlay, the responsive image and the article-icon fallback verbatim in two
 * places, so a fix to one (the renderable-image guard was added to the listing
 * only) silently left the other exposed. The variants keep their distinct
 * chrome; the parts that must not drift are shared.
 */
const BlogPostCard = ({ post, variant = 'listing', onHover, onHoverEnd }: BlogPostCardProps) => {
  const href = `/blog/${post.slug.current}`;

  if (variant === 'related') {
    return (
      <ViewTransitionLink to={href} className="group">
        <div className="relative overflow-hidden rounded-lg mb-4 aspect-video">
          <div className="absolute inset-0 bg-altivum-navy/20 group-hover:bg-transparent transition-colors duration-300 z-10"></div>
          <CardCover
            post={post}
            widths={[320, 400, 640]}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={75}
            iconClassName="text-3xl text-altivum-silver"
          />
        </div>
        <div className="text-xs text-altivum-gold uppercase tracking-wider font-medium mb-2">{post.category}</div>
        <h3
          id={slugify(post.title)}
          className="text-white group-hover:text-altivum-gold transition-colors"
          style={typography.cardTitleSmall}
        >
          {post.title}
        </h3>
      </ViewTransitionLink>
    );
  }

  return (
    <article
      className="group hover:-translate-y-0.5 transition-transform duration-300"
      onMouseEnter={onHover ? () => onHover(post.slug.current) : undefined}
      onMouseLeave={onHoverEnd}
    >
      {/* aria-label pins the accessible name to the title. Without it the name is
          the concatenation of everything this link wraps — meta row, heading and
          excerpt — roughly sixty words per card in a screen reader's link list. */}
      <ViewTransitionLink to={href} className="block" aria-label={post.title}>
        <div className="relative overflow-hidden rounded-lg mb-6 aspect-video">
          <div className="absolute inset-0 bg-altivum-navy/20 group-hover:bg-transparent transition-colors duration-300 z-10"></div>
          <CardCover
            post={post}
            widths={[320, 480, 640]}
            sizes="(max-width: 768px) 100vw, 50vw"
            iconClassName="text-4xl text-altivum-silver"
          />
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
            id={slugify(post.title)}
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
              className="inline-flex items-center min-h-[44px] px-2 py-1 text-xs bg-altivum-gold/10 text-altivum-gold rounded-sm hover:bg-altivum-gold/20 transition-colors touch-manipulation"
            >
              {tag.title}
            </ViewTransitionLink>
          ))}
        </div>
      )}
      {/* Same href as the card link above, so to assistive tech it is a duplicate
          stop named "Read Article" with no context. Hidden from the accessibility
          tree and the tab order; it stays as the visual hover affordance for
          pointer users. */}
      <ViewTransitionLink
        to={href}
        aria-hidden="true"
        tabIndex={-1}
        className="inline-flex items-center text-altivum-gold text-sm font-medium mt-3 group-hover:translate-x-2 transition-transform"
      >
        Read Article{' '}
        <Icon name="arrow_forward" className="text-sm ml-1 group-hover:translate-x-1 transition-transform" />
      </ViewTransitionLink>
    </article>
  );
};

export default BlogPostCard;
