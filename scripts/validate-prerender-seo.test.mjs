import { describe, it, expect } from 'vitest';
import { aeoViolations, schemaViolations, seoMetaViolations } from './validate-prerender-seo.mjs';

// A minimal prerendered HTML fixture with a valid direct-answer summary,
// question-based H2/H3 with slug ids, and a visible FAQ section matching the
// JSON-LD. Used as the "passing" baseline; each test below mutates one piece.
const SUMMARY_45_WORDS =
  'Christian Perez is a former U.S. Army Special Forces Medic and Green Beret who served with 1st Special Forces Group. Today he is the Founder and CEO of Altivum Inc., host of The Vector Podcast, and author of Beyond the Assessment.';

const faqs = [
  {
    question: 'What is Christian Perez\u2019s military background?',
    answer: 'Christian Perez served as a Special Forces Medic (18D) with the U.S. Army, earning his Green Beret.',
  },
];

function fixture({
  summary = SUMMARY_45_WORDS,
  summaryAfterH2 = false,
  headingIdMissing = false,
  faqVisible = true,
} = {}) {
  const h2Id = headingIdMissing ? '' : ' id="who-is-christian-perez"';
  const summaryBlock = `<p data-aio-summary="">${summary}</p>`;
  const h2Block = `<h2${h2Id}>Who is Christian Perez?</h2>`;
  const order = summaryAfterH2 ? `${h2Block}${summaryBlock}` : `${summaryBlock}${h2Block}`;
  const faqSection = faqVisible
    ? `<section data-aio-faq=""><h2 id="frequently-asked-questions">Frequently Asked Questions</h2><ul><li><h3 id="what-is-christian-perezs-military-background">${faqs[0].question}</h3><p data-aio-answer="">${faqs[0].answer}</p></li></ul></section>`
    : '';
  const faqJsonLd = {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [{ '@type': 'Person', '@id': 'https://thechrisgrey.com/#person', name: 'Christian Perez' }, faqJsonLd],
  };
  return `<html><head><script type="application/ld+json">${JSON.stringify(graph)}</script></head><body>${order}${faqSection}</body></html>`;
}

describe('aeoViolations', () => {
  it('returns no violations for a well-formed content route fixture', () => {
    expect(aeoViolations(fixture(), '/about')).toEqual([]);
  });

  it('returns no violations for non-content routes (e.g. /privacy)', () => {
    expect(aeoViolations('<html></html>', '/privacy')).toEqual([]);
  });

  it('flags a missing [data-aio-summary] element (VAL-AEO-001)', () => {
    const html = fixture().replace(/data-aio-summary=""/, 'data-other=""');
    const v = aeoViolations(html, '/about');
    expect(v.some((x) => x.includes('missing [data-aio-summary]'))).toBe(true);
  });

  it('flags an empty summary text (VAL-AEO-001)', () => {
    const html = fixture({ summary: '   ' });
    const v = aeoViolations(html, '/about');
    expect(v.some((x) => x.includes('empty text'))).toBe(true);
  });

  it('flags a summary that is too short (VAL-AEO-001)', () => {
    const html = fixture({ summary: 'Christian Perez is the founder of Altivum.' });
    const v = aeoViolations(html, '/about');
    expect(v.some((x) => x.includes('words; expected 40-80'))).toBe(true);
  });

  it('flags a summary that appears after the first H2 (VAL-AEO-002)', () => {
    const html = fixture({ summaryAfterH2: true });
    const v = aeoViolations(html, '/about');
    expect(v.some((x) => x.includes('AFTER the first <h2>'))).toBe(true);
  });

  it('flags an H2 without an id (VAL-AEO-005)', () => {
    const html = fixture({ headingIdMissing: true });
    const v = aeoViolations(html, '/about');
    expect(v.some((x) => x.includes('<h2> without an id'))).toBe(true);
  });

  it('flags an H2 with a non-slug id (VAL-AEO-005)', () => {
    const html = fixture().replace('id="who-is-christian-perez"', 'id="Who Is Christian?"');
    const v = aeoViolations(html, '/about');
    expect(v.some((x) => x.includes('not slug-form'))).toBe(true);
  });

  it('flags a FAQPage JSON-LD with no visible [data-aio-faq] section (VAL-AEO-004)', () => {
    const html = fixture({ faqVisible: false });
    const v = aeoViolations(html, '/about');
    expect(v.some((x) => x.includes('no visible [data-aio-faq]'))).toBe(true);
  });

  it('flags a visible FAQ whose question text does not match the JSON-LD (VAL-AEO-004)', () => {
    const html = fixture().replace(faqs[0].question, 'A different question entirely?');
    const v = aeoViolations(html, '/about');
    expect(v.some((x) => x.includes('not visible in DOM'))).toBe(true);
  });
});

