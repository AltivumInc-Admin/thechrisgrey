export interface Testimonial {
  /** The quote, without surrounding quotation marks (the component adds them). */
  quote: string;
  /** Who said it. */
  author: string;
  /** Their role / company / context, e.g. "US Army veteran · Vector Podcast guest". */
  role?: string;
}

/**
 * Placeholder testimonials for the social-proof section.
 *
 * These are SCAFFOLDED PLACEHOLDERS attributed to generic roles so the
 * <Testimonials> component renders on Home, Contact, and the book page while
 * real, attributed quotes are collected. Replace each entry with a genuine,
 * permission-cleared quote from a podcast guest, Altivum Logic client, book
 * reader, or event organizer. Editing this single source updates every page
 * that mounts <Testimonials> (Home, Contact, /beyond-the-assessment).
 *
 * TODO: replace with real attributed quotes before launch.
 */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Christian brings the same clarity to a boardroom that he brought to the field — pragmatic, mission-focused, and genuinely invested in the people he is helping.',
    author: 'Placeholder — replace with a real client quote',
    role: 'Client engagement (replace before launch)',
  },
  {
    quote:
      'Our conversation on The Vector Podcast was one of the most grounded discussions of AI in defense I have had. Christian asks the questions that matter.',
    author: 'Placeholder — replace with a real guest quote',
    role: 'Podcast guest (replace before launch)',
  },
  {
    quote:
      'Beyond the Assessment reframed how I think about pressure and preparation. It is required reading for anyone leading in high-stakes environments.',
    author: 'Placeholder — replace with a real reader quote',
    role: 'Book reader (replace before launch)',
  },
];
