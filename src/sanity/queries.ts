// GROQ queries for fetching blog content from Sanity

// Shared projection fragments. The image projection was typed out verbatim four
// times and the category coalesce three times, so adding a card field meant
// editing several places and the listing card could silently drift from the
// relatedPosts card. Composing from constants keeps the exported values plain
// strings, so the `toContain` scans in queries.test.ts / schemas.test.ts still
// read them the same way.

// `metadata` is what lets an image render honestly. `dimensions.aspectRatio` is
// the asset's real shape — without it the body renderer forced every inline
// image into a hardcoded 4:3 box and `object-cover` cropped the overflow away.
// `lqip` is the base64 placeholder Sanity already computed and stores on the
// asset; reusing it removes one eager CDN round-trip per rendered image (a
// background-image is never lazy, so below-the-fold cards were fetching a
// placeholder they did not need yet).
const IMAGE_ASSET_PROJECTION = `asset->{ _id, url, metadata { lqip, dimensions } }`;

const IMAGE_PROJECTION = `image {
    "asset": ${IMAGE_ASSET_PROJECTION},
    alt
  }`;

const CATEGORY_PROJECTION = `"category": coalesce(category->title, category)`;

// Exactly the fields `isSanityPostPreview` requires, plus the cover image. Shared
// by the listing cards and the relatedPosts cards so neither can drop a field the
// guard demands without the other noticing. Card-specific extras (readingTime,
// isFeatured, tags, series, seriesOrder — used for listing sort and filters, not
// rendered on a related-post card) are appended per query rather than hoisted, so
// the related-posts payload stays minimal.
const POST_CARD_PROJECTION = `_id,
    title,
    slug,
    excerpt,
    ${CATEGORY_PROJECTION},
    publishedAt,
    ${IMAGE_PROJECTION}`;

// `perspective: 'published'` on the client (client.ts) is the primary draft
// exclusion. This path filter keeps the same guarantee in the query text, so a
// caller that forgets to pin the perspective — the build-time generators run
// their own clients — still cannot surface a `drafts.<id>` document. Sanity
// Studio creates one the moment anyone edits a published post.
const NOT_A_DRAFT = `!(_id in path("drafts.**"))`;

// Blog listing. Posts only: the page derives its category chips from the posts
// themselves and its tag/series filters from URL params, so the top-level tag and
// series collections this query used to fetch were never read.
export const BLOG_LISTING_QUERY = `{
  "posts": *[
    _type == "post"
    && defined(slug.current)
    && ${NOT_A_DRAFT}
  ] | order(isFeatured desc, publishedAt desc) {
    ${POST_CARD_PROJECTION},
    readingTime,
    isFeatured,
    "tags": tags[]->{ _id, title, slug },
    "series": series->{ _id, title, slug, description },
    seriesOrder
  }
}`;

// Fetch a single post by slug (for post detail view).
// `_updatedAt` is projected because BlogPost.tsx reads it for `article:modified_time`
// and the Article schema's `dateModified`. Without it both silently collapsed to
// publishedAt and contradicted the `<lastmod>` the sitemap generator emits for the
// same URL from the very same field.
export const POST_BY_SLUG_QUERY = `*[
  _type == "post"
  && slug.current == $slug
  && ${NOT_A_DRAFT}
][0] {
  ${POST_CARD_PROJECTION},
  _updatedAt,
  readingTime,
  isFeatured,
  pdfUrl,
  seoTitle,
  seoDescription,
  body[] {
    ...,
    _type == "image" => {
      ...,
      "asset": ${IMAGE_ASSET_PROJECTION}
    }
  },
  "tags": tags[]->{ _id, title, slug },
  "series": series->{ _id, title, slug, description },
  seriesOrder,
  "relatedPosts": relatedPosts[]->{
    ${POST_CARD_PROJECTION}
  },
  "seriesPosts": select(
    defined(series) => *[
      _type == "post"
      && series._ref == ^.series._ref
      && ${NOT_A_DRAFT}
    ] | order(seriesOrder asc) {
      _id, title, slug, seriesOrder
    },
    null
  )
}`;

// Fetch all podcast guests
export const PODCAST_GUESTS_QUERY = `*[_type == "podcastGuest"] | order(order asc) {
  _id,
  name,
  role,
  branch,
  episodeUrl,
  ${IMAGE_PROJECTION},
  linkedinUrl,
  instagramUrl,
  websiteUrl,
  websiteLabel,
  order
}`;
