import { describe, it, expect, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CapabilityIntro from './CapabilityIntro';

type UseExample = (query: string) => void;

const renderIntro = (overrides: { onUseExample?: MockedFunction<UseExample>; initiallyExpanded?: boolean } = {}) => {
  // vitest 4 made vi.fn() return Mock<Procedure | Constructable>, which is no
  // longer structurally assignable to a plain `(q: string) => void`. Use the
  // explicit MockedFunction<...> type so callers and the prop slot agree.
  const onUseExample: MockedFunction<UseExample> = overrides.onUseExample ?? vi.fn<UseExample>();
  const utils = render(
    <CapabilityIntro onUseExample={onUseExample} initiallyExpanded={overrides.initiallyExpanded ?? false} />,
  );
  return { ...utils, onUseExample };
};

describe('CapabilityIntro', () => {
  describe('rendering', () => {
    it('renders the toggle button as a region landmark', () => {
      renderIntro();
      const region = screen.getByRole('region', { name: /what alti can do/i });
      expect(region).toBeInTheDocument();
    });

    it('shows the toggle button with the four-word teaser on desktop', () => {
      renderIntro();
      expect(screen.getByText('What Alti can do')).toBeInTheDocument();
      expect(screen.getByText(/search, draft, navigate, remember/i)).toBeInTheDocument();
    });

    it('renders aria-expanded=false by default', () => {
      renderIntro();
      const toggle = screen.getByRole('button', { name: /what alti can do/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('renders aria-expanded=true when initiallyExpanded is set', () => {
      renderIntro({ initiallyExpanded: true });
      const toggle = screen.getByRole('button', { name: /what alti can do/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('capability tiles', () => {
    it('renders all six capability titles when expanded', () => {
      renderIntro({ initiallyExpanded: true });
      expect(screen.getByText('Search the podcast')).toBeInTheDocument();
      expect(screen.getByText('Search the blog')).toBeInTheDocument();
      expect(screen.getByText('Draft outreach for you')).toBeInTheDocument();
      expect(screen.getByText('Show visual answers')).toBeInTheDocument();
      expect(screen.getByText('Navigate the site')).toBeInTheDocument();
      expect(screen.getByText('Remember you next time')).toBeInTheDocument();
    });

    it('renders the example query for each tile as an italic quote', () => {
      renderIntro({ initiallyExpanded: true });
      // Examples render with smart quotes (U+201C/U+201D) via &ldquo;/&rdquo;; match the inner text.
      expect(screen.getByText(/What did guests say about AI in defense\?/)).toBeInTheDocument();
      expect(screen.getByText(/Take me to his book\./)).toBeInTheDocument();
      expect(screen.getByText(/I'm preparing for SFAS\./)).toBeInTheDocument();
    });

    it('teaches the explicit gen-ui command for visual answers', () => {
      renderIntro({ initiallyExpanded: true });
      // The visual-answers card must show HOW to trigger it — the deterministic
      // "gen-ui" command — with an in-domain example that won't trip topic boundaries.
      expect(screen.getByText(/Use gen-ui to compare his military and tech careers\./)).toBeInTheDocument();
    });

    it('renders the agency-reinforcing footer copy', () => {
      renderIntro({ initiallyExpanded: true });
      expect(screen.getByText(/ask alti to forget you anytime/i)).toBeInTheDocument();
    });
  });

  describe('contrast', () => {
    it('keeps every silver instructional run at or above the /80 AA floor', () => {
      // altivum-silver/80 on altivum-dark is about 5.4:1; /70 is 4.3:1 and /50 is
      // 2.8:1, both under the 4.5:1 AA floor these smallText sizes require. This
      // pins the tints that regressed rather than the rendered pixels.
      renderIntro({ initiallyExpanded: true });
      const runs = [
        screen.getByText(/search, draft, navigate, remember/i),
        screen.getByText(/Try asking him to/i),
        screen.getByText('Ask Alti to take you to the right page on thechrisgrey.com.'),
        screen.getByText(/ask alti to forget you anytime/i),
      ];
      for (const run of runs) {
        expect(run.className).not.toMatch(/text-altivum-silver\/(?:[1-7]\d|\d)\b/);
        expect(run.className).toMatch(/text-altivum-silver\/(?:8\d|9\d|100)\b/);
      }
    });
  });

  describe('expand / collapse', () => {
    it('toggles aria-expanded when the toggle is clicked', () => {
      renderIntro();
      const toggle = screen.getByRole('button', { name: /what alti can do/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('marks tile buttons tabIndex=-1 when collapsed', () => {
      renderIntro({ initiallyExpanded: false });
      // When collapsed, the content region has aria-hidden=true so tiles are excluded
      // from the accessible tree — pass { hidden: true } to query them anyway.
      const tile = screen.getByRole('button', {
        name: /drop into message: take me to his book/i,
        hidden: true,
      });
      expect(tile).toHaveAttribute('tabIndex', '-1');
    });

    it('marks tile buttons tabIndex=0 when expanded', () => {
      renderIntro({ initiallyExpanded: true });
      const tile = screen.getByRole('button', {
        name: /drop into message: take me to his book/i,
      });
      expect(tile).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('tile interaction', () => {
    it('calls onUseExample with the tile’s example when clicked', () => {
      const { onUseExample } = renderIntro({ initiallyExpanded: true });
      const tile = screen.getByRole('button', {
        name: /drop into message: what did guests say about ai in defense\?/i,
      });
      fireEvent.click(tile);
      expect(onUseExample).toHaveBeenCalledTimes(1);
      expect(onUseExample).toHaveBeenCalledWith('What did guests say about AI in defense?');
    });

    it('does not auto-send — onUseExample receives the raw example only', () => {
      const onUseExample = vi.fn<UseExample>();
      renderIntro({ initiallyExpanded: true, onUseExample });
      // Tiles have explicit aria-labels of the form `Drop into message: <example>` so
      // screen readers hear the action + payload together; match by the aria-label.
      const podcastTile = screen.getByRole('button', {
        name: /drop into message: what did guests say about ai in defense\?/i,
      });
      const draftTile = screen.getByRole('button', {
        name: /drop into message: i'd like to invite christian on my podcast/i,
      });
      fireEvent.click(podcastTile);
      fireEvent.click(draftTile);
      expect(onUseExample).toHaveBeenNthCalledWith(1, 'What did guests say about AI in defense?');
      expect(onUseExample).toHaveBeenNthCalledWith(2, "I'd like to invite Christian on my podcast.");
    });
  });
});
