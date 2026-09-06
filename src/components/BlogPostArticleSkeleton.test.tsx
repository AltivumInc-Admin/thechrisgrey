import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BlogPostArticleSkeleton from './BlogPostArticleSkeleton';

const { mockIsMotionDisabled } = vi.hoisted(() => ({ mockIsMotionDisabled: vi.fn(() => false) }));

vi.mock('../utils/motion', () => ({ isMotionDisabled: mockIsMotionDisabled }));

describe('BlogPostArticleSkeleton', () => {
  beforeEach(() => {
    mockIsMotionDisabled.mockReturnValue(false);
  });

  it('should render without crashing', () => {
    const { container } = render(<BlogPostArticleSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should announce itself as a loading status', () => {
    render(<BlogPostArticleSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading article' })).toBeInTheDocument();
  });

  it('should hide the individual placeholder blocks from screen readers', () => {
    const { container } = render(<BlogPostArticleSkeleton />);
    const blocks = container.querySelectorAll('[data-shimmer]');
    expect(blocks.length).toBeGreaterThan(0);
    blocks.forEach((block) => expect(block).toHaveAttribute('aria-hidden', 'true'));
  });

  it('should shimmer by default', () => {
    const { container } = render(<BlogPostArticleSkeleton />);
    expect(container.firstElementChild?.className).toContain('[&_[data-shimmer]]:animate-pulse');
  });

  it('should stop shimmering when motion is disabled', () => {
    // index.css's reduced-motion block does not neutralise animate-pulse, so
    // the gate has to happen here.
    mockIsMotionDisabled.mockReturnValue(true);
    const { container } = render(<BlogPostArticleSkeleton />);
    expect(container.firstElementChild?.className).not.toContain('animate-pulse');
  });

  it('should mirror the real article layout so content does not jump on load', () => {
    const { container } = render(<BlogPostArticleSkeleton />);
    // BlogPost's hero column is max-w-4xl at pt-24 + pt-16, over an absolute
    // h-[50vh] background; its body column is max-w-3xl.
    const heroSection = container.querySelector('section.pt-24');
    expect(heroSection).toBeInTheDocument();
    expect(heroSection?.querySelector('.absolute.h-\\[50vh\\]')).toBeInTheDocument();
    expect(heroSection?.querySelector('.max-w-4xl.pt-16')).toBeInTheDocument();
    expect(container.querySelector('.max-w-3xl')).toBeInTheDocument();
  });
});
