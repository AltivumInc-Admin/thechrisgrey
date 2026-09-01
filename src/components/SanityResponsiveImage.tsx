import { urlFor } from '../sanity/client';
import type { SanityImageSource } from '@sanity/image-url';

interface SanityResponsiveImageProps {
  // Accepts any source @sanity/image-url can build from (dereferenced or _ref),
  // plus null/undefined so callers can pass optional fields and rely on the
  // early `if (!source) return null` guard below.
  source: SanityImageSource | null | undefined;
  alt: string;
  sizes: string;
  widths?: number[];
  aspectRatio?: number;
  quality?: number;
  priority?: boolean;
  className?: string;
}

/**
 * Responsive image component for Sanity-hosted images.
 * Generates srcSet with multiple widths and a blurred LQIP placeholder.
 */
const SanityResponsiveImage = ({
  source,
  alt,
  sizes,
  widths = [320, 480, 640, 800, 1200],
  aspectRatio = 16 / 9,
  quality = 80,
  priority = false,
  className = '',
}: SanityResponsiveImageProps) => {
  if (!source) return null;

  const buildUrl = (w: number) =>
    urlFor(source)
      .width(w)
      .height(Math.round(w / aspectRatio))
      .auto('format')
      .quality(quality)
      .url();

  const srcSet = widths.map((w) => `${buildUrl(w)} ${w}w`).join(', ');

  const fallbackSrc = buildUrl(widths[widths.length - 1]);

  // Tiny blurred placeholder for perceived instant load
  const lqipUrl = urlFor(source)
    .width(20)
    .height(Math.round(20 / aspectRatio))
    .quality(20)
    .blur(50)
    .auto('format')
    .url();

  // An empty `alt` marks the image as decorative. Per VAL-SEO-011, decorative
  // images must also carry role="presentation" or aria-hidden="true" so the
  // prerender SEO gate and accessibility tooling recognize the intent.
  const isDecorative = !alt.trim();

  // Intrinsic dimensions for the fallback src, derived from the same widths[] and
  // aspectRatio the srcSet is built from, so they can never disagree. The browser
  // uses the ratio of these to reserve the correct box before the image loads;
  // CSS (className) still controls the rendered size, so this changes layout for
  // nobody and only removes a shift. Callers that already wrap in an
  // aspect-ratio box get belt-and-braces; callers that don't now get CLS safety.
  const intrinsicWidth = widths[widths.length - 1];
  const intrinsicHeight = Math.round(intrinsicWidth / aspectRatio);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        backgroundImage: `url(${lqipUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <img
        src={fallbackSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={intrinsicWidth}
        height={intrinsicHeight}
        {...(isDecorative ? { role: 'presentation', 'aria-hidden': 'true' } : {})}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : undefined}
        className={className}
      />
    </div>
  );
};

export default SanityResponsiveImage;
