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

// SanityResponsiveImage reaches @sanity/image-url, which parses real asset refs.
// Render a stub that echoes the aspectRatio it was handed so the body-image
// renderer's ratio decision is observable.
vi.mock('../components/SanityResponsiveImage', () => ({
  default: ({ alt, aspectRatio }: { alt: string; aspectRatio?: number }) => (
    <img src="https://mock-image.jpg" alt={alt} data-aspect-ratio={String(aspectRatio)} />
  ),
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

const renderImageBlock = (value: unknown) => {
  const ImageBlock = portableTextComponents.types!.image as unknown as (props: {
    value: unknown;
  }) => React.ReactElement | null;

  return render(<ImageBlock value={value} />);
};

const renderBookReference = (value: Record<string, unknown>) => {
  const BookReference = portableTextComponents.types!.bookReference as unknown as (props: {
    value: Record<string, unknown>;
  }) => React.ReactElement;

  return render(<BookReference value={value} />);
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

  it('keeps the query and hash of a same-origin absolute URL', () => {
    // Returning the pathname alone silently dropped an author's filter or anchor.
    renderLink({ href: 'https://thechrisgrey.com/blog?series=cloud#part-2' });
    expect(screen.getByRole('link', { name: /link text/i })).toHaveAttribute('href', '/blog?series=cloud#part-2');
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

  it('treats a protocol-relative href as EXTERNAL, not as an in-app route', () => {
    // `//evil.com` used to skip the origin comparison entirely and render as a
    // trusted ViewTransitionLink — no target, no rel, and navigate() called with it.
    renderLink({ href: '//evil.com/phish' });
    const link = screen.getByRole('link', { name: /link text/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    transitionSpy.mockClear();
    fireEvent.click(link);
    expect(transitionSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['mailto:', 'mailto:someone@example.com'],
    ['tel:', 'tel:+15551234567'],
  ])('renders a %s href as a plain anchor with its scheme intact', (_label, href) => {
    // These were rewritten into in-app routes like /blog/mailto:someone@example.com.
    renderLink({ href });
    const link = screen.getByRole('link', { name: /link text/i });
    expect(link).toHaveAttribute('href', href);

    transitionSpy.mockClear();
    fireEvent.click(link);
    expect(transitionSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html,<script>alert(1)</script>'],
  ])('renders %s: hrefs as plain text, never as a live anchor', (_label, href) => {
    renderLink({ href, openInNewTab: true });
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('link text')).toBeTruthy();
  });

  it('renders plain text when the mark carries no href at all', () => {
    renderLink({});
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('link text')).toBeTruthy();
  });
});

describe('PortableText image block', () => {
  /** jsdom normalizes `aspect-ratio: 0.953` to the `0.953 / 1` ratio form. */
  const reservedRatio = (el: HTMLElement): number => {
    const parts = el.style.aspectRatio.split('/').map((part) => Number(part.trim()));
    return parts.length > 1 ? parts[0] / parts[1] : parts[0];
  };

  const withRatio = (aspectRatio: number) => ({
    _type: 'image',
    asset: {
      _id: 'image-abc-1200x800-jpg',
      url: 'https://cdn.sanity.io/x.jpg',
      metadata: { dimensions: { aspectRatio } },
    },
    alt: 'A screenshot',
  });

  it('reserves a box shaped like the image, not a hardcoded 4:3', () => {
    // A 0.953 portrait used to lose ~28% of its height to object-cover inside a
    // 4:3 box; a 3.8 banner lost ~65% of its width.
    const { container } = renderImageBlock(withRatio(0.953));
    const box = container.querySelector('figure > div') as HTMLElement;

    expect(reservedRatio(box)).toBeCloseTo(0.953, 5);
    expect(container.querySelector('img')).toHaveAttribute('data-aspect-ratio', '0.953');
  });

  it('clamps an extreme portrait so it cannot take over the column', () => {
    const { container } = renderImageBlock(withRatio(0.25));
    const box = container.querySelector('figure > div') as HTMLElement;

    expect(reservedRatio(box)).toBeCloseTo(0.6, 5);
  });

  it('falls back to 4:3 when the asset carries no dimensions', () => {
    const { container } = renderImageBlock({
      _type: 'image',
      asset: { _id: 'image-abc-1200x800-jpg', url: 'https://cdn.sanity.io/x.jpg' },
      alt: 'x',
    });
    const box = container.querySelector('figure > div') as HTMLElement;

    expect(reservedRatio(box)).toBeCloseTo(4 / 3, 5);
  });

  it('renders nothing for an asset ref the URL builder could not parse', () => {
    const { container } = renderImageBlock({ _type: 'image', asset: { _ref: 'x' } });
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('PortableText bookReference link', () => {
  it('links out for an https URL', () => {
    renderBookReference({ title: 'A Book', author: 'An Author', link: 'https://example.com/book' });
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/book');
  });

  it('renders the card without an anchor for a non-allowlisted scheme', () => {
    renderBookReference({ title: 'A Book', author: 'An Author', link: 'javascript:alert(1)' });
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('A Book')).toBeTruthy();
  });
});
