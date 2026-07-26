import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DirectAnswerSummary from './DirectAnswerSummary';
import FAQSection from './FAQSection';
import QuestionHeading from './QuestionHeading';
import { AEO_SUMMARIES } from '../../data/aeoSummaries';

const wordCount = (text: string): number =>
  text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

describe('DirectAnswerSummary', () => {
  it('renders a [data-aio-summary] element with the provided text', () => {
    const { container } = render(<DirectAnswerSummary text="A concise direct answer." />);
    const node = container.querySelector('[data-aio-summary]');
    expect(node).toBeTruthy();
    expect(node?.textContent).toBe('A concise direct answer.');
  });

  it('defaults to a <p> tag', () => {
    const { container } = render(<DirectAnswerSummary text="x" />);
    expect(container.querySelector('p[data-aio-summary]')).toBeTruthy();
  });

  it('renders the chosen tag when `as` is provided', () => {
    const { container } = render(<DirectAnswerSummary text="x" as="div" />);
    expect(container.querySelector('div[data-aio-summary]')).toBeTruthy();
  });
});

describe('QuestionHeading', () => {
  it('renders an H2 with a slug-form id derived from the text', () => {
    const { container } = render(<QuestionHeading>What is AWS certification?</QuestionHeading>);
    const h2 = container.querySelector('h2');
    expect(h2).toBeTruthy();
    expect(h2?.id).toBe('what-is-aws-certification');
  });

  it('renders an H3 when as="h3"', () => {
    const { container } = render(<QuestionHeading as="h3">How does Claude work?</QuestionHeading>);
    const h3 = container.querySelector('h3');
    expect(h3).toBeTruthy();
    expect(h3?.id).toBe('how-does-claude-work');
  });

  it('honors an explicit id override', () => {
    const { container } = render(<QuestionHeading id="custom-id">What is AWS certification?</QuestionHeading>);
    expect(container.querySelector('h2')?.id).toBe('custom-id');
  });

  it('produces a stable id for the same text across renders', () => {
    const { container: a } = render(<QuestionHeading>What does Altivum Logic do?</QuestionHeading>);
    const { container: b } = render(<QuestionHeading>What does Altivum Logic do?</QuestionHeading>);
    expect(a.querySelector('h2')?.id).toBe(b.querySelector('h2')?.id);
  });

  it('derives the id from nested children (array of strings)', () => {
    const { container } = render(<QuestionHeading>{['What is ', 'VetROI?']}</QuestionHeading>);
    expect(container.querySelector('h2')?.id).toBe('what-is-vetroi');
  });
});

describe('FAQSection', () => {
  const faqs = [
    { question: 'What is Altivum Inc.?', answer: 'A veteran-founded public benefit corporation.' },
    { question: 'Who founded Altivum?', answer: 'Christian Perez founded Altivum in February 2025.' },
  ];

  it('renders nothing when the faqs array is empty', () => {
    const { container } = render(<FAQSection faqs={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a [data-aio-faq] section with one h2 and one h3 per question', () => {
    const { container } = render(<FAQSection faqs={faqs} />);
    expect(container.querySelector('[data-aio-faq]')).toBeTruthy();
    expect(container.querySelectorAll('h2')).toHaveLength(1);
    expect(container.querySelectorAll('h3')).toHaveLength(2);
  });

  it('renders the question and answer text verbatim (matches JSON-LD source)', () => {
    const { container } = render(<FAQSection faqs={faqs} />);
    const headings = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent);
    const answers = Array.from(container.querySelectorAll('[data-aio-answer]')).map((p) => p.textContent);
    expect(headings).toEqual(faqs.map((f) => f.question));
    expect(answers).toEqual(faqs.map((f) => f.answer));
  });

  it('gives each question h3 a stable slug-form id prefixed with faq-', () => {
    const { container } = render(<FAQSection faqs={faqs} />);
    const ids = Array.from(container.querySelectorAll('h3')).map((h) => h.id);
    expect(ids).toEqual(['faq-what-is-altivum-inc', 'faq-who-founded-altivum']);
  });

  it('ids are unique within the section', () => {
    const { container } = render(<FAQSection faqs={faqs} />);
    const ids = Array.from(container.querySelectorAll('h3')).map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('section h2 has the id "frequently-asked-questions"', () => {
    const { container } = render(<FAQSection faqs={faqs} />);
    expect(container.querySelector('h2')?.id).toBe('frequently-asked-questions');
  });
});

describe('AEO_SUMMARIES (per-route direct-answer content)', () => {
  const CONTENT_ROUTES = [
    '/',
    '/about',
    '/altivum',
    '/foundation',
    '/podcast',
    '/aws',
    '/claude',
    '/beyond-the-assessment',
    '/blog',
    '/links',
    '/contact',
  ];

  it('every content route has a summary entry', () => {
    for (const route of CONTENT_ROUTES) {
      expect(AEO_SUMMARIES[route], `missing AEO summary for ${route}`).toBeTruthy();
    }
  });

  it('every summary is between 40 and 80 words (VAL-AEO-001)', () => {
    for (const route of CONTENT_ROUTES) {
      const count = wordCount(AEO_SUMMARIES[route]);
      expect(count, `${route} summary is ${count} words; expected 40-80`).toBeGreaterThanOrEqual(40);
      expect(count, `${route} summary is ${count} words; expected 40-80`).toBeLessThanOrEqual(80);
    }
  });
});
