import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title: string;
    description: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'article' | 'profile';
}

export const SEO = ({
    title,
    description,
    keywords,
    image = 'https://thechrisgrey.com/og.png',
    url = 'https://thechrisgrey.com',
    type = 'website',
    structuredData: customStructuredData
}: SEOProps & { structuredData?: any }) => {
    const siteTitle = 'Christian Perez | thechrisgrey';
    const fullTitle = title === siteTitle ? title : `${title} | Christian Perez`;

    // Default Structured Data (JSON-LD) for AI Discovery
    const defaultStructuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Person",
                "@id": "https://thechrisgrey.com/#person",
                "name": "Christian Perez",
                "alternateName": ["thechrisgrey", "Chris Perez"],
                "url": "https://thechrisgrey.com",
                "image": "https://thechrisgrey.com/tcg.png",
                "description": "Founder & CEO of Altivum Inc., Former Green Beret, and Host of The Vector Podcast.",
                "jobTitle": "Founder & CEO",
                "worksFor": {
                    "@type": "Organization",
                    "name": "Altivum Inc.",
                    "url": "https://altivum.ai"
                },
                "knowsAbout": [
                    "Cloud Architecture",
                    "Artificial Intelligence",
                    "Defense Technology",
                    "Entrepreneurship",
                    "Military Leadership"
                ],
                "sameAs": [
                    "https://www.linkedin.com/in/christian-perez-altivum/",
                    "https://twitter.com/thechrisgrey",
                    "https://github.com/thechrisgrey",
                    "https://vector.altivum.ai",
                    "https://logic.altivum.ai"
                ]
            },
            {
                "@type": "Organization",
                "@id": "https://altivum.ai/#organization",
                "name": "Altivum Inc.",
                "url": "https://altivum.ai",
                "logo": "https://altivum.ai/logo.png",
                "founder": {
                    "@id": "https://thechrisgrey.com/#person"
                },
                "sameAs": [
                    "https://logic.altivum.ai",
                    "https://vector.altivum.ai"
                ]
            },
            {
                "@type": "WebSite",
                "@id": "https://thechrisgrey.com/#website",
                "url": "https://thechrisgrey.com",
                "name": "Christian Perez - thechrisgrey",
                "description": "Personal website of Christian Perez, Founder of Altivum Inc.",
                "publisher": {
                    "@id": "https://thechrisgrey.com/#person"
                }
            }
        ]
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
