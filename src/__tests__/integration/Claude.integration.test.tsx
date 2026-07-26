import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Claude from '../../pages/Claude';

// Mock responsive image imports (`?responsive` Vite plugin runs at build/dev,
// not under Vitest). Each mock returns the ResponsiveImageSource shape.
vi.mock('../../assets/claude-hero.png?responsive', () => ({
  default: {
    fallback: { src: '/mock-claude-hero.png', width: 1200, height: 630 },
    avif: [{ src: '/mock-claude-hero.avif', width: 1200 }],
    webp: [{ src: '/mock-claude-hero.webp', width: 1200 }],
    width: 1200,
    height: 630,
  },
}));
vi.mock('../../assets/claude-bedrock-cert.png?responsive', () => ({
  default: {
    fallback: { src: '/mock-claude-bedrock-cert.png', width: 1000, height: 750 },
    avif: [{ src: '/mock-claude-bedrock-cert.avif', width: 1000 }],
    webp: [{ src: '/mock-claude-bedrock-cert.webp', width: 1000 }],
    width: 1000,
    height: 750,
  },
}));

// Mock GSAP (ArchitectureXRay timeline animations)
vi.mock('gsap', () => ({
  default: {
    from: vi.fn(),
    to: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      play: vi.fn(),
      kill: vi.fn(),
    })),
  },
}));

// Mock useMediaQuery to return desktop layout for ArchitectureXRay
vi.mock('../../hooks/useMediaQuery', () => ({
  useMediaQuery: () => true,
}));

// Mock session-token issuance (used by ArchitectureXRay for live trace)
vi.mock('../../utils/sessionToken', () => ({
  getSessionToken: vi.fn().mockResolvedValue(''),
}));

// Mock TraceInput and TraceResponseBubble (not needed for page-level structural tests)
vi.mock('../../components/claude/TraceInput', () => ({
  TraceInput: () => <div data-testid="trace-input" />,
}));

vi.mock('../../components/claude/TraceResponseBubble', () => ({
  TraceResponseBubble: () => null,
}));

// Mock prefetchRoute (consumed by ViewTransitionLink in the cross-link band).
vi.mock('../../utils/routeManifest', () => ({
  prefetchRoute: vi.fn(),
}));

const renderClaude = () => {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/claude']}>
        <Claude />
      </MemoryRouter>
    </HelmetProvider>,
  );
};

