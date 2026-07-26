import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Foundation from '../../pages/Foundation';

// Mock responsive image import (`?responsive` Vite plugin runs at build/dev,
// not under Vitest). Returns the ResponsiveImageSource shape.
vi.mock('../../assets/foundation.webp?responsive', () => ({
  default: {
    fallback: { src: '/mock-foundation.webp', width: 1920, height: 1080 },
    avif: [{ src: '/mock-foundation.avif', width: 1920 }],
    webp: [{ src: '/mock-foundation.webp', width: 1920 }],
    width: 1920,
    height: 1080,
  },
}));

// Mock prefetchRoute (consumed by ViewTransitionLink in the cross-link band).
vi.mock('../../utils/routeManifest', () => ({
  prefetchRoute: vi.fn(),
}));

const renderFoundation = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/foundation']}>
        <Foundation />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe('Foundation Page Integration', () => {
  describe('Hero section', () => {
    it('renders the hero image with descriptive alt text', () => {
      renderFoundation();
      expect(screen.getByAltText('Veterans pursuing education in technology')).toBeInTheDocument();
    });

    it('renders the hero h1 with the scholarship focus', () => {
      renderFoundation();
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /veteran scholarships in ai, cloud, robotics & cybersecurity\./i,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('SEO metadata', () => {
    it('sets the page title correctly', async () => {
      renderFoundation();
      await vi.waitFor(() => {
        expect(document.title).toBe('The Altivum Foundation | Christian Perez');
      });
    });

    it('includes breadcrumb structured data', async () => {
      renderFoundation();
      await vi.waitFor(() => {
        const script = document.querySelector('script[type="application/ld+json"]');
        expect(script?.textContent || '').toContain('BreadcrumbList');
      });
    });
  });

  describe('Newsletter CTA + cross-link band', () => {
    it('mounts the NewsletterCTA with an email input and subscribe control', () => {
      renderFoundation();
      expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
    });

    it('renders a cross-link band with at least two internal links to related pages', () => {
      renderFoundation();
      const nav = screen.getByRole('navigation', { name: /explore more/i });
      const anchors = nav.querySelectorAll('a[href]');
      expect(anchors.length).toBeGreaterThanOrEqual(2);
      const hrefs = Array.from(anchors).map((a) => a.getAttribute('href'));
      hrefs.forEach((href) => {
        expect(href).toMatch(/^\//);
      });
      expect(hrefs).not.toContain('/foundation');
    });
  });
});
