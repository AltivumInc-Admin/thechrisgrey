import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import BeyondTheAssessment from '../../pages/BeyondTheAssessment';

// Mock static image imports
vi.mock('../../assets/bta.png', () => ({ default: '/mock-bta.png' }));
vi.mock('../../assets/reading.jpeg', () => ({ default: '/mock-reading.jpeg' }));

// Mock the analytics tracker so click events do not touch PostHog in jsdom.
vi.mock('../../utils/analytics', () => ({ trackEvent: vi.fn() }));

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/beyond-the-assessment']}>
        <BeyondTheAssessment />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe('Beyond the Assessment Page Integration', () => {
  describe('primary book CTA', () => {
    it('renders a primary "Get the book" CTA', () => {
      renderPage();
      const cta = screen.getByRole('link', { name: /get the book/i });
      expect(cta).toBeInTheDocument();
    });

    it('navigates to the Amazon purchase URL', () => {
      renderPage();
      const cta = screen.getByRole('link', { name: /get the book/i });
      expect(cta.getAttribute('href')).toBe('https://a.co/d/iC9TEDW');
      expect(cta).toHaveAttribute('target', '_blank');
      expect(cta).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('is styled as the primary (gold) call-to-action', () => {
      renderPage();
      const cta = screen.getByRole('link', { name: /get the book/i });
      expect(cta.className).toContain('bg-altivum-gold');
      expect(cta.className).toContain('text-altivum-dark');
    });
  });

  describe('SEO metadata', () => {
    it('emits Book schema with the Amazon offer URL', async () => {
      renderPage();
      await vi.waitFor(() => {
        const script = document.querySelector('script[type="application/ld+json"]');
        expect(script).toBeTruthy();
        expect(script?.textContent ?? '').toContain('https://a.co/d/iC9TEDW');
      });
    });
  });

  describe('reader testimonials', () => {
    it('renders the testimonials section from the shared data source', () => {
      renderPage();
      // The Testimonials component renders from the default TESTIMONIALS array.
      expect(screen.getByRole('heading', { name: /what readers are saying/i })).toBeInTheDocument();
    });
  });
});
