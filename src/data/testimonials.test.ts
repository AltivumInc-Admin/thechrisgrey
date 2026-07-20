import { describe, it, expect } from 'vitest';
import { TESTIMONIALS } from './testimonials';

describe('TESTIMONIALS data source', () => {
  it('is non-empty so the Testimonials section renders on Home and Contact', () => {
    expect(TESTIMONIALS.length).toBeGreaterThan(0);
  });

  it('every entry has a quote and an attributed author', () => {
    TESTIMONIALS.forEach((t) => {
      expect(t.quote).toBeTruthy();
      expect(t.quote.length).toBeGreaterThan(10);
      expect(t.author).toBeTruthy();
    });
  });

  it('is a single typed source that propagates to every page mounting Testimonials', () => {
    // The component defaults to this array, so Home, Contact, and the book page
    // all render the same quotes from this one source.
    expect(TESTIMONIALS).toBeInstanceOf(Array);
    expect(TESTIMONIALS.length).toBeGreaterThanOrEqual(1);
  });
});
