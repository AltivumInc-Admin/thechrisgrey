import { describe, it, expect } from 'vitest';
import { slugify, textFromChildren } from './slugify';

describe('slugify', () => {
  it('lowercases and hyphenates a plain heading', () => {
    expect(slugify('What is AWS Certification?')).toBe('what-is-aws-certification');
  });

  it('collapses runs of whitespace into a single hyphen', () => {
    expect(slugify('How   does  Christian   use  Claude?')).toBe('how-does-christian-use-claude');
  });

  it('strips punctuation but keeps letters, numbers, and hyphens', () => {
    expect(slugify("Christian's AWS Journey: 2025-2026!")).toBe('christians-aws-journey-2025-2026');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  Spaced Out  ')).toBe('spaced-out');
  });

  it('returns an empty string for empty / whitespace-only input', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('preserves unicode letters (no accent stripping)', () => {
    expect(slugify('Über Claude Fähigkeiten')).toBe('über-claude-fähigkeiten');
  });

  it('produces the same slug for the same input (stable across builds)', () => {
    expect(slugify('What does Altivum Logic do?')).toBe(slugify('What does Altivum Logic do?'));
  });
});

describe('textFromChildren', () => {
  it('returns strings unchanged', () => {
    expect(textFromChildren('hello')).toBe('hello');
  });

  it('joins arrays of strings', () => {
    expect(textFromChildren(['hel', 'lo'])).toBe('hello');
  });

  it('reads .text from Portable Text span-like objects', () => {
    expect(
      textFromChildren([
        { _type: 'span', text: 'Hi' },
        { _type: 'span', text: ' there' },
      ]),
    ).toBe('Hi there');
  });

  it('walks React-element-like children via .props.children', () => {
    const element = { props: { children: 'nested' } };
    expect(textFromChildren(element)).toBe('nested');
  });

  it('returns empty string for null / undefined / false', () => {
    expect(textFromChildren(null)).toBe('');
    expect(textFromChildren(undefined)).toBe('');
    expect(textFromChildren(false)).toBe('');
  });
});
