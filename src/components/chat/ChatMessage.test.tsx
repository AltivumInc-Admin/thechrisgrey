import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChatMessage from './ChatMessage';
import type { UiBlock } from '../../utils/uiBlocks';

// Icons render as inline SVG via <Icon>, which exposes the glyph name on a
// `data-material-icon` attribute (no text node). This helper queries by that
// attribute so tests can assert which icon is shown.
const iconByName = (name: string): Element | null => document.querySelector(`[data-material-icon="${name}"]`);

describe('ChatMessage', () => {
  describe('user messages', () => {
    it('should render user message content', () => {
      render(<ChatMessage role="user" content="Hello there" />);
      expect(screen.getByText('Hello there')).toBeInTheDocument();
    });

    it('should render with right-aligned container (justify-end)', () => {
      const { container } = render(<ChatMessage role="user" content="User message" />);
      const outerDiv = container.firstElementChild;
      expect(outerDiv?.className).toContain('justify-end');
    });

    it('should render with white text class', () => {
      render(<ChatMessage role="user" content="User text" />);
      const textElement = screen.getByText('User text');
      expect(textElement.className).toContain('text-white');
    });

    it('should render with white border for user messages', () => {
      const { container } = render(<ChatMessage role="user" content="User message" />);
      const messageDiv = container.querySelector('[class*="border-white"]');
      expect(messageDiv).not.toBeNull();
    });

    it('should NOT auto-link keywords in user messages', () => {
      render(<ChatMessage role="user" content="I want to learn about Altivum" />);
      const links = screen.queryAllByRole('link');
      expect(links).toHaveLength(0);
      expect(screen.getByText('I want to learn about Altivum')).toBeInTheDocument();
    });
  });

  describe('assistant messages', () => {
    it('should render assistant message content', () => {
      render(<ChatMessage role="assistant" content="Hi, I can help!" />);
      expect(screen.getByText('Hi, I can help!')).toBeInTheDocument();
    });

    it('should render with left-aligned container (justify-start)', () => {
      const { container } = render(<ChatMessage role="assistant" content="Assistant message" />);
      const outerDiv = container.firstElementChild;
      expect(outerDiv?.className).toContain('justify-start');
    });

    it('should render with gold text class', () => {
      render(<ChatMessage role="assistant" content="Assistant text" />);
      const textElement = screen.getByText('Assistant text');
      expect(textElement.className).toContain('text-altivum-gold');
    });

    it('should render with gold border for assistant messages', () => {
      const { container } = render(<ChatMessage role="assistant" content="Assistant message" />);
      const messageDiv = container.querySelector('[class*="border-altivum-gold"]');
      expect(messageDiv).not.toBeNull();
    });
  });

  describe('auto-linking in assistant messages', () => {
    it('should auto-link "Altivum" keyword', () => {
      render(<ChatMessage role="assistant" content="Learn more about Altivum today." />);
      const link = screen.getByRole('link', { name: 'Altivum' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://altivum.ai');
    });

    it('should auto-link "Altivum Inc" before "Altivum"', () => {
      render(<ChatMessage role="assistant" content="He founded Altivum Inc in 2024." />);
      const link = screen.getByRole('link', { name: 'Altivum Inc' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://altivum.ai');
    });

    it('should auto-link "Beyond the Assessment"', () => {
      render(<ChatMessage role="assistant" content="His book Beyond the Assessment is available now." />);
      const link = screen.getByRole('link', { name: 'Beyond the Assessment' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://altivum.ai/bta');
    });

    it('should auto-link "The Vector Podcast"', () => {
      render(<ChatMessage role="assistant" content="Check out The Vector Podcast for more." />);
      const link = screen.getByRole('link', {
        name: 'The Vector Podcast',
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://www.youtube.com/@thevectorpodcast');
    });

    it('should auto-link "VetROI"', () => {
      render(<ChatMessage role="assistant" content="The VetROI platform helps veterans." />);
      const link = screen.getByRole('link', { name: 'VetROI' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://vetroi.altivum.ai');
    });

    it('should auto-link multiple keywords in one message', () => {
      render(<ChatMessage role="assistant" content="He founded Altivum and hosts The Vector Podcast." />);
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(2);
    });

    it('should open links in a new tab', () => {
      render(<ChatMessage role="assistant" content="Visit Altivum for details." />);
      const link = screen.getByRole('link', { name: 'Altivum' });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not create links when no keywords are present', () => {
      render(<ChatMessage role="assistant" content="This is a generic response without any special keywords." />);
      const links = screen.queryAllByRole('link');
      expect(links).toHaveLength(0);
    });
  });

  describe('word-boundary linking', () => {
    it('does NOT link "Elo" inside the word "developed"', () => {
      render(<ChatMessage role="assistant" content="Christian developed several products." />);
      expect(screen.queryAllByRole('link')).toHaveLength(0);
      expect(screen.getByText('Christian developed several products.')).toBeInTheDocument();
    });

    it('does NOT link "elo" inside the word "below"', () => {
      render(<ChatMessage role="assistant" content="See the links below for more." />);
      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });

    it('still links a standalone "Elo" to elo.altivum.ai', () => {
      render(<ChatMessage role="assistant" content="Try Elo for AI-assisted learning." />);
      const link = screen.getByRole('link', { name: 'Elo' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://elo.altivum.ai');
    });

    it('is case-sensitive for "Elo" — lowercase "elo." standalone does not link', () => {
      render(<ChatMessage role="assistant" content="The word elo. should not be a link." />);
      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });
  });

  describe('copy to clipboard', () => {
    beforeEach(() => {
      // jsdom does not implement navigator.clipboard; install a spy.
      // (userEvent.setup() would install its own stub, so these tests use fireEvent.)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
        writable: true,
      });
    });

    afterEach(() => {
      // Some tests install fake timers; always restore so they don't leak.
      vi.useRealTimers();
      Reflect.deleteProperty(navigator, 'clipboard');
    });

    it('shows a copy button on a completed assistant message', () => {
      render(<ChatMessage role="assistant" content="Here is my answer." />);
      expect(screen.getByRole('button', { name: /copy message/i })).toBeInTheDocument();
    });

    it('reveals the copy button on hover/focus (hidden at rest) but keeps it in the a11y tree', () => {
      render(<ChatMessage role="assistant" content="Hover to reveal me." />);
      const btn = screen.getByRole('button', { name: /copy message/i });
      // Still present for keyboard + assistive tech regardless of hover — opacity
      // hides it visually without removing it from the accessibility tree or layout.
      expect(btn).toBeInTheDocument();
      // Hidden at rest; revealed on group hover, keyboard focus-within, and on
      // touch (no-hover) devices where hover can never fire.
      expect(btn.className).toContain('opacity-0');
      expect(btn.className).toContain('group-hover:opacity-100');
      expect(btn.className).toContain('group-focus-within:opacity-100');
      expect(btn.className).toContain('[@media(hover:none)]:opacity-100');
    });

    it('copies the raw message text (not the link-processed markup) to the clipboard', () => {
      render(
        <MemoryRouter>
          <ChatMessage role="assistant" content="Learn about Altivum here." />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole('button', { name: /copy message/i }));
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Learn about Altivum here.');
    });

    it('reflects a copied state (icon + polite live-region announcement) after a successful copy', async () => {
      render(<ChatMessage role="assistant" content="Copied content." />);
      // The button's accessible name stays static — feedback comes from the icon
      // swap (visual) and the aria-live status region (screen readers).
      fireEvent.click(screen.getByRole('button', { name: /copy message/i }));
      await waitFor(() => expect(iconByName('check')).toBeInTheDocument());
      expect(screen.getByText('Message copied to clipboard')).toBeInTheDocument();
      // While showing the result, the button stays visible even without hover.
      expect(screen.getByRole('button', { name: /copy message/i }).className).toContain('opacity-100');
    });

    it('reverts to the idle copy affordance after the 1800ms window', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      render(<ChatMessage role="assistant" content="Copied content." />);
      fireEvent.click(screen.getByRole('button', { name: /copy message/i }));
      await waitFor(() => expect(iconByName('check')).toBeInTheDocument());

      act(() => {
        vi.advanceTimersByTime(1800);
      });

      await waitFor(() => expect(iconByName('content_copy')).toBeInTheDocument());
      expect(iconByName('check')).not.toBeInTheDocument();
      // Live region cleared so it won't re-announce stale status.
      expect(screen.queryByText('Message copied to clipboard')).not.toBeInTheDocument();
    });

    it('does NOT show a copy button on user messages', () => {
      render(<ChatMessage role="user" content="My question" />);
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
    });

    it('does NOT show a copy button while the assistant message is streaming', () => {
      render(<ChatMessage role="assistant" content="Partial answer" isStreaming />);
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
    });

    it('does NOT show a copy button on an empty (tool-only) assistant message', () => {
      render(<ChatMessage role="assistant" content="" toolActivity={[{ tool: 'navigate_to', status: 'complete' }]} />);
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
    });

    it('does NOT show a copy button when content is only whitespace', () => {
      // The gate uses content.trim().length > 0 — a visually-empty bubble must
      // not get a copy affordance. (Spaces and newline-only both count as empty.)
      const { rerender } = render(<ChatMessage role="assistant" content="   " />);
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
      rerender(<ChatMessage role="assistant" content={'\n\n'} />);
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
    });

    it('does NOT show a copy button on system messages', () => {
      render(<ChatMessage role="assistant" content="A system notice." isSystem />);
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
    });

    it('surfaces a failure state (icon + announcement) when the clipboard write rejects', async () => {
      (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('denied'));
      render(<ChatMessage role="assistant" content="Will fail to copy." />);
      fireEvent.click(screen.getByRole('button', { name: /copy message/i }));
      await waitFor(() => expect(iconByName('error_outline')).toBeInTheDocument());
      expect(screen.getByText('Copy failed')).toBeInTheDocument();
    });

    it('reverts to the idle affordance after a failed copy too', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('denied'));
      render(<ChatMessage role="assistant" content="Will fail to copy." />);
      fireEvent.click(screen.getByRole('button', { name: /copy message/i }));
      await waitFor(() => expect(iconByName('error_outline')).toBeInTheDocument());

      act(() => {
        vi.advanceTimersByTime(1800);
      });

      await waitFor(() => expect(iconByName('content_copy')).toBeInTheDocument());
      expect(iconByName('error_outline')).not.toBeInTheDocument();
    });
  });

  describe('generative UI surface gating', () => {
    const statBlock: UiBlock = {
      type: 'stat_row',
      stats: [
        { value: '9', label: 'Episodes' },
        { value: '2025', label: 'Launched' },
      ],
    };

    it('renders generative blocks on the dedicated page surface', () => {
      render(
        <MemoryRouter>
          <ChatMessage role="assistant" content="Here are the numbers." uiBlocks={[statBlock]} surface="page" />
        </MemoryRouter>,
      );
      expect(screen.getByText('Episodes')).toBeInTheDocument();
    });

    it('does NOT render generative blocks in the widget surface', () => {
      render(
        <MemoryRouter>
          <ChatMessage role="assistant" content="Here are the numbers." uiBlocks={[statBlock]} surface="widget" />
        </MemoryRouter>,
      );
      expect(screen.queryByText('Episodes')).not.toBeInTheDocument();
    });

    it('defaults to the widget surface (no blocks) when surface is unset', () => {
      render(
        <MemoryRouter>
          <ChatMessage role="assistant" content="Here are the numbers." uiBlocks={[statBlock]} />
        </MemoryRouter>,
      );
      expect(screen.queryByText('Episodes')).not.toBeInTheDocument();
    });
  });
});
