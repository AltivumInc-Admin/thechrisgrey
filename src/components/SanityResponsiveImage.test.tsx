import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock the Sanity image-url builder so the component renders in jsdom without a
// real Sanity image pipeline. The builder REFLECTS its arguments in the URL it
// returns: a chainable that answered the same string from every method made all
// srcSet candidates identical, which would have hidden a broken URL chain from
// any assertion that looked.
const lastCall: { w?: number; h?: number; q?: number; blur?: number } = {};
const chainable = {
  width: (w: number) => {
    lastCall.w = w;
    return chainable;
  },
  height: (h: number) => {
    lastCall.h = h;
    return chainable;
  },
  auto: () => chainable,
  quality: (q: number) => {
    lastCall.q = q;
    return chainable;
  },
  blur: (b: number) => {
    lastCall.blur = b;
    return chainable;
  },
  url: () => `https://mock-image.jpg?w=${lastCall.w}&h=${lastCall.h}&q=${lastCall.q}`,
};
vi.mock('../sanity/client', () => ({
  urlFor: () => chainable,
}));

import SanityResponsiveImage from './SanityResponsiveImage';

// Minimal Sanity image source stub — urlFor is mocked above so the component
// renders without a real Sanity image pipeline. The `_ref` has to be in the id
// form the real builder can parse (`image-<hash>-<w>x<h>-<ext>`), because the
// component now rejects anything urlFor would throw on before it ever calls it.
const source = { asset: { _ref: 'image-testasset-1200x800-jpg' } } as never;

describe('SanityResponsiveImage', () => {
  it('renders an <img> with the provided non-empty alt', () => {
    const { container } = render(<SanityResponsiveImage source={source} alt="A descriptive alt" sizes="100vw" />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('alt')).toBe('A descriptive alt');
    expect(img?.getAttribute('role')).toBeNull();
    expect(img?.getAttribute('aria-hidden')).toBeNull();
  });

  it('marks decorative images (empty alt) with role=presentation and aria-hidden (VAL-SEO-011)', () => {
    const { container } = render(<SanityResponsiveImage source={source} alt="" sizes="100vw" />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('alt')).toBe('');
    expect(img?.getAttribute('role')).toBe('presentation');
    expect(img?.getAttribute('aria-hidden')).toBe('true');
  });

  it('treats whitespace-only alt as decorative (VAL-SEO-011)', () => {
    const { container } = render(<SanityResponsiveImage source={source} alt="   " sizes="100vw" />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('role')).toBe('presentation');
    expect(img?.getAttribute('aria-hidden')).toBe('true');
  });

  it('returns null when no source is provided', () => {
    const { container } = render(<SanityResponsiveImage source={null} alt="x" sizes="100vw" />);
    expect(container.querySelector('img')).toBeNull();
  });

  it.each([
    ['an empty asset', { asset: {} }],
    ['an asset that never dereferenced', { asset: { _id: 'not-an-image' } }],
    ['a url-only asset', { asset: { url: 'https://cdn.sanity.io/x.jpg' } }],
    ['a _ref the builder cannot parse', { asset: { _ref: 'x' } }],
  ])('returns null for %s rather than letting urlFor throw through render', (_label, badSource) => {
    // Truthy but unparseable: the real @sanity/image-url throws on each of these,
    // and a throw here reaches the top-level ErrorBoundary and blanks the page.
    const { container } = render(<SanityResponsiveImage source={badSource as never} alt="x" sizes="100vw" />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('builds one srcSet candidate per width, each with its own URL and Nw descriptor', () => {
    const { container } = render(
      <SanityResponsiveImage source={source} alt="x" sizes="100vw" widths={[320, 480, 640]} />,
    );
    const candidates = container.querySelector('img')!.getAttribute('srcset')!.split(', ');

    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toBe('https://mock-image.jpg?w=320&h=180&q=80 320w');
    expect(candidates[1]).toBe('https://mock-image.jpg?w=480&h=270&q=80 480w');
    expect(candidates[2]).toBe('https://mock-image.jpg?w=640&h=360&q=80 640w');
  });

  it('sets intrinsic width/height from the largest width and the aspect ratio (the CLS contract)', () => {
    const { container } = render(
      <SanityResponsiveImage source={source} alt="x" sizes="100vw" widths={[320, 800]} aspectRatio={4 / 3} />,
    );
    const img = container.querySelector('img')!;

    // The browser reserves the box from the RATIO of these two attributes;
    // dropping them is what reintroduces layout shift.
    expect(img.getAttribute('width')).toBe('800');
    expect(img.getAttribute('height')).toBe('600');
    expect(img.getAttribute('src')).toBe('https://mock-image.jpg?w=800&h=600&q=80');
  });

  it('honors the quality prop in every generated URL', () => {
    const { container } = render(
      <SanityResponsiveImage source={source} alt="x" sizes="100vw" widths={[640]} quality={55} />,
    );
    expect(container.querySelector('img')!.getAttribute('src')).toContain('q=55');
  });

  it('defers loading by default and prioritizes it when priority is set', () => {
    const { container: lazy } = render(<SanityResponsiveImage source={source} alt="x" sizes="100vw" />);
    const lazyImg = lazy.querySelector('img')!;
    expect(lazyImg.getAttribute('loading')).toBe('lazy');
    expect(lazyImg.getAttribute('decoding')).toBe('async');
    expect(lazyImg.getAttribute('fetchpriority')).toBeNull();

    const { container: eager } = render(<SanityResponsiveImage source={source} alt="x" sizes="100vw" priority />);
    const eagerImg = eager.querySelector('img')!;
    expect(eagerImg.getAttribute('loading')).toBe('eager');
    expect(eagerImg.getAttribute('decoding')).toBe('sync');
    expect(eagerImg.getAttribute('fetchpriority')).toBe('high');
  });

  it('uses the lqip Sanity already shipped instead of a second CDN request', () => {
    const lqip = 'data:image/png;base64,iVBORw0KGgo=';
    const withMetadata = {
      asset: { _id: 'image-abc-1200x800-jpg', url: 'https://cdn.sanity.io/x.jpg', metadata: { lqip } },
    } as never;

    const { container } = render(<SanityResponsiveImage source={withMetadata} alt="x" sizes="100vw" />);
    const wrapper = container.firstElementChild as HTMLElement;

    // jsdom normalizes url() to a quoted form, so match on the payload.
    expect(wrapper.style.backgroundImage).toContain(lqip);
    expect(wrapper.style.backgroundImage).not.toContain('cdn.sanity.io');
    expect(wrapper.style.backgroundImage).not.toContain('mock-image.jpg');
  });

  it('falls back to a generated blur URL when the source carries no metadata', () => {
    // bookReference covers arrive as `{ asset: { _ref } }` with no metadata.
    const { container } = render(<SanityResponsiveImage source={source} alt="x" sizes="100vw" />);
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper.style.backgroundImage).toContain('mock-image.jpg');
    expect(lastCall.blur).toBe(50);
  });

  it('ignores an lqip that is not an image data URI', () => {
    // The value is interpolated into a CSS url(); only a real data URI may pass.
    const hostile = {
      asset: { _id: 'image-abc-1200x800-jpg', url: 'https://cdn.sanity.io/x.jpg', metadata: { lqip: 'javascript:x' } },
    } as never;

    const { container } = render(<SanityResponsiveImage source={hostile} alt="x" sizes="100vw" />);
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper.style.backgroundImage).not.toContain('javascript:');
    expect(wrapper.style.backgroundImage).toContain('mock-image.jpg');
  });
});
