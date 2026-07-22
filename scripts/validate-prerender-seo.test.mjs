import { describe, it, expect } from 'vitest';
import { aeoViolations, schemaViolations } from './validate-prerender-seo.mjs';

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
