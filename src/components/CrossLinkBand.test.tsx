import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CrossLinkBand from './CrossLinkBand';

// Mock prefetchRoute (consumed by ViewTransitionLink) so the test does not
// touch the real route manifest.
vi.mock('../utils/routeManifest', () => ({
  prefetchRoute: vi.fn(),
}));

const LINKS = [
  { to: '/about', label: 'About Christian', description: 'The story behind the work.' },
  { to: '/foundation', label: 'Altivum Foundation', description: 'Veteran-focused nonprofit.' },
  { to: '/aws', label: 'AWS Work', description: 'Cloud and AI engineering.' },
];

const renderBand = (props: Partial<React.ComponentProps<typeof CrossLinkBand>> = {}) =>
  render(
    <MemoryRouter>
      <CrossLinkBand links={LINKS} {...props} />
    </MemoryRouter>,
  );

describe('CrossLinkBand', () => {
  it('renders the default heading and eyebrow', () => {
    renderBand();
    expect(screen.getByRole('heading', { level: 2, name: /explore more/i })).toBeInTheDocument();
    expect(screen.getByText(/keep exploring/i)).toBeInTheDocument();
  });

  it('renders one card per link with label and description', () => {
    renderBand();
    expect(screen.getByRole('heading', { level: 3, name: /about christian/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /altivum foundation/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /aws work/i })).toBeInTheDocument();
    expect(screen.getByText('The story behind the work.')).toBeInTheDocument();
    expect(screen.getByText('Veteran-focused nonprofit.')).toBeInTheDocument();
    expect(screen.getByText('Cloud and AI engineering.')).toBeInTheDocument();
  });

  it('renders at least two internal ViewTransitionLink anchors with correct hrefs', () => {
    renderBand();
    const nav = screen.getByRole('navigation', { name: /explore more/i });
    const anchors = nav.querySelectorAll('a[href]');
    expect(anchors.length).toBeGreaterThanOrEqual(2);
    const hrefs = Array.from(anchors).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/about');
    expect(hrefs).toContain('/foundation');
    expect(hrefs).toContain('/aws');
  });

  it('renders nothing when links array is empty', () => {
    const { container } = render(
      <MemoryRouter>
        <CrossLinkBand links={[]} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('supports custom heading and eyebrow copy', () => {
    renderBand({ heading: 'Continue reading', eyebrow: 'Next stops' });
    expect(screen.getByRole('heading', { level: 2, name: /continue reading/i })).toBeInTheDocument();
    expect(screen.getByText(/next stops/i)).toBeInTheDocument();
  });

  it('marks the section with an aria-labelledby pointer to the heading', () => {
    renderBand();
    const heading = screen.getByRole('heading', { level: 2, name: /explore more/i });
    const section = heading.closest('section');
    expect(section).not.toBeNull();
    expect(section?.getAttribute('aria-labelledby')).toBe('cross-link-band-heading');
  });
});
