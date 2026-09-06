import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Chat from '../../pages/Chat';

// Stub session-token issuance so the chat send path doesn't invoke the real
// Turnstile/issuer flow in jsdom. Without this, setting VITE_SESSION_ENDPOINT
// in the environment (as the Amplify build does) makes getSessionToken try to
// load the Cloudflare script and time out — green only when the var is unset.
// The forget path calls sessionTokens.reset() as well (the cached token is
// signed over a hash of the device id being erased), so the factory has to cover
// the whole surface useChatEngine imports - a partial mock throws the moment a
// test exercises /chat's Forget me control.
vi.mock('../../utils/sessionToken', () => ({
  getSessionToken: vi.fn().mockResolvedValue(''),
  sessionTokens: { getToken: vi.fn().mockResolvedValue(''), reset: vi.fn() },
}));

// jsdom does not implement scrollTo on elements; polyfill for these tests
beforeEach(() => {
  Element.prototype.scrollTo = vi.fn();
});

// Helper to create a ReadableStream from text chunks
function createMockStream(chunks: string[]) {
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(new TextEncoder().encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

const renderChat = () => {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/chat']}>
        <Chat />
      </MemoryRouter>
    </HelmetProvider>,
  );
};

describe('Chat Page Integration', () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('Initial rendering', () => {
    it('renders the welcome message from the AI assistant', () => {
      renderChat();

      expect(screen.getByText(/I'm Alti/i)).toBeInTheDocument();
    });

    it('opts the scrollable messages container out of Lenis so the conversation can scroll', () => {
      // The page wrapper is h-screen/overflow-hidden, so the conversation lives in
      // an inner overflow-y-auto container. Site-wide Lenis (smoothWheel) hijacks the
      // wheel unless the container carries data-lenis-prevent — without it the user
      // can't scroll the chat at all (matches the widget panel, which has it).
      renderChat();
      const log = screen.getByRole('log', { name: /chat messages/i });
      const scroller = log.closest('.overflow-y-auto');
      expect(scroller).not.toBeNull();
      expect(scroller).toHaveAttribute('data-lenis-prevent');
    });

    it('renders the page header with title and subtitle', () => {
      renderChat();

      expect(screen.getByRole('heading', { level: 1, name: /alti/i })).toBeInTheDocument();
      expect(screen.getByText(/Ask me anything about Christian/i)).toBeInTheDocument();
    });

    it('renders the chat input area', () => {
      renderChat();

      expect(screen.getByRole('textbox', { name: /type a message/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

    it('shows context-specific suggested prompts (not generic defaults) when no user messages exist', () => {
      renderChat();

      // /chat starter chips are context-specific tool-powered prompts declared
      // on the /chat route in routes.ts (VAL-ENG-011), NOT the generic
      // DEFAULT_SUGGESTIONS used as a fallback elsewhere.
      expect(screen.getByText("Compare Christian's military and tech careers")).toBeInTheDocument();
      expect(screen.getByText('Search the blog for posts on AI strategy')).toBeInTheDocument();

      // Generic defaults must NOT appear on /chat — that would mean the page
      // fell back to DEFAULT_SUGGESTIONS instead of the /chat route entry.
      expect(screen.queryByText('How did he go from Green Beret to tech CEO?')).not.toBeInTheDocument();
      expect(screen.queryByText("What drives Altivum's mission?")).not.toBeInTheDocument();
    });

    it('does not show the clear button when no user messages exist', () => {
      renderChat();

      expect(screen.queryByRole('button', { name: /clear conversation/i })).not.toBeInTheDocument();
    });
  });

  describe('Sending messages', () => {
    it('adds user message to the chat when pressing Enter', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: true,
        body: createMockStream(['Hello', ' from', ' AI']),
      } as Response);
      renderChat();

      const input = screen.getByRole('textbox', { name: /type a message/i });
      await user.type(input, 'Hello there');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Hello there')).toBeInTheDocument();
      });
    });

    it('sends the message to the chat endpoint via fetch', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: true,
        body: createMockStream(['Response text']),
      } as Response);
      renderChat();

      const input = screen.getByRole('textbox', { name: /type a message/i });
      await user.type(input, 'What is Altivum?');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options?.body as string);
      expect(body.messages).toBeDefined();
      expect(body.messages.length).toBeGreaterThanOrEqual(1);
      expect(body.messages[body.messages.length - 1].content).toBe('What is Altivum?');
    });

    it('clears the input field after sending a message', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: true,
        body: createMockStream(['Response']),
      } as Response);
      renderChat();

      const input = screen.getByRole('textbox', { name: /type a message/i });
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('displays streamed assistant response', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: true,
        body: createMockStream(['This is ', 'a streamed ', 'response.']),
      } as Response);
      renderChat();

      const input = screen.getByRole('textbox', { name: /type a message/i });
      await user.type(input, 'Tell me about Altivum');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/This is a streamed response/i)).toBeInTheDocument();
      });
    });

    it('does not send empty messages', async () => {
      const user = userEvent.setup();
      renderChat();

      const input = screen.getByRole('textbox', { name: /type a message/i });
      await user.click(input);
      await user.keyboard('{Enter}');

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Suggestion prompts', () => {
    it('sends a suggestion as a message when clicked', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: true,
        body: createMockStream(['Great question!']),
      } as Response);
      renderChat();

      // Use a context-specific /chat suggestion (declared on the /chat route).
      await user.click(screen.getByText("Compare Christian's military and tech careers"));

      await waitFor(() => {
        expect(screen.getByText("Compare Christian's military and tech careers")).toBeInTheDocument();
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('hides suggestions after a user message is sent', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: true,
        body: createMockStream(['Response']),
      } as Response);
      renderChat();

      // Suggestions should be visible initially (context-specific /chat chips).
      expect(screen.getByText('Search the blog for posts on AI strategy')).toBeInTheDocument();

      await user.click(screen.getByText("Compare Christian's military and tech careers"));

      await waitFor(() => {
        // The suggestion text now appears as a user message; the suggestions
        // section is gone. Verify the other suggestion chips are no longer
        // rendered as buttons.
        const searchButton = screen.queryByRole('button', {
          name: /Search the blog for posts on AI strategy/i,
        });
        expect(searchButton).not.toBeInTheDocument();
      });
    });
  });

  describe('Clear conversation', () => {
    it('shows clear button after a user message is sent', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: true,
        body: createMockStream(['Response']),
      } as Response);
      renderChat();

      const input = screen.getByRole('textbox', { name: /type a message/i });
      await user.type(input, 'Hello');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear conversation/i })).toBeInTheDocument();
      });
    });

    it('resets conversation to welcome message when clear is clicked', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: true,
        body: createMockStream(['Response from AI']),
      } as Response);
      renderChat();

      const input = screen.getByRole('textbox', { name: /type a message/i });
      await user.type(input, 'Hello');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Response from AI/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /clear conversation/i }));

      await waitFor(() => {
        // Welcome message should reappear
        expect(screen.getByText(/I'm Alti/i)).toBeInTheDocument();
        // User message should be gone
        expect(screen.queryByText('Hello')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('shows error message when fetch fails', async () => {
      const user = userEvent.setup();
      fetchSpy.mockRejectedValue(new Error('Network error'));
      renderChat();

      const input = screen.getByRole('textbox', { name: /type a message/i });
      await user.type(input, 'Hello');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/I encountered an error/i)).toBeInTheDocument();
      });
    });

    it('shows error message when API returns non-ok response', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        body: null,
      } as Response);
      renderChat();

      const input = screen.getByRole('textbox', { name: /type a message/i });
      await user.type(input, 'Hello');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/I encountered an error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Session persistence', () => {
    it('persists messages to sessionStorage', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: true,
        body: createMockStream(['AI response']),
      } as Response);
      renderChat();

      const input = screen.getByRole('textbox', { name: /type a message/i });
      await user.type(input, 'Test persistence');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Test persistence')).toBeInTheDocument();
      });

      await waitFor(() => {
        const stored = sessionStorage.getItem('chat-messages');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.some((m: { content: string }) => m.content === 'Test persistence')).toBe(true);
      });
    });

    it('restores messages from sessionStorage on mount', () => {
      const storedMessages = [
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hey there! I'm Alti.",
          timestamp: new Date().toISOString(),
        },
        {
          id: 'user-1',
          role: 'user',
          content: 'Previous message',
          timestamp: new Date().toISOString(),
        },
      ];
      sessionStorage.setItem('chat-messages', JSON.stringify(storedMessages));

      renderChat();

      expect(screen.getByText('Previous message')).toBeInTheDocument();
    });
  });

  describe('SEO metadata', () => {
    it('sets the page title correctly', async () => {
      renderChat();

      await vi.waitFor(() => {
        expect(document.title).toBe("Alti - Altivum's AI Agent | Christian Perez");
      });
    });
  });

  describe('Accessibility', () => {
    it('has a chat messages region with aria-live for screen readers', () => {
      renderChat();

      const messagesRegion = screen.getByRole('log', {
        name: /chat messages/i,
      });
      expect(messagesRegion).toHaveAttribute('aria-live', 'polite');
    });
  });
});
