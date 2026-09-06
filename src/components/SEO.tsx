import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  buildPersonSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildFAQSchema,
  buildBreadcrumbSchema,
  serializeJsonLd,
} from '../utils/schemas';
import { ogImageForUrl } from '../utils/ogCards';
import { preconnectsForPath } from '../routes';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  /**
   * Descriptive alt text for the og:image / twitter:image. Emitted as
   * `og:image:alt` and `twitter:image:alt` (VAL-SEO-007). Every route must
   * pass non-empty descriptive text; the default describes the site's branded
   * OG card so routes that don't override still emit a non-empty value.
   */
  imageAlt?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile' | 'book';
  breadcrumbs?: BreadcrumbItem[];
  faq?: FAQItem[];
  datePublished?: string;
  dateModified?: string;
  noindex?: boolean;
}

export const SEO = ({
  title,
  description,
  keywords,
  image,
  imageAlt,
  url = 'https://thechrisgrey.com',
  type = 'website',
  breadcrumbs,
  faq,
  datePublished,
  dateModified,
  noindex = false,
  structuredData: customStructuredData,
}: SEOProps & { structuredData?: Record<string, unknown>[] }) => {
  const siteTitle = 'Christian Perez | thechrisgrey';
  const fullTitle = title === siteTitle ? title : `${title} | Christian Perez`;

  // og:image / twitter:image. An explicit `image` prop wins (e.g. BlogPost
  // passes the post's Sanity image); otherwise derive the per-route generated
  // OG card from the canonical url, falling back to the shared /og.png.
  const ogImage = image ?? ogImageForUrl(url);

  // og:image:alt / twitter:image:alt (VAL-SEO-007). A non-empty descriptive
  // default keeps every route compliant even when the page doesn't override.
  const ogImageAlt = imageAlt?.trim() ? imageAlt.trim() : `${fullTitle} — Christian Perez (@thechrisgrey)`;

  // Per-route preconnect origins (VAL-PERF-008). The global, every-page
  // preconnects (analytics beacons) live in index.html; this resolves only the
  // route-specific origins declared in src/routes.ts so each prerendered page
  // preconnects to exactly the third-party origins it uses within 10 seconds.
  // `useLocation` gives the live pathname (the `url` prop is the canonical URL,
  // which for blog posts is `/blog/<slug>` — the same value, but `useLocation`
  // is the single resolver for dynamic `/blog/:slug` matching in routes.ts).
  const { pathname } = useLocation();
  const routePreconnects = useMemo(() => preconnectsForPath(pathname), [pathname]);

  // Build default structured data graph
  const defaultGraph: Record<string, unknown>[] = [
    // Person.image is aligned with the per-route og:image so the JSON-LD
    // primary image and the og:image meta tag resolve to the same asset
    // (VAL-SD-010). For routes with a page-specific schema image (Article,
    // PodcastSeries, etc.), that page-specific image is primary and already
    // matches og:image; for all other routes Person.image is primary.
    buildPersonSchema({ image: ogImage }),
    buildOrganizationSchema(),
    buildWebSiteSchema(),
  ];

  // Add breadcrumbs if provided
  if (breadcrumbs && breadcrumbs.length > 0) {
    defaultGraph.push(buildBreadcrumbSchema(breadcrumbs));
  }

  // Add FAQ schema if provided (critical for AEO)
  if (faq && faq.length > 0) {
    defaultGraph.push(buildFAQSchema(faq));
  }

  // Default Structured Data (JSON-LD) for AI Discovery
  const defaultStructuredData = {
    '@context': 'https://schema.org',
    '@graph': defaultGraph,
  };

  // Merge custom structured data if provided
  const finalStructuredData = customStructuredData
    ? { ...defaultStructuredData, '@graph': [...defaultStructuredData['@graph'], ...customStructuredData] }
    : defaultStructuredData;

  // Signal to the build-time prerender crawl (Recommendation 3 Part B) that
  // THIS route's <head> tags (title/meta/JSON-LD) are present in the DOM. The
  // crawl polls window.__PRERENDER_READY__ instead of network idle, because
  // the WebGL/GSAP work never lets the page reach a true idle state.
  //
  // NOTE: react-helmet-async@3 on React 19 uses its React19Dispatcher, which
  // renders head tags via React 19's native hoisting and NEVER invokes the
  // legacy onChangeClientState callback — so that callback cannot drive this
  // signal. Instead we use an effect: it runs after React commits this
  // component (and the title/meta/JSON-LD it hoists into <head>), so the flag
  // is set only once the latest route's tags are actually in the document.
  // Keyed on fullTitle + url so it re-fires on every route change. A real
  // user session just sets a harmless window prop; only the crawl reads it.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__PRERENDER_READY__ = true;
    }
  }, [fullTitle, url]);

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {/* Robots meta is emitted on EVERY route so there is exactly one robots
          directive per page (VAL-SEO-010). Indexable routes get the full
          index, follow + max-image/snippet/video directive; noindex routes
          (/chat, /admin, 404) get noindex, nofollow. This replaces the prior
          static shell robots meta, which conflicted with noindex routes. */}
      <meta
        name="robots"
        content={
          noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
        }
      />
      <link rel="canonical" href={url} />

      {/* Per-route preconnects (VAL-PERF-008). Only origins this route
          actually uses within 10s; the global analytics preconnects stay in
          index.html. react-helmet-async deduplicates link tags by href so a
          route with multiple preconnects emits one link per origin. */}
      {routePreconnects.map((origin) => (
        <link key={origin} rel="preconnect" href={origin} crossOrigin="anonymous" />
      ))}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={ogImageAlt} />
      {/* All OG images (generated route cards, /og.png, and the 1200x630
                Sanity blog crops) are 1200x630. Emitted here, right after og:image,
                so the dimensions associate with it per OG structured-property rules. */}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Article-specific Open Graph tags */}
      {type === 'article' && datePublished && <meta property="article:published_time" content={datePublished} />}
      {type === 'article' && dateModified && <meta property="article:modified_time" content={dateModified} />}
      {type === 'article' && <meta property="article:author" content="https://thechrisgrey.com/about" />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:creator" content="@thechrisgrey" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogImageAlt} />

      {/* Structured Data for AI. Serialised through serializeJsonLd, not a bare
          JSON.stringify: react-helmet-async assigns script children via
          innerHTML and the prerender crawl writes the result to static HTML, so
          an unescaped `<` from a CMS string would close this tag for real. */}
      <script type="application/ld+json">{serializeJsonLd(finalStructuredData)}</script>
    </Helmet>
  );
};