// Helper to build an HTML fixture with a given @graph array.
function graphFixture(graph) {
  const fullGraph = { '@context': 'https://schema.org', '@graph': graph };
  return `<html><head><script type="application/ld+json">${JSON.stringify(fullGraph)}</script></head><body></body></html>`;
}

const websiteWithSearchAction = {
  '@type': 'WebSite',
  '@id': 'https://thechrisgrey.com/#website',
  url: 'https://thechrisgrey.com',
  name: 'Christian Perez - thechrisgrey',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: 'https://thechrisgrey.com/blog?q={search_term_string}' },
    'query-input': 'required name=search_term_string',
  },
};

describe('schemaViolations', () => {
  it('returns no violations when all expected per-route types are present', () => {
    const html = graphFixture([
      { '@type': 'Person', '@id': 'https://thechrisgrey.com/#person', name: 'Christian Perez' },
      { '@type': 'Corporation', '@id': 'https://altivum.ai/#organization', name: 'Altivum Inc.' },
      websiteWithSearchAction,
      {
        '@type': 'CollectionPage',
        '@id': 'https://thechrisgrey.com/blog/#collectionpage',
        url: 'https://thechrisgrey.com/blog',
        name: 'Blog',
      },
    ]);
    expect(schemaViolations(html, '/blog')).toEqual([]);
  });

  it('flags a missing CollectionPage on /blog (VAL-SD-004)', () => {
    const html = graphFixture([websiteWithSearchAction]);
    const v = schemaViolations(html, '/blog');
    expect(v.some((x) => x.includes('"CollectionPage" missing'))).toBe(true);
  });

  it('flags a missing PodcastEpisode on /podcast (VAL-SD-005)', () => {
    const html = graphFixture([
      websiteWithSearchAction,
      { '@type': 'PodcastSeries', name: 'The Vector Podcast', url: 'https://thechrisgrey.com/podcast' },
    ]);
    const v = schemaViolations(html, '/podcast');
    expect(v.some((x) => x.includes('"PodcastEpisode" missing'))).toBe(true);
  });

  it('passes /podcast when both PodcastSeries and PodcastEpisode are present', () => {
    const html = graphFixture([
      websiteWithSearchAction,
      { '@type': 'PodcastSeries', name: 'The Vector Podcast', url: 'https://thechrisgrey.com/podcast' },
      { '@type': 'PodcastEpisode', name: 'Ep 1', datePublished: '2026-01-01', duration: 'PT40M', partOfSeries: {} },
    ]);
    expect(schemaViolations(html, '/podcast')).toEqual([]);
  });

  it('flags missing EducationalOccupationalCredential and FAQPage on /aws (VAL-SD-006, VAL-SD-007)', () => {
    const html = graphFixture([websiteWithSearchAction]);
    const v = schemaViolations(html, '/aws');
    expect(v.some((x) => x.includes('"EducationalOccupationalCredential" missing'))).toBe(true);
    expect(v.some((x) => x.includes('"FAQPage" missing'))).toBe(true);
  });

  it('flags a missing FAQPage on /links (VAL-SD-007)', () => {
    const html = graphFixture([websiteWithSearchAction]);
    const v = schemaViolations(html, '/links');
    expect(v.some((x) => x.includes('"FAQPage" missing'))).toBe(true);
  });

  it('flags a WebSite node with no SearchAction (VAL-SD-009)', () => {
    const websiteNoSearch = { ...websiteWithSearchAction };
    delete websiteNoSearch.potentialAction;
    const html = graphFixture([websiteNoSearch]);
    const v = schemaViolations(html, '/');
    expect(v.some((x) => x.includes('SearchAction'))).toBe(true);
  });

  it('flags a SearchAction whose target does not point at /blog?q= (VAL-SD-009)', () => {
    const html = graphFixture([
      {
        ...websiteWithSearchAction,
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: 'https://thechrisgrey.com/search?q={search_term_string}' },
          'query-input': 'required name=search_term_string',
        },
      },
    ]);
    const v = schemaViolations(html, '/');
    expect(v.some((x) => x.includes('SearchAction'))).toBe(true);
  });

  it('returns no violations for routes with no per-route schema requirements', () => {
    const html = graphFixture([websiteWithSearchAction]);
    expect(schemaViolations(html, '/about')).toEqual([]);
  });

  it('returns no violations when the JSON-LD block is missing (handled by the caller)', () => {
    expect(schemaViolations('<html></html>', '/aws')).toEqual([]);
  });
});

