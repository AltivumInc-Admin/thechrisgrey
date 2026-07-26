import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Home from '../../pages/Home';

const renderHome = () => {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/']}>
        <Home />
      </MemoryRouter>
    </HelmetProvider>,
  );
};

describe('Home Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hero section', () => {
    it('renders the animated brand-intro video from the CloudFront source', () => {
      const { container } = renderHome();
      const video = container.querySelector('section video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', 'https://d1x8296f4gso9u.cloudfront.net/thechrisgrey/hero-h264.mp4');
      // Decorative — page identity is carried by the sr-only <h1>.
      expect(video).toHaveAttribute('aria-hidden', 'true');
    });

    it('reserves the hero media box with intrinsic width and height (CLS)', () => {
      const { container } = renderHome();
      const video = container.querySelector('section video');
      expect(video).toHaveAttribute('width', '1920');
      expect(video).toHaveAttribute('height', '1080');
    });

    it('renders an accessible h1 heading for screen readers', () => {
      renderHome();
      const heading = screen.getByRole('heading', {
        level: 1,
        name: /christian perez.*leadership forged in service/i,
      });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Summary section with key points', () => {
    it('renders all 5 key points with correct titles', () => {
      renderHome();
      // Key-point titles render as h2 (demoted from h3 to fix the heading
      // outline, which previously skipped h1 -> h3). The CTA "Let's Connect"
      // h2 is also at this level; assertions below only check membership.
      const headings = screen.getAllByRole('heading', { level: 2 });
      const titles = headings.map((h) => h.textContent?.replace(/\s+/g, ' ').trim());
      expect(titles).toContain('Personal Biography');
      expect(titles).toContain('Altivum Inc');
      expect(titles).toContain('The Vector Podcast');
      expect(titles).toContain('Beyond the Assessment');
      expect(titles).toContain('Amazon Web Services');
    });

    it('renders all 5 key points with correct subtitles', () => {
      renderHome();
      expect(screen.getByText('Christian Perez')).toBeInTheDocument();
      expect(screen.getByText('Founder & CEO')).toBeInTheDocument();
      expect(screen.getByText('Host')).toBeInTheDocument();
      expect(screen.getByText('Author')).toBeInTheDocument();
      expect(screen.getByText('AWS Community Builder (AI Engineering)')).toBeInTheDocument();
    });

    it('renders key points as links to their respective pages', () => {
      renderHome();

      const links = screen.getAllByRole('link');
      const findLink = (href: string) => links.find((l) => l.getAttribute('href') === href);

      expect(findLink('/about')).toBeDefined();
      expect(findLink('/altivum')).toBeDefined();
      expect(findLink('/podcast')).toBeDefined();
      expect(findLink('/beyond-the-assessment')).toBeDefined();
      expect(findLink('/aws')).toBeDefined();
    });

    it('renders the profile image', () => {
      renderHome();
      const profileImage = screen.getByAltText('Christian Perez');
      expect(profileImage).toBeInTheDocument();
      expect(profileImage).toHaveAttribute('src', '/profile1.jpeg');
    });
  });

  describe('CTA section', () => {
    it('renders the "Let\'s Connect" heading', () => {
      renderHome();
      const heading = screen.getByRole('heading', { name: /let's connect/i });
      expect(heading).toBeInTheDocument();
    });

    it('renders a LinkedIn social link with correct href', () => {
      renderHome();
      const linkedinLinks = screen.getAllByRole('link', { name: /linkedin/i });
      const ctaLinkedIn = linkedinLinks.find(
        (link) => link.getAttribute('href') === 'https://www.linkedin.com/in/thechrisgrey/',
      );
      expect(ctaLinkedIn).toBeInTheDocument();
      expect(ctaLinkedIn).toHaveAttribute('target', '_blank');
      expect(ctaLinkedIn).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders an Instagram social link with correct href', () => {
      renderHome();
      const instagramLinks = screen.getAllByRole('link', { name: /instagram/i });
      const ctaInstagram = instagramLinks.find(
        (link) => link.getAttribute('href') === 'https://www.instagram.com/thechrisgrey/',
      );
      expect(ctaInstagram).toBeInTheDocument();
      expect(ctaInstagram).toHaveAttribute('target', '_blank');
    });

    it('renders a link to the Links page (demoted to "All links")', () => {
      renderHome();
      const allLinks = screen.getByRole('link', { name: /^all links$/i });
      expect(allLinks).toHaveAttribute('href', '/links');
    });

    it('leads the CTA with a newsletter capture (owned-audience conversion)', () => {
      renderHome();
      expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument();
    });

    it('offers podcast and book CTAs that route to the right pages', () => {
      renderHome();
      expect(screen.getByRole('link', { name: /listen to the podcast/i })).toHaveAttribute('href', '/podcast');
      expect(screen.getByRole('link', { name: /get the book/i })).toHaveAttribute('href', '/beyond-the-assessment');
    });
  });

  describe('Testimonials section', () => {
    it('renders at least one testimonial card with quote and attribution from the shared data source', () => {
      renderHome();
      // The Testimonials component renders from the default TESTIMONIALS array.
      expect(screen.getByRole('heading', { name: /in their words/i })).toBeInTheDocument();
      const firstQuote = screen.getByText(/Christian brings the same clarity/);
      expect(firstQuote).toBeInTheDocument();
      // Attribution is rendered as a figcaption author name.
      expect(screen.getByText(/Placeholder — replace with a real client quote/)).toBeInTheDocument();
    });
  });

  describe('SEO metadata', () => {
    it('sets the page title correctly', async () => {
      renderHome();
      // react-helmet-async sets document.title asynchronously in jsdom
      await vi.waitFor(() => {
        expect(document.title).toBe('Christian Perez | Christian Perez');
      });
    });

    it('includes JSON-LD structured data', async () => {
      renderHome();
      await vi.waitFor(() => {
        const script = document.querySelector('script[type="application/ld+json"]');
        expect(script).toBeTruthy();
        const content = script?.textContent || '';
        expect(content).toContain('@context');
        expect(content).toContain('schema.org');
      });
    });

    it('includes FAQ schema from homeFAQs', async () => {
      renderHome();
      await vi.waitFor(() => {
        const script = document.querySelector('script[type="application/ld+json"]');
        const content = script?.textContent || '';
        expect(content).toContain('FAQPage');
      });
    });
  });
});
