import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YouTubeFacade from './YouTubeFacade';

// Mock react-helmet-async so Helmet renders its children inline (into the
// body) instead of hoisting <link> tags into document.head. This avoids the
// React 19 + react-helmet-async + jsdom removeChild race during unmount
// (documented in the SEO integration test) while still letting us assert the
// preconnect <link> is emitted. Head-side behavior is covered by the SEO
// integration test, which uses the real HelmetProvider.
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderFacade = (props: { videoId: string; title: string; embedParams?: string; startSeconds?: number }) =>
  render(<YouTubeFacade {...props} />);

describe('YouTubeFacade', () => {
  const defaultProps = {
    videoId: 'abc123',
    title: 'Test Video',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('initial render (facade state)', () => {
    it('should render a play button, not an iframe', () => {
      renderFacade(defaultProps);
      const playButton = screen.getByRole('button', {
        name: /play test video/i,
      });
      expect(playButton).toBeInTheDocument();
      expect(screen.queryByTitle('Test Video')).not.toBeInTheDocument();
    });

    it('should show thumbnail image with maxresdefault URL', () => {
      renderFacade(defaultProps);
      const img = screen.getByAltText('Test Video');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg');
    });

    it('should set loading="lazy" on thumbnail image', () => {
      renderFacade(defaultProps);
      const img = screen.getByAltText('Test Video');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('should have an accessible aria-label on the play button', () => {
      renderFacade(defaultProps);
      const button = screen.getByRole('button', {
        name: 'Play Test Video',
      });
      expect(button).toBeInTheDocument();
    });

    it('should inject a preconnect to i.ytimg.com (VAL-PERF-008)', () => {
      renderFacade(defaultProps);
      const preconnect = document.querySelector('link[rel="preconnect"][href="https://i.ytimg.com"]');
      expect(preconnect, 'expected a preconnect to https://i.ytimg.com').not.toBeNull();
    });
  });

  describe('thumbnail fallback', () => {
    it('should fall back to hqdefault.jpg on image error', () => {
      renderFacade(defaultProps);
      const img = screen.getByAltText('Test Video');

      // Simulate image load error
      fireEvent.error(img);

      expect(img).toHaveAttribute('src', 'https://i.ytimg.com/vi/abc123/hqdefault.jpg');
    });

    it('should not change src if already using hqdefault', () => {
      renderFacade(defaultProps);
      const img = screen.getByAltText('Test Video');

      // First error: switch to hqdefault
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', 'https://i.ytimg.com/vi/abc123/hqdefault.jpg');

      // Second error: should not change (already hqdefault)
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', 'https://i.ytimg.com/vi/abc123/hqdefault.jpg');
    });
  });

  describe('click to play (iframe state)', () => {
    it('should render an iframe after clicking the play button', async () => {
      const user = userEvent.setup();
      renderFacade(defaultProps);

      const playButton = screen.getByRole('button', {
        name: /play test video/i,
      });
      await user.click(playButton);

      const iframe = screen.getByTitle('Test Video');
      expect(iframe).toBeInTheDocument();
      expect(iframe.tagName).toBe('IFRAME');
    });

    it('should include autoplay=1 in iframe src', async () => {
      const user = userEvent.setup();
      renderFacade(defaultProps);

      await user.click(screen.getByRole('button', { name: /play test video/i }));

      const iframe = screen.getByTitle('Test Video');
      expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/abc123?autoplay=1');
    });

    it('should include embedParams in iframe src when provided', async () => {
      const user = userEvent.setup();
      renderFacade({ ...defaultProps, embedParams: 'rel=0&modestbranding=1' });

      await user.click(screen.getByRole('button', { name: /play test video/i }));

      const iframe = screen.getByTitle('Test Video');
      expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/abc123?rel=0&modestbranding=1&autoplay=1');
    });

    it('should remove the play button after clicking', async () => {
      const user = userEvent.setup();
      renderFacade(defaultProps);

      await user.click(screen.getByRole('button', { name: /play test video/i }));

      expect(screen.queryByRole('button', { name: /play test video/i })).not.toBeInTheDocument();
    });

    it('should set sandbox attribute on iframe', async () => {
      const user = userEvent.setup();
      renderFacade(defaultProps);

      await user.click(screen.getByRole('button', { name: /play test video/i }));

      const iframe = screen.getByTitle('Test Video');
      expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
    });

    it('should set allowFullScreen on iframe', async () => {
      const user = userEvent.setup();
      renderFacade(defaultProps);

      await user.click(screen.getByRole('button', { name: /play test video/i }));

      const iframe = screen.getByTitle('Test Video');
      expect(iframe).toHaveAttribute('allowfullscreen', '');
    });

    it('should keep the i.ytimg.com preconnect after clicking play', async () => {
      const user = userEvent.setup();
      renderFacade(defaultProps);

      await user.click(screen.getByRole('button', { name: /play test video/i }));

      const preconnect = document.querySelector('link[rel="preconnect"][href="https://i.ytimg.com"]');
      expect(preconnect, 'preconnect should persist in the iframe state').not.toBeNull();
    });
  });

  describe('with different videoId', () => {
    it('should use the correct videoId in thumbnail URL', () => {
      renderFacade({ videoId: 'xyz789', title: 'Another Video' });
      const img = screen.getByAltText('Another Video');
      expect(img).toHaveAttribute('src', 'https://i.ytimg.com/vi/xyz789/maxresdefault.jpg');
    });

    it('should use the correct videoId in embed URL after click', async () => {
      const user = userEvent.setup();
      renderFacade({ videoId: 'xyz789', title: 'Another Video' });

      await user.click(screen.getByRole('button', { name: /play another video/i }));

      const iframe = screen.getByTitle('Another Video');
      expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/xyz789?autoplay=1');
    });
  });
});
