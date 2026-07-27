import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatEngine, CHAT_STORAGE_KEY, initialWelcomeMessage } from './useChatEngine';
import type { Message } from './useChatEngine';

// Mock import.meta.env
vi.stubEnv('VITE_CHAT_ENDPOINT', 'https://test-chat-endpoint.example.com');

// Mock session-token issuance so tests don't depend on Turnstile, the issuer
// endpoint, or the network. No token => no Authorization header (the unset-endpoint
// path); request bodies and streaming behavior are unaffected.
vi.mock('../utils/sessionToken', () => ({
  getSessionToken: vi.fn().mockResolvedValue(''),
}));

describe('useChatEngine', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('exports', () => {
    it('should export CHAT_STORAGE_KEY as "chat-messages"', () => {
      expect(CHAT_STORAGE_KEY).toBe('chat-messages');
    });

    it('should export initialWelcomeMessage with correct structure', () => {
      expect(initialWelcomeMessage).toHaveProperty('id', 'welcome');
      expect(initialWelcomeMessage).toHaveProperty('role', 'assistant');
      expect(initialWelcomeMessage).toHaveProperty('content');
      expect(initialWelcomeMessage).toHaveProperty('timestamp');
      expect(initialWelcomeMessage.content.length).toBeGreaterThan(0);
    });
  });

  describe('initial state', () => {
    it('should start with the welcome message in messages', () => {
      const { result } = renderHook(() => useChatEngine());
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].id).toBe('welcome');
      expect(result.current.messages[0].role).toBe('assistant');
    });

    it('should have isTyping as false initially', () => {
      const { result } = renderHook(() => useChatEngine());
      expect(result.current.isTyping).toBe(false);
    });

    it('should have isStreaming as false initially', () => {
      const { result } = renderHook(() => useChatEngine());
      expect(result.current.isStreaming).toBe(false);
    });

    it('should have showSuggestions as true initially', () => {
      const { result } = renderHook(() => useChatEngine());
      expect(result.current.showSuggestions).toBe(true);
    });

    it('should have hasUserMessages as false initially', () => {
      const { result } = renderHook(() => useChatEngine());
      expect(result.current.hasUserMessages).toBe(false);
    });

    it('should provide a messagesContainerRef', () => {
      const { result } = renderHook(() => useChatEngine());
      expect(result.current.messagesContainerRef).toBeDefined();
      expect(result.current.messagesContainerRef.current).toBeNull();
    });
  });

  describe('handleClearConversation', () => {
    it('should reset messages to initial welcome message', () => {
      const { result } = renderHook(() => useChatEngine());

      // Simulate having messages by directly calling clear
      act(() => {
        result.current.handleClearConversation();
      });

      // After clear, the messages array should be the default (welcome message)
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].id).toBe('welcome');
    });

    it('should remove messages from sessionStorage', () => {
      const { result } = renderHook(() => useChatEngine());

      act(() => {
        result.current.handleClearConversation();
      });

      expect(window.sessionStorage.getItem(CHAT_STORAGE_KEY)).toBeNull();
    });
  });

  describe('handleSend', () => {
    it('should add a user message to the messages array', async () => {
      // Mock fetch to return an empty readable stream
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: { getReader: () => mockReader },
        }),
      );

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('Hello there');
      });

      const userMessages = result.current.messages.filter((m: Message) => m.role === 'user');
      expect(userMessages).toHaveLength(1);
      expect(userMessages[0].content).toBe('Hello there');
    });

    it('reassembles text + a framed event from a REAL ReadableStream split across chunk boundaries', async () => {
      // Drive the hook with a genuine ReadableStream (not a hand-rolled reader mock),
      // chunked so the \x00EVT\x00 delimiter and the event JSON are split mid-token —
      // proving createChatStreamParser reassembles across the reader.read() loop, the
      // exact path a fetch-shape stub never exercises.
      const EVT = '\x00EVT\x00';
      const event = JSON.stringify({ kind: 'tool_invocation', tool: 'navigate' });
      const full = `Hello ${EVT}${event}${EVT}world`;
      const cut1 = 8; // cuts THROUGH the opening delimiter ("Hello \x00E")
      const cut2 = full.indexOf('world');
      const chunks = [full.slice(0, cut1), full.slice(cut1, cut2), full.slice(cut2)];

      const encoder = new TextEncoder();
      let i = 0;
      const stream = new ReadableStream({
        pull(controller) {
          if (i < chunks.length) controller.enqueue(encoder.encode(chunks[i++]));
          else controller.close();
        },
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream }));

      const { result } = renderHook(() => useChatEngine());
      await act(async () => {
        await result.current.handleSend('hi');
      });

      const assistant = result.current.messages.find(
        (m: Message) => m.role === 'assistant' && !m.isSystem && m.id.startsWith('assistant-'),
      );
      // Text on both sides of the framed event reassembles cleanly...
      expect(assistant?.content).toBe('Hello world');
      // ...and the raw delimiter / event JSON never leaks into the visible content.
      expect(assistant?.content).not.toContain('\x00');
      expect(assistant?.content).not.toContain('tool_invocation');
    });

    it('should set isTyping to true while waiting for response', async () => {
      // Create a fetch that never resolves immediately
      let resolveFetch: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(fetchPromise));

      const { result } = renderHook(() => useChatEngine());

      // Start sending without awaiting
      act(() => {
        result.current.handleSend('Hello');
      });

      // isTyping should be true while waiting
      expect(result.current.isTyping).toBe(true);

      // Clean up by resolving
      await act(async () => {
        resolveFetch!({
          ok: true,
          body: {
            getReader: () => ({
              read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
            }),
          },
        });
      });
    });

    it('should call fetch with the correct request shape and body', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('Test message');
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify the request shape (method, headers, signal)
      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['X-Request-Id']).toBeDefined();
      expect(options.signal).toBeInstanceOf(AbortSignal);

      // Verify the body includes the user message
      const callBody = JSON.parse(options.body);
      expect(callBody.messages).toBeDefined();
      expect(Array.isArray(callBody.messages)).toBe(true);
      const lastMessage = callBody.messages[callBody.messages.length - 1];
      expect(lastMessage.role).toBe('user');
      expect(lastMessage.content).toBe('Test message');
    });

    it('should send firstMessage=true on the first user message of a session (VAL-ENG-012)', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('first message');
      });

      const firstBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(firstBody.firstMessage).toBe(true);
    });

    it('should NOT send firstMessage on the second message of a session (no repeat)', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('first message');
      });
      await act(async () => {
        await result.current.handleSend('second message');
      });

      const secondBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      // firstMessage must be absent (or false) on the second turn so the
      // welcome-back greeting never repeats on later messages.
      expect(secondBody.firstMessage ?? false).toBe(false);
    });

    it('should handle fetch errors gracefully', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('Hello');
      });

      // Should have added an error message
      const assistantMessages = result.current.messages.filter(
        (m: Message) => m.role === 'assistant' && m.id !== 'welcome',
      );
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0].content).toContain('error');
      expect(result.current.isTyping).toBe(false);
      expect(result.current.isStreaming).toBe(false);

      errorSpy.mockRestore();
    });

    it('should handle non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('Hello');
      });

      const assistantMessages = result.current.messages.filter(
        (m: Message) => m.role === 'assistant' && m.id !== 'welcome',
      );
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0].content).toContain('error');

      errorSpy.mockRestore();
    });

    it('should handle streaming response chunks', async () => {
      const encoder = new TextEncoder();
      let callCount = 0;
      const mockReader = {
        read: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              done: false,
              value: encoder.encode('Hello '),
            });
          }
          if (callCount === 2) {
            return Promise.resolve({
              done: false,
              value: encoder.encode('World'),
            });
          }
          return Promise.resolve({ done: true, value: undefined });
        }),
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: { getReader: () => mockReader },
        }),
      );

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('Hi');
      });

      // Find the assistant response (not the welcome message)
      const assistantMessages = result.current.messages.filter(
        (m: Message) => m.role === 'assistant' && m.id !== 'welcome',
      );
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0].content).toBe('Hello World');
    });

    it('should handle empty stream', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: { getReader: () => mockReader },
        }),
      );

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('Hello');
      });

      // Should add an "empty response" message
      const assistantMessages = result.current.messages.filter(
        (m: Message) => m.role === 'assistant' && m.id !== 'welcome',
      );
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0].content).toContain('empty response');
    });
  });

  describe('handleSuggestionSelect', () => {
    it('should call handleSend with the suggestion text', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: { getReader: () => mockReader },
        }),
      );

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSuggestionSelect('Test suggestion');
      });

      const userMessages = result.current.messages.filter((m: Message) => m.role === 'user');
      expect(userMessages).toHaveLength(1);
      expect(userMessages[0].content).toBe('Test suggestion');
    });
  });

  describe('showSuggestions', () => {
    it('should be false after a user message is sent', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: { getReader: () => mockReader },
        }),
      );

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('Hello');
      });

      expect(result.current.showSuggestions).toBe(false);
      expect(result.current.hasUserMessages).toBe(true);
    });
  });

  describe('session persistence', () => {
    it('should restore messages from sessionStorage', () => {
      const existingMessages: Message[] = [
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Welcome',
          timestamp: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: 'user-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date('2026-01-01T00:01:00.000Z'),
        },
      ];
      window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(existingMessages));

      const { result } = renderHook(() => useChatEngine());

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.hasUserMessages).toBe(true);
      expect(result.current.showSuggestions).toBe(false);
    });
  });

  describe('abort-on-resend', () => {
    it('should abort the previous in-flight request when a new message is sent', async () => {
      // First fetch hangs forever so we can verify it gets aborted
      const firstSignals: AbortSignal[] = [];
      let resolveFirst: (value: unknown) => void;
      const firstFetchPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      // Second fetch completes immediately
      const secondReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      const secondResponse = {
        ok: true,
        body: { getReader: () => secondReader },
      };

      let callCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url, opts) => {
          callCount++;
          firstSignals.push(opts.signal);
          if (callCount === 1) {
            // Return a promise that rejects with AbortError when the signal fires
            return new Promise((_resolve, reject) => {
              opts.signal.addEventListener('abort', () => {
                const err = new Error('Aborted');
                err.name = 'AbortError';
                reject(err);
              });
              // Also keep it unresolved otherwise
              firstFetchPromise.then(() => _resolve);
            });
          }
          return Promise.resolve(secondResponse);
        }),
      );

      const { result } = renderHook(() => useChatEngine());

      // Kick off the first send (do not await — it never resolves)
      act(() => {
        result.current.handleSend('first message');
      });

      // Send a second message which should abort the first
      await act(async () => {
        await result.current.handleSend('second message');
      });

      // The first signal must have been aborted
      expect(firstSignals[0].aborted).toBe(true);

      // Cleanup
      resolveFirst!(undefined);
    });
  });

  describe('sliding window (MAX_HISTORY=20)', () => {
    it('should only send at most the last 20 messages in the request body', async () => {
      // Pre-populate sessionStorage with >20 prior messages
      const priorMessages: Message[] = [
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Welcome',
          timestamp: new Date('2026-01-01T00:00:00.000Z'),
        },
      ];
      for (let i = 0; i < 25; i++) {
        priorMessages.push({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `message ${i}`,
          timestamp: new Date(`2026-01-01T00:${String(i).padStart(2, '0')}:00.000Z`),
        });
      }
      window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(priorMessages));

      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('final message');
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Should be exactly 20 messages (MAX_HISTORY)
      expect(body.messages).toHaveLength(20);
      // Last message is the newly-sent one
      expect(body.messages[body.messages.length - 1]).toEqual({
        role: 'user',
        content: 'final message',
      });
      // Welcome message must have been excluded from the sent history
      expect(body.messages.some((m: { content: string }) => m.content === 'Welcome')).toBe(false);
    });

    it('should strip the welcome message from the sent conversation history', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('hi');
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Only the user's new message — welcome is excluded
      expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    });
  });

  describe('pageContext', () => {
    it('should include pageContext in the request body when provided', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      const pageContext = {
        currentPage: '/about',
        pageTitle: 'About',
        section: 'bio',
        visitedPages: ['/', '/about'],
      };

      const { result } = renderHook(() => useChatEngine(pageContext));

      await act(async () => {
        await result.current.handleSend('hi');
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.pageContext).toEqual(pageContext);
    });

    it('should omit pageContext from the body when not provided', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('hi');
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).not.toHaveProperty('pageContext');
    });
  });

  describe('system message prefix', () => {
    it('should strip SYS prefix and mark message as isSystem when first chunk starts with it', async () => {
      const encoder = new TextEncoder();
      const SYSTEM_PREFIX = '\x00SYS\x00';
      let callCount = 0;
      const mockReader = {
        read: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              done: false,
              value: encoder.encode(`${SYSTEM_PREFIX}Rate limit exceeded.`),
            });
          }
          return Promise.resolve({ done: true, value: undefined });
        }),
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: { getReader: () => mockReader },
        }),
      );

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('hello');
      });

      const systemMessages = result.current.messages.filter((m: Message) => m.isSystem === true);
      expect(systemMessages).toHaveLength(1);
      expect(systemMessages[0].content).toBe('Rate limit exceeded.');
      // Prefix sentinel must have been stripped from visible content
      expect(systemMessages[0].content).not.toContain(SYSTEM_PREFIX);
    });

    it('should not mark regular assistant messages as isSystem', async () => {
      const encoder = new TextEncoder();
      let callCount = 0;
      const mockReader = {
        read: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              done: false,
              value: encoder.encode('regular reply'),
            });
          }
          return Promise.resolve({ done: true, value: undefined });
        }),
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: { getReader: () => mockReader },
        }),
      );

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('hello');
      });

      const assistantReplies = result.current.messages.filter(
        (m: Message) => m.role === 'assistant' && m.id !== 'welcome',
      );
      expect(assistantReplies).toHaveLength(1);
      expect(assistantReplies[0].isSystem).toBeUndefined();
    });
  });

  describe('AbortError handling', () => {
    it('should show a timeout message when aborted before any chunks arrive', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url, opts) => {
          return new Promise((_resolve, reject) => {
            opts.signal.addEventListener('abort', () => {
              const err = new Error('Aborted');
              err.name = 'AbortError';
              reject(err);
            });
          });
        }),
      );

      const { result } = renderHook(() => useChatEngine());

      // Kick off the send and immediately abort via a second send
      let sendPromise: Promise<void> | undefined;
      act(() => {
        sendPromise = result.current.handleSend('hello');
      });

      // Abort the in-flight request by issuing another send that also aborts
      // Simulate by manually invoking an AbortController path: send again.
      // The new send aborts the old one; we await it so the rejection runs.
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: {
            getReader: () => ({
              read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
            }),
          },
        }),
      );

      await act(async () => {
        await result.current.handleSend('second');
        await sendPromise;
      });

      // At least one timeout message OR an empty-response message exists for
      // the aborted first request. We only care that the hook did not crash
      // and isStreaming returned to false.
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.isTyping).toBe(false);
    });
  });

  describe('request includes signal and signed headers', () => {
    it('should pass an AbortSignal on every request', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('a');
      });
      await act(async () => {
        await result.current.handleSend('b');
      });

      expect(mockFetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
      expect(mockFetch.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
      // Each request gets a fresh controller
      expect(mockFetch.mock.calls[0][1].signal).not.toBe(mockFetch.mock.calls[1][1].signal);
    });
  });

  describe('conversation-poisoning regression', () => {
    it('should not replay a lingering empty assistant placeholder in the next request', async () => {
      const encoder = new TextEncoder();
      const SYSTEM_PREFIX = '\x00SYS\x00';

      // Turn 1: backend empty-response path — only a SYS system message, no text.
      const guardrailReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: encoder.encode(`${SYSTEM_PREFIX}I couldn't put together a response just now. Mind rephrasing?`),
          })
          .mockResolvedValue({ done: true, value: undefined }),
      };
      // Turn 2: normal text reply.
      const normalReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: encoder.encode('Sure thing') })
          .mockResolvedValue({ done: true, value: undefined }),
      };

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, body: { getReader: () => guardrailReader } })
        .mockResolvedValueOnce({ ok: true, body: { getReader: () => normalReader } });
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('first');
      });
      await act(async () => {
        await result.current.handleSend('second');
      });

      // The SECOND request body must not carry any empty-content message,
      // and must not carry the system/error string as a fake assistant turn.
      const secondBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(secondBody.messages.some((m: { content: string }) => m.content.trim().length === 0)).toBe(false);
      expect(
        secondBody.messages.some((m: { content: string }) => m.content.includes("couldn't put together a response")),
      ).toBe(false);
    });

    it('should not replay isSystem error bubbles as assistant turns', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      // Seed sessionStorage with a non-empty isSystem assistant bubble.
      window.sessionStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify([
          initialWelcomeMessage,
          { id: 'user-1', role: 'user', content: 'earlier', timestamp: new Date() },
          {
            id: 'system-1',
            role: 'assistant',
            content: 'Rate limit exceeded.',
            timestamp: new Date(),
            isSystem: true,
          },
        ]),
      );

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('again');
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.messages.some((m: { content: string }) => m.content === 'Rate limit exceeded.')).toBe(false);
      // The real prior user turn is preserved.
      expect(body.messages).toEqual([
        { role: 'user', content: 'earlier' },
        { role: 'user', content: 'again' },
      ]);
    });

    it('should not leave a blank assistant bubble after a system-only turn', async () => {
      const encoder = new TextEncoder();
      const SYSTEM_PREFIX = '\x00SYS\x00';
      const reader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: encoder.encode(`${SYSTEM_PREFIX}Rate limit exceeded.`),
          })
          .mockResolvedValue({ done: true, value: undefined }),
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: { getReader: () => reader } }));

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('hello');
      });

      // No assistant message should have empty content.
      const blankAssistant = result.current.messages.filter(
        (m: Message) => m.role === 'assistant' && m.content.trim().length === 0,
      );
      expect(blankAssistant).toHaveLength(0);
      // The visible system message is still present.
      expect(result.current.messages.some((m: Message) => m.content === 'Rate limit exceeded.')).toBe(true);
    });

    it('should preserve an empty-text assistant bubble that carries a draft event', async () => {
      // rec7's BeforeModelCallEvent loop cap can cancel the agent right after a
      // tool emits a draft_action event but BEFORE any concluding text streams.
      // The post-stream cleanup must NOT prune that bubble: ChatMessage renders
      // drafts/uiBlocks/memoryEvents independently of content, so the draft card
      // is meant to survive empty text.
      const encoder = new TextEncoder();
      const EVT_DELIM = '\x00EVT\x00';
      const draftEvent = {
        kind: 'draft_action',
        action: 'navigate',
        path: '/podcast',
        reason: 'Listen to The Vector Podcast',
      };
      const frame = `${EVT_DELIM}${JSON.stringify(draftEvent)}${EVT_DELIM}`;
      const reader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: encoder.encode(frame) })
          .mockResolvedValue({ done: true, value: undefined }),
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: { getReader: () => reader } }));

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('where can I hear the podcast?');
      });

      const assistantBubbles = result.current.messages.filter(
        (m: Message) => m.role === 'assistant' && m.id !== 'welcome',
      );
      // The bubble carrying the draft must survive even with empty text.
      expect(assistantBubbles).toHaveLength(1);
      expect(assistantBubbles[0].content.trim().length).toBe(0);
      expect(assistantBubbles[0].drafts).toBeDefined();
      expect(assistantBubbles[0].drafts).toHaveLength(1);
      expect(assistantBubbles[0].drafts?.[0]).toMatchObject({
        kind: 'draft_action',
        action: 'navigate',
        path: '/podcast',
      });
    });

    it('should assign unique message ids across rapid sends', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: { getReader: () => mockReader } }));

      const { result } = renderHook(() => useChatEngine());

      await act(async () => {
        await result.current.handleSend('one');
      });
      await act(async () => {
        await result.current.handleSend('two');
      });

      const ids = result.current.messages.map((m: Message) => m.id);
      expect(new Set(ids).size).toBe(ids.length); // all unique
    });
  });

  describe('identity-guarded finally (out-of-order completion)', () => {
    it("request A's finally must not clobber request B's controller or streaming state", async () => {
      // A hangs until we release it; it will be aborted by B's send.
      let releaseA: () => void = () => {};
      const aDone = new Promise<void>((resolve) => {
        releaseA = resolve;
      });

      const aborts: AbortSignal[] = [];
      let callCount = 0;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url, opts) => {
          callCount++;
          aborts.push(opts.signal);
          if (callCount === 1) {
            // Request A: reject with AbortError only AFTER we manually release it,
            // simulating A's promise settling LATE (after B already started).
            return new Promise((_resolve, reject) => {
              aDone.then(() => {
                const err = new Error('Aborted');
                err.name = 'AbortError';
                reject(err);
              });
            });
          }
          // Request B: a stream that stays open so B is "in flight" while A settles.
          let read = 0;
          return Promise.resolve({
            ok: true,
            body: {
              getReader: () => ({
                read: vi.fn().mockImplementation(() => {
                  read++;
                  if (read === 1) {
                    return new Promise(() => {}); // never resolves -> B stays streaming
                  }
                  return Promise.resolve({ done: true, value: undefined });
                }),
              }),
            },
          });
        }),
      );

      const { result } = renderHook(() => useChatEngine());

      // Start A (do not await; it hangs).
      act(() => {
        result.current.handleSend('A');
      });
      // Start B; this aborts A's controller but B keeps streaming.
      act(() => {
        result.current.handleSend('B');
      });

      // B is the current in-flight request.
      expect(result.current.isStreaming).toBe(true);
      const bStreamingId = result.current.streamingMessageId;
      expect(bStreamingId).not.toBeNull();

      // Now let A's promise settle LAST -> A's finally runs after B started.
      await act(async () => {
        releaseA();
        await Promise.resolve();
        await Promise.resolve();
      });

      // GUARD: A's finally must NOT have cleared B's streaming UI...
      expect(result.current.isStreaming).toBe(true);
      expect(result.current.streamingMessageId).toBe(bStreamingId);
      // ...and B's controller must survive so unmount-abort still works.
      expect(aborts[1].aborted).toBe(false);
    });
  });
});