// --- seoMetaViolations tests (VAL-SEO-001/004/006/007/008/009/010/011) ---

// Helper: build a well-formed HTML fixture with all required SEO meta tags.
// Each test mutates one piece to assert the validator catches it.
function seoFixture({
  title = 'About | Christian Perez',
  description = 'A descriptive meta description that is long enough to pass the 70-160 character minimum threshold check.',
  h1 = 'About Christian Perez',
  skipH1 = false,
  ogTags = true,
  twitterTags = true,
  hreflang = false,
  robotsMeta = null, // null = no robots meta; 'noindex, nofollow' = noindex
  rssLink = true,
  htmlLang = 'en',
  ogLocale = 'en_US',
  images = [], // array of { alt, decorative }
} = {}) {
  const headParts = [`<title>${title}</title>`, `<meta name="description" content="${description}" />`];
  if (robotsMeta) {
    headParts.push(`<meta name="robots" content="${robotsMeta}" />`);
  }
  headParts.push(`<link rel="canonical" href="https://thechrisgrey.com/about" />`);
  if (rssLink) {
    headParts.push(
      `<link rel="alternate" type="application/rss+xml" title="Christian Perez - Blog" href="https://thechrisgrey.com/rss.xml" />`,
    );
  }
  if (hreflang) {
    headParts.push(`<link rel="alternate" hreflang="en-US" href="https://thechrisgrey.com/about" />`);
  }
  if (ogTags) {
    headParts.push(
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:url" content="https://thechrisgrey.com/about" />`,
      `<meta property="og:image" content="https://thechrisgrey.com/og/about.png" />`,
      `<meta property="og:image:alt" content="About page hero" />`,
      `<meta property="og:locale" content="${ogLocale}" />`,
    );
  }
  if (twitterTags) {
    headParts.push(
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
      `<meta name="twitter:image" content="https://thechrisgrey.com/og/about.png" />`,
      `<meta name="twitter:creator" content="@thechrisgrey" />`,
      `<meta name="twitter:site" content="@thechrisgrey" />`,
    );
  }
  const bodyParts = [];
  if (!skipH1) {
    bodyParts.push(`<h1>${h1}</h1>`);
  }
  for (const img of images) {
    if (img.decorative) {
      bodyParts.push(`<img src="/test.jpg" alt="" role="presentation" />`);
    } else {
      bodyParts.push(`<img src="/test.jpg" alt="${img.alt}" />`);
    }
  }
  return `<html lang="${htmlLang}"><head>${headParts.join('')}</head><body>${bodyParts.join('')}</body></html>`;
}

