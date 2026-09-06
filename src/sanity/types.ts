// TypeScript types for Sanity content

export interface SanityImageDimensions {
  width: number;
  height: number;
  /** width / height, as Sanity computed it at upload time. */
  aspectRatio: number;
}

/**
 * Asset metadata Sanity precomputes and stores alongside every image. Optional
 * because un-dereferenced sources (a bookReference cover arrives as
 * `{ asset: { _ref } }`) carry none.
 */
export interface SanityImageAssetMetadata {
  /** Inline `data:image/...;base64,` placeholder, ~800 bytes. */
  lqip?: string;
  dimensions?: SanityImageDimensions;
}

export interface SanityImage {
  asset: {
    _id: string;
    url: string;
    metadata?: SanityImageAssetMetadata;
  };
  alt?: string;
  caption?: string;
}

export interface SanityTag {
  _id: string;
  title: string;
  slug: { current: string };
}

export interface SanitySeries {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  image?: SanityImage;
}

export interface SanityPost {
  _id: string;
  _updatedAt?: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  category: string;
  publishedAt: string;
  readingTime?: number;
  isFeatured?: boolean;
  pdfUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  image?: SanityImage;
  body?: SanityBlock[];
  tags?: SanityTag[];
  series?: SanitySeries;
  seriesOrder?: number;
  relatedPosts?: SanityPostPreview[];
  seriesPosts?: SanitySeriesPost[];
}

export interface SanitySeriesPost {
  _id: string;
  title: string;
  slug: { current: string };
  seriesOrder?: number;
}

/**
 * Result of BLOG_LISTING_QUERY. Posts only — the listing page derives its
 * category chips from the posts themselves and its tag/series filters from URL
 * params, so the top-level tag/series collections this used to declare were a
 * contract nothing read.
 */
export interface BlogListingResult {
  posts: SanityPostPreview[];
}

export interface SanityPostPreview {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  category: string;
  publishedAt: string;
  readingTime?: number;
  isFeatured?: boolean;
  image?: SanityImage;
  tags?: SanityTag[];
  series?: SanitySeries;
  seriesOrder?: number;
}

// Portable Text block types
export interface SanityBlock {
  _type: string;
  _key: string;
  [key: string]: unknown;
}

export interface CodeBlock {
  _type: 'codeBlock';
  _key: string;
  filename?: string;
  code: {
    _type: 'code';
    language?: string;
    code: string;
    highlightedLines?: number[];
  };
}

export interface Callout {
  _type: 'callout';
  _key: string;
  type: 'note' | 'tip' | 'warning' | 'important';
  text: string;
}

export interface YouTube {
  _type: 'youtube';
  _key: string;
  url: string;
  caption?: string;
}

export interface Divider {
  _type: 'divider';
  _key: string;
  style?: 'line' | 'dots' | 'space';
}

export interface PullQuote {
  _type: 'pullQuote';
  _key: string;
  quote: string;
  attribution?: string;
}

export interface BookReference {
  _type: 'bookReference';
  _key: string;
  title: string;
  author: string;
  cover?: SanityImage;
  description?: string;
  link?: string;
}

export interface PodcastGuest {
  _id: string;
  name: string;
  role: string;
  branch?: 'army' | 'navy' | 'marines' | 'air-force' | 'space-force' | 'coast-guard';
  episodeUrl?: string;
  image?: SanityImage;
  linkedinUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  websiteLabel?: string;
  order: number;
}
