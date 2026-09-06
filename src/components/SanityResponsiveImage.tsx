import { urlFor } from '../sanity/client';
import { imageLqip } from '../sanity/imageMeta';
// Imported from the module rather than the `../sanity` barrel: the barrel pulls
// in PortableTextComponents, which imports this component back.
import { isRenderableImageSource } from '../sanity/guards';
import type { SanityImageSource } from '@sanity/image-url';

interface SanityResponsiveImageProps {
  // Accepts any source @sanity/image-url can build from (dereferenced or _ref),
  // plus null/undefined so callers can pass optional fields and rely on the
  // guard below.
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
  // Shape, not truthiness. `urlFor` is called up to six times below with no
  // try/catch and THROWS on anything it cannot parse — `{ asset: {} }`, a
  // `{ asset: { _id } }` that never dereferenced, a `_ref` that is not in the
  // `image-<hash>-<w>x<h>-<ext>` form — so a truthy-but-unparseable asset took
  // the whole page to the top-level ErrorBoundary. Every call site guarded (or
  // failed to guard) this for itself; the check belongs at the one render choke
  // point they all pass through, and callers keep their own guard only where
  // they render a placeholder instead.
  // `!source` is kept alongside the guard purely to narrow the nullable prop:
  // isRenderableImageSource answers a boolean, not a type predicate, because it
  // deliberately accepts shapes wider than any single declared type.
  if (!source || !isRenderableImageSource(source)) return null;

  const buildUrl = (w: number) =>
    urlFor(source)
      .width(w)
      .height(Math.round(w / aspectRatio))
      .auto('format')
      .quality(quality)
      .url();

  const srcSet = widths.map((w) => `${buildUrl(w)} ${w}w`).join(', ');

  const fallbackSrc = buildUrl(widths[widths.length - 1]);

  // Tiny blurred placeholder for perceived instant load. Prefer the base64 lqip
  // Sanity already computed and ships inside the GROQ response we have made
  // anyway: a background-image on a laid-out element is never lazy, so the
  // generated-URL fallback costs one EAGER cdn.sanity.io request per image —
  // including every below-the-fold listing card whose real <img> is correctly
  // deferred. The fallback still covers un-dereferenced sources (a bookReference
  // cover is `{ asset: { _ref } }` and carries no metadata).
  const lqipUrl =
    imageLqip(source) ??
    urlFor(source)
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
