import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import AWS from '../../pages/AWS';

// Mock static image imports
vi.mock('../../assets/aws-hero.png', () => ({ default: '/mock-aws-hero.png' }));
vi.mock('../../assets/aws-community-builder.webp', () => ({
  default: '/mock-aws-community-builder.webp',
}));

// Mock WebGL check (jsdom has no WebGL) -- returns false so 2D fallback renders
vi.mock('../../utils/checkWebGL', () => ({
  checkWebGLSupport: () => false,
}));

// Mock GSAP for FallbackDetail height animations
vi.mock('gsap', () => ({
  default: { from: vi.fn(), to: vi.fn() },
}));

// Mock useFocusTrap for FallbackDetail
vi.mock('../../hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({
    containerRef: { current: null },
    setContainerRef: vi.fn(),
    handleKeyDown: vi.fn(),
  }),
}));

// Mock prefetchRoute (consumed by ViewTransitionLink in the cross-link band).
vi.mock('../../utils/routeManifest', () => ({
  prefetchRoute: vi.fn(),
}));

const renderAWS = () => {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/aws']}>
        <AWS />
      </MemoryRouter>
    </HelmetProvider>,
  );
};

describe('AWS Page Integration', () => {
  describe('Hero section', () => {
    it('renders the hero image with correct alt text', () => {
      renderAWS();
      const heroImage = screen.getByAltText('AWS - AI Engineering');
      expect(heroImage).toBeInTheDocument();
      expect(heroImage.tagName).toBe('IMG');
    });

    it('renders an accessible h1 heading for screen readers', () => {
      renderAWS();
      const heading = screen.getByRole('heading', {
        level: 1,
        name: /amazon web services.*aws community builder.*ai engineering/i,
      });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Community Builder Banner section', () => {
    it('renders the community builder image', () => {
      renderAWS();
      const cbImage = screen.getByAltText('Christian Perez - AWS Community Builder');
      expect(cbImage).toBeInTheDocument();
    });
  });

  describe('Introduction section', () => {
    it('renders the AWS Community Builder title text', () => {
      renderAWS();
      expect(
        screen.getByText((_content, element) => {
          return element?.tagName === 'P' && element.textContent === 'AWS Community Builder';
        }),
      ).toBeInTheDocument();
    });

    it('renders the AI Engineering subtitle', () => {
      renderAWS();
      expect(
        screen.getByText((_content, element) => {
          return element?.tagName === 'P' && element.textContent?.trim() === 'AI Engineering';
        }),
      ).toBeInTheDocument();
    });

    it('describes the AWS Community Builders program', () => {
      renderAWS();
      expect(
        screen.getByText((_content, element) => {
          if (element?.tagName !== 'P') return false;
          const text = element.textContent || '';
          return text.includes('AWS Community Builders') && text.includes('program provides');
        }),
      ).toBeInTheDocument();
    });
  });

  describe('Infrastructure Topology section', () => {
    it('renders "The Stack" section heading', () => {
      renderAWS();
      expect(screen.getByRole('heading', { name: /the stack/i })).toBeInTheDocument();
    });

    it('renders all 6 cluster labels in the 2D fallback', () => {
      renderAWS();
      expect(screen.getByText('CDN / Edge')).toBeInTheDocument();
      expect(screen.getByText('Compute')).toBeInTheDocument();
      expect(screen.getByText('AI / ML')).toBeInTheDocument();
      expect(screen.getByText('Data')).toBeInTheDocument();
      expect(screen.getByText('Auth')).toBeInTheDocument();
      expect(screen.getByText('Observability')).toBeInTheDocument();
    });
  });

  describe('SEO metadata', () => {
    it('sets the page title correctly', async () => {
      renderAWS();

      await vi.waitFor(() => {
        expect(document.title).toBe('Amazon Web Services | Christian Perez');
      });
    });

    it('includes breadcrumb structured data', async () => {
      renderAWS();

      await vi.waitFor(() => {
        const script = document.querySelector('script[type="application/ld+json"]');
        const content = script?.textContent || '';
        expect(content).toContain('BreadcrumbList');
      });
    });
  });

  describe('Newsletter CTA + cross-link band', () => {
    it('mounts the NewsletterCTA with an email input and subscribe control', () => {
      renderAWS();
      expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
    });

    it('renders a cross-link band with at least two internal links to related pages', () => {
      renderAWS();
      const nav = screen.getByRole('navigation', { name: /explore more/i });
      const anchors = nav.querySelectorAll('a[href]');
      expect(anchors.length).toBeGreaterThanOrEqual(2);
      const hrefs = Array.from(anchors).map((a) => a.getAttribute('href'));
      hrefs.forEach((href) => {
        expect(href).toMatch(/^\//);
      });
      expect(hrefs).not.toContain('/aws');
    });
  });
});
