import { Helmet } from 'react-helmet-async';
import {
    buildPersonSchema,
    buildOrganizationSchema,
    buildWebSiteSchema,
    buildFAQSchema,
    buildBreadcrumbSchema
} from '../utils/schemas';

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
    url?: string;
    type?: 'website' | 'article' | 'profile' | 'book';
    breadcrumbs?: BreadcrumbItem[];
    faq?: FAQItem[];
    datePublished?: string;
    dateModified?: string;
}

export const SEO = ({
    title,
    description,
    keywords,
    image = 'https://thechrisgrey.com/og.png',
    url = 'https://thechrisgrey.com',
    type = 'website',
    breadcrumbs,
    faq,
    structuredData: customStructuredData
}: SEOProps & { structuredData?: Record<string, unknown>[] }) => {
    const siteTitle = 'Christian Perez | thechrisgrey';
    const fullTitle = title === siteTitle ? title : `${title} | Christian Perez`;

    // Build default structured data graph
    const defaultGraph: Record<string, unknown>[] = [
        buildPersonSchema(),
        buildOrganizationSchema(),
        buildWebSiteSchema()
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
        "@context": "https://schema.org",
        "@graph": defaultGraph
    };

    // Merge custom structured data if provided
    const finalStructuredData = customStructuredData
        ? { ...defaultStructuredData, "@graph": [...defaultStructuredData["@graph"], ...customStructuredData] }
        : defaultStructuredData;

    return (
        <Helmet>
            {/* Standard Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            {keywords && <meta name="keywords" content={keywords} />}
            <link rel="canonical" href={url} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:creator" content="@thechrisgrey" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />

            {/* Structured Data for AI */}
            <script type="application/ld+json">
                {JSON.stringify(finalStructuredData)}
            </script>
        </Helmet>
    );
};
