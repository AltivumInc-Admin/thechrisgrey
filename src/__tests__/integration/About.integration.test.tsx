import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import About from '../../pages/About';

// Mock static image import
vi.mock('../../assets/mpb.png', () => ({ default: '/mock-mpb.png' }));

const renderAbout = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/about']}>
        <About />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe('About Page Integration', () => {
  describe('Credentials & Recognition section', () => {
    it('renders a visible Credentials & Recognition heading', () => {
      renderAbout();
      // The heading is phrased as a question (VAL-AEO-003) but still contains
      // "credentials & recognition" so the section is discoverable.
      expect(screen.getByRole('heading', { level: 2, name: /credentials & recognition/i })).toBeInTheDocument();
    });

    it('lists Bronze Star, Green Beret, 18D, AWS Community Builder, Anthropic Academy, and Veteran Business of the Month', () => {
      const { container } = renderAbout();
      // Scope to the Credentials & Recognition section so biography mentions of
      // "Green Beret" / "Special Forces Medic (18D)" do not collide.
      const section = container.querySelector('section[aria-labelledby="credentials-heading"]');
      expect(section).not.toBeNull();
      const within = section as HTMLElement;
      expect(within.textContent).toContain('Bronze Star Medal');
      expect(within.textContent).toContain('Green Beret');
      expect(within.textContent).toContain('Special Forces Medic (18D)');
      expect(within.textContent).toContain('AWS Community Builder');
      expect(within.textContent).toContain('Anthropic Academy Certifications');
      expect(within.textContent).toContain('Veteran Business of the Month');
    });

    it('links the Veteran Business of the Month reference to the Clarksville article', () => {
      renderAbout();
      const link = screen.getByRole('link', { name: /veteran business of the month — open reference/i });
      expect(link.getAttribute('href')).toMatch(/clarksvilleonline\.com/);
    });
  });

  describe('SEO metadata', () => {
    it('emits Person JSON-LD with the mirrored credentials', async () => {
      renderAbout();
      await vi.waitFor(() => {
        const script = document.querySelector('script[type="application/ld+json"]');
        expect(script).toBeTruthy();
        const content = script?.textContent ?? '';
        expect(content).toContain('Bronze Star Medal');
        expect(content).toContain('Special Forces Medic (18D)');
        expect(content).toContain('Anthropic Academy Certifications');
      });
    });
  });
});