describe('seoMetaViolations', () => {
  it('returns no violations for a well-formed fixture', () => {
    expect(seoMetaViolations(seoFixture(), '/about')).toEqual([]);
  });

  it('flags a missing <title> (VAL-SEO-006)', () => {
    const html = seoFixture({ title: '' }).replace(/<title><\/title>/, '');
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('expected exactly 1 per-page <title>'))).toBe(true);
  });

  it('flags a <title> that does not end with "| Christian Perez" (VAL-SEO-006)', () => {
    const html = seoFixture({ title: 'About Page' });
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('does not end with "| Christian Perez"'))).toBe(true);
  });

  it('flags a <title> over 70 chars (VAL-SEO-006)', () => {
    const longTitle = 'A'.repeat(60) + ' | Christian Perez';
    const html = seoFixture({ title: longTitle });
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('chars; expected <= 70'))).toBe(true);
  });

  it('flags a missing <meta name="description"> (VAL-SEO-006)', () => {
    const html = seoFixture().replace(/<meta name="description"[^>]*>/, '');
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('expected exactly 1 <meta name="description">'))).toBe(true);
  });

  it('flags a description under 70 chars (VAL-SEO-006)', () => {
    const html = seoFixture({ description: 'Short description.' });
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('chars; expected 70-160'))).toBe(true);
  });

  it('flags a description over 160 chars (VAL-SEO-006)', () => {
    const longDesc = 'A'.repeat(161);
    const html = seoFixture({ description: longDesc });
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('chars; expected 70-160'))).toBe(true);
  });

  it('flags a missing <h1> (VAL-SEO-006)', () => {
    const html = seoFixture({ skipH1: true });
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('expected exactly 1 <h1>'))).toBe(true);
  });

  it('flags multiple <h1> tags (VAL-SEO-006)', () => {
    const html = seoFixture().replace('<h1>About Christian Perez</h1>', '<h1>First</h1><h1>Second</h1>');
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('expected exactly 1 <h1>'))).toBe(true);
  });

  it('ignores the static shell title and validates only the per-page title (VAL-SEO-006)', () => {
    const html = seoFixture() + '<title>Christian Perez - thechrisgrey</title>';
    const v = seoMetaViolations(html, '/about');
    expect(v.filter((x) => x.includes('<title>'))).toEqual([]);
  });

  it('flags missing og:title (VAL-SEO-007)', () => {
    const html = seoFixture().replace(/<meta property="og:title"[^>]*>/, '');
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('missing og:title'))).toBe(true);
  });

  it('flags missing twitter:card (VAL-SEO-008)', () => {
    const html = seoFixture().replace(/<meta name="twitter:card"[^>]*>/, '');
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('missing twitter:card'))).toBe(true);
  });

  it('flags missing twitter:site (VAL-SEO-008)', () => {
    const html = seoFixture().replace(/<meta name="twitter:site"[^>]*>/, '');
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('missing twitter:site'))).toBe(true);
  });

  it('flags wrong twitter:card value (VAL-SEO-008)', () => {
    const html = seoFixture().replace('content="summary_large_image"', 'content="summary"');
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('expected "summary_large_image"'))).toBe(true);
  });

  it('flags hreflang tags on a single-language site (VAL-SEO-004)', () => {
    const html = seoFixture({ hreflang: true });
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('hreflang link tag'))).toBe(true);
  });

  it('flags missing <html lang> attribute (VAL-SEO-004)', () => {
    const html = seoFixture({ htmlLang: null }).replace(/<html[^>]*>/, '<html>');
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('missing lang attribute'))).toBe(true);
  });

  it('flags missing og:locale (VAL-SEO-004)', () => {
    const html = seoFixture().replace(/<meta property="og:locale"[^>]*>/, '');
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('missing og:locale'))).toBe(true);
  });

  it('flags a noindex robots meta on an indexable route (VAL-SEO-010)', () => {
    const html = seoFixture({ robotsMeta: 'noindex, nofollow' });
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('indexable but carries robots noindex'))).toBe(true);
  });

  it('flags a missing RSS feed link on an indexable page (VAL-SEO-009)', () => {
    const html = seoFixture({ rssLink: false });
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('missing RSS'))).toBe(true);
  });

  it('flags an <img> missing alt attribute (VAL-SEO-011)', () => {
    const html = seoFixture({ images: [{ alt: null }] }).replace('alt="null"', '');
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('missing alt attribute'))).toBe(true);
  });

  it('flags an <img> with empty alt but no decorative marker (VAL-SEO-011)', () => {
    const html = `<html lang="en"><head><title>About | Christian Perez</title><meta name="description" content="${'A'.repeat(80)}" /><link rel="canonical" href="https://thechrisgrey.com/about" /><link rel="alternate" type="application/rss+xml" title="X" href="https://thechrisgrey.com/rss.xml" /><meta property="og:title" content="X" /><meta property="og:description" content="X" /><meta property="og:type" content="website" /><meta property="og:url" content="X" /><meta property="og:image" content="X" /><meta property="og:image:alt" content="X" /><meta property="og:locale" content="en_US" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="X" /><meta name="twitter:description" content="X" /><meta name="twitter:image" content="X" /><meta name="twitter:creator" content="@thechrisgrey" /><meta name="twitter:site" content="@thechrisgrey" /></head><body><h1>About</h1><img src="/test.jpg" alt="" /></body></html>`;
    const v = seoMetaViolations(html, '/about');
    expect(v.some((x) => x.includes('empty alt lacks'))).toBe(true);
  });

  it('does not flag an <img> with empty alt and role="presentation" (VAL-SEO-011)', () => {
    const html = seoFixture({ images: [{ alt: '', decorative: true }] });
    const v = seoMetaViolations(html, '/about');
    expect(v.filter((x) => x.includes('VAL-SEO-011'))).toEqual([]);
  });

  it('does not flag an <img> with non-empty alt (VAL-SEO-011)', () => {
    const html = seoFixture({ images: [{ alt: 'A descriptive alt' }] });
    const v = seoMetaViolations(html, '/about');
    expect(v.filter((x) => x.includes('VAL-SEO-011'))).toEqual([]);
  });
});
