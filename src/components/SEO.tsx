import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  buildPersonSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildFAQSchema,
  buildBreadcrumbSchema,
} from '../utils/schemas';
import { ogImageForUrl } from '../utils/ogCards';

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

  // Build default structured data graph
  const defaultGraph: Record<string, unknown>[] = [
    buildPersonSchema(),
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
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={url} />

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

      {/* Structured Data for AI */}
      <script type="application/ld+json">{JSON.stringify(finalStructuredData)}</script>
    </Helmet>
  );
};
