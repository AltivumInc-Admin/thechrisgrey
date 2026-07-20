import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { portableTextComponents } from './PortableTextComponents';

vi.mock('../utils/routeManifest', () => ({
  prefetchRoute: vi.fn(),
}));

const transitionSpy = vi.fn();
vi.mock('../hooks/useViewTransitionNavigate', () => ({
  useViewTransitionNavigate: () => transitionSpy,
}));

// The Portable Text `link` mark renderer is a React component stored on
// `portableTextComponents.marks.link`. Render it directly with a mock `value`
// (the Sanity mark object) and children to exercise its branching logic.
const renderLink = (value: { href?: string; openInNewTab?: boolean }, children = 'link text') => {
  const LinkMark = portableTextComponents.marks!.link as unknown as (props: {
    children: React.ReactNode;
    value: typeof value;
  }) => React.ReactElement;

  return render(
    <MemoryRouter>
      <LinkMark value={value}>{children}</LinkMark>
    </MemoryRouter>,
  );
};

describe('PortableText link mark', () => {
  it('renders an internal relative path as a ViewTransitionLink (SPA transition)', () => {
    renderLink({ href: '/blog/my-post' });
    const link = screen.getByRole('link', { name: /link text/i });
    expect(link).toHaveAttribute('href', '/blog/my-post');
    // No target/rel — it's an in-app navigation, not a new tab.
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('navigates via SPA transition when an internal link is clicked', () => {
    renderLink({ href: '/blog/my-post' });
    transitionSpy.mockClear();
    fireEvent.click(screen.getByRole('link', { name: /link text/i }));
    expect(transitionSpy).toHaveBeenCalledWith('/blog/my-post');
  });

  it('treats a same-origin absolute URL as internal and extracts the path', () => {
    renderLink({ href: 'https://thechrisgrey.com/blog/same-origin' });
    const link = screen.getByRole('link', { name: /link text/i });
    expect(link).toHaveAttribute('href', '/blog/same-origin');
    expect(link).not.toHaveAttribute('target');
  });

  it('renders an external URL as a plain anchor with target=_blank and noopener rel', () => {
    renderLink({ href: 'https://example.com/page' });
    const link = screen.getByRole('link', { name: /link text/i });
    expect(link).toHaveAttribute('href', 'https://example.com/page');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does NOT SPA-navigate when an external link is clicked', () => {
    renderLink({ href: 'https://example.com/page' });
    transitionSpy.mockClear();
    fireEvent.click(screen.getByRole('link', { name: /link text/i }));
    expect(transitionSpy).not.toHaveBeenCalled();
  });

  it('honors an explicit openInNewTab=true on an internal link (author intent wins)', () => {
    renderLink({ href: '/blog/another', openInNewTab: true });
    const link = screen.getByRole('link', { name: /link text/i });
    // Author wants a new tab — render a plain anchor, not a ViewTransitionLink,
    // so the browser actually opens a new tab instead of SPA-navigating.
    expect(link).toHaveAttribute('href', '/blog/another');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders the link with the gold link styling', () => {
    renderLink({ href: '/internal' });
    const link = screen.getByRole('link', { name: /link text/i });
    expect(link.className).toContain('text-altivum-gold');
  });
});
