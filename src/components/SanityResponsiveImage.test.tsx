import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock the Sanity image-url builder so the component renders in jsdom without
// a real Sanity image pipeline. Returns a fully chainable builder whose any
// method (width/height/auto/quality/blur) returns the same chainable object,
// so both the buildUrl and lqipUrl chains resolve to a .url() call.
const chainable = {
  width: () => chainable,
  height: () => chainable,
  auto: () => chainable,
  quality: () => chainable,
  blur: () => chainable,
  url: () => 'https://mock-image.jpg',
};
vi.mock('../sanity/client', () => ({
  urlFor: () => chainable,
}));

import SanityResponsiveImage from './SanityResponsiveImage';

// Minimal Sanity image source stub — urlFor is mocked above so the component
// renders without a real Sanity image pipeline.
const source = { _ref: 'test-asset-ref' } as never;

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
});