describe('Claude Page Integration', () => {
  describe('Hero section', () => {
    it('renders the hero image with correct alt text', () => {
      renderClaude();
      const heroImage = screen.getByAltText('Applied — Claude by Anthropic');
      expect(heroImage).toBeInTheDocument();
      expect(heroImage.tagName).toBe('IMG');
    });

    it('renders an accessible sr-only h1 heading', () => {
      renderClaude();
      const heading = screen.getByRole('heading', {
        level: 1,
        name: /claude - applied ai engineer/i,
      });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Introduction section', () => {
    it('renders the first intro paragraph about Claude as foundation', () => {
      renderClaude();
      expect(
        screen.getByText((_content, element) => {
          if (element?.tagName !== 'P') return false;
          const text = element.textContent || '';
          return (
            text.includes("Claude isn't just a tool I use") &&
            text.includes('AI systems I build') &&
            text.includes('Altivum Inc.')
          );
        }),
      ).toBeInTheDocument();
    });

    it('renders the paragraph about Claude Haiku 4.5 and RAG', () => {
      renderClaude();
      expect(
        screen.getByText((_content, element) => {
          if (element?.tagName !== 'P') return false;
          const text = element.textContent || '';
          return (
            text.includes('Claude Haiku 4.5') &&
            text.includes('retrieval-augmented generation') &&
            text.includes('production-grade AI applications')
          );
        }),
      ).toBeInTheDocument();
    });

    it('renders the paragraph about the applied side of AI engineering', () => {
      renderClaude();
      expect(
        screen.getByText((_content, element) => {
          if (element?.tagName !== 'P') return false;
          const text = element.textContent || '';
          return text.includes('applied side of AI engineering') && text.includes('building real systems');
        }),
      ).toBeInTheDocument();
    });
  });

  describe('Architecture X-Ray section', () => {
    it('renders the "What is the architecture behind Alti?" section heading', () => {
      renderClaude();
      expect(screen.getByRole('heading', { name: /architecture behind alti/i })).toBeInTheDocument();
    });

    it('renders the pipeline diagram with accessible label', () => {
      renderClaude();
      expect(
        screen.getByRole('img', {
          name: /architecture pipeline diagram showing the alti chat data flow/i,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('What I Build (Focus Areas) section', () => {
    it('renders the "What does Christian build with Claude?" heading', () => {
      renderClaude();
      expect(screen.getByRole('heading', { name: /what does christian build with claude/i })).toBeInTheDocument();
    });

    it('renders all 3 focus area cards', () => {
      renderClaude();
      expect(screen.getByRole('heading', { name: /conversational ai & rag/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /ai-augmented development/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /intelligent systems design/i })).toBeInTheDocument();
    });
  });

  describe('How I Work With Claude section', () => {
    it('renders the "How does Christian work with Claude?" heading', () => {
      renderClaude();
      expect(screen.getByRole('heading', { name: /how does christian work with claude/i })).toBeInTheDocument();
    });

    it('renders all 3 subsections (Why production first, Why keep humans in the loop, What does full-stack AI mean)', () => {
      renderClaude();
      expect(screen.getByRole('heading', { name: /why production first/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /why keep humans in the loop/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /what does full-stack ai mean/i })).toBeInTheDocument();
    });
  });

  describe('Anthropic Academy section', () => {
    it('renders the featured "Claude with Amazon Bedrock" certification', () => {
      renderClaude();
      expect(screen.getByRole('heading', { name: /claude with amazon bedrock/i })).toBeInTheDocument();
      expect(screen.getByAltText('Certificate of Completion — Claude with Amazon Bedrock')).toBeInTheDocument();
      expect(screen.getByText(/issued january 2026/i)).toBeInTheDocument();
    });

    it('renders the "Claude with the Anthropic API" cert with correct verify URL and issued date', () => {
      renderClaude();
      const certHeading = screen.getByRole('heading', {
        name: /claude with the anthropic api/i,
      });
      expect(certHeading).toBeInTheDocument();

      // Compact row layout: the entire <li> wraps the title, date, and the
      // whole-row <a> anchor. Scope all assertions to the row container.
      const row = certHeading.closest('li');
      expect(row).not.toBeNull();

      expect(row!.textContent).toContain('Issued April 2026');

      const verifyLink = row!.querySelector('a');
      expect(verifyLink).not.toBeNull();
      expect(verifyLink).toHaveAttribute('href', 'https://verify.skilljar.com/c/op29b22ona53');
      expect(verifyLink).toHaveAttribute('target', '_blank');
      expect(verifyLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders the featured cert verify link with correct URL', () => {
      renderClaude();
      const links = screen.getAllByRole('link', { name: /verify/i });
      const featuredLink = links.find(
        (link) => link.getAttribute('href') === 'https://verify.skilljar.com/c/chryt9ap866c',
      );
      expect(featuredLink).toBeDefined();
      expect(featuredLink).toHaveAttribute('target', '_blank');
      expect(featuredLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('SEO metadata', () => {
    it('sets the page title correctly', async () => {
      renderClaude();

      await vi.waitFor(() => {
        expect(document.title).toBe('Claude | Christian Perez');
      });
    });

    it('includes breadcrumb structured data', async () => {
      renderClaude();

      await vi.waitFor(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        const combined = Array.from(scripts)
          .map((s) => s.textContent || '')
          .join('\n');
        expect(combined).toContain('BreadcrumbList');
      });
    });
  });

  describe('Newsletter CTA + cross-link band', () => {
    it('mounts the NewsletterCTA with an email input and subscribe control', () => {
      renderClaude();
      expect(screen.getByPlaceholderText('Enter your email address')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
    });

    it('renders a cross-link band with at least two internal links to related pages', () => {
      renderClaude();
      const nav = screen.getByRole('navigation', { name: /explore more/i });
      const anchors = nav.querySelectorAll('a[href]');
      expect(anchors.length).toBeGreaterThanOrEqual(2);
      const hrefs = Array.from(anchors).map((a) => a.getAttribute('href'));
      hrefs.forEach((href) => {
        expect(href).toMatch(/^\//);
      });
      expect(hrefs).not.toContain('/claude');
    });
  });
});
