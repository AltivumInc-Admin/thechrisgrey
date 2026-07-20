import { describe, it, expect } from 'vitest';
import { aeoViolations } from './validate-prerender-seo.mjs';

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
