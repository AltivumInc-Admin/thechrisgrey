import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Altivum from '../../pages/Altivum';

// Mock static image imports
vi.mock('../../assets/altivum.jpg', () => ({ default: '/mock-altivum.jpg' }));
vi.mock('../../assets/aws-partner-dark.png', () => ({
  default: '/mock-aws-partner-dark.png',
}));
vi.mock('../../assets/altivum.png', () => ({ default: '/mock-altivum.png' }));

// Mock prefetchRoute (consumed by ViewTransitionLink) so the test does not
// touch the real route manifest.
vi.mock('../../utils/routeManifest', () => ({
  prefetchRoute: vi.fn(),
}));

const renderAltivum = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/altivum']}>
        <Altivum />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe('Altivum Page Integration', () => {
  it('labels the chamber-recognition external link with destination and new-tab context', () => {
    renderAltivum();
    const chamberLink = screen.getByRole('link', {
      name: /veteran business of the month.*opens in new tab/i,
    });
    expect(chamberLink).toHaveAttribute('target', '_blank');
    expect(chamberLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('renders the three imperatives in both the timeline and mission sections', () => {
    renderAltivum();
    // Each imperative title appears once in the founder-journey list and once in
    // the mission-statement grid — proving the hoisted IMPERATIVES const drives both.
    expect(screen.getAllByText(/Advance AI through real-world application/)).toHaveLength(2);
    expect(screen.getAllByText(/Strengthen human-machine integration/)).toHaveLength(2);
    expect(screen.getAllByText(/Position veterans as strategic leaders/)).toHaveLength(2);
  });

  it('applies the standard button recipe to the learn-more CTAs', () => {
    renderAltivum();
    const visitCta = screen.getByRole('link', { name: 'Visit Altivum.ai' });
    expect(visitCta.className).toContain('min-h-[48px]');
    expect(visitCta.className).toContain('touch-manipulation');
    expect(visitCta.className).toContain('active:scale-[0.98]');

    const contactCta = screen.getByRole('link', { name: 'Get in Touch' });
    expect(contactCta).toHaveAttribute('href', '/contact');
    expect(contactCta.className).toContain('min-h-[48px]');
  });

  describe('Newsletter CTA + cross-link band', () => {
    it('mounts the NewsletterCTA with an email input and subscribe control', () => {
      renderAltivum();
      expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
    });

    it('renders a cross-link band with at least two internal links to related pages', () => {
      renderAltivum();
      const nav = screen.getByRole('navigation', { name: /explore more/i });
      const anchors = nav.querySelectorAll('a[href]');
      expect(anchors.length).toBeGreaterThanOrEqual(2);
      const hrefs = Array.from(anchors).map((a) => a.getAttribute('href'));
      // Every link should be an internal SPA path (no protocol / mailto / tel).
      hrefs.forEach((href) => {
        expect(href).toMatch(/^\//);
      });
      // Cross-links point at related pages, not back to the current page.
      expect(hrefs).not.toContain('/altivum');
    });
  });
});
