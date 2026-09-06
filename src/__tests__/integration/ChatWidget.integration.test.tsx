import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ChatWidget from '../../components/chat/ChatWidget';
import { sessionTokens } from '../../utils/sessionToken';

// Mock AltiMascot since Three.js Canvas doesn't work in jsdom
vi.mock('../../components/chat/AltiMascot', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="alti-mascot" data-is-open={isOpen}>
      {isOpen && <span>close</span>}
    </div>
  ),
}));

// Stub the chat endpoint so handleSend/handleForgetMemory can build request URLs.
// Without this, CHAT_ENDPOINT is undefined and handleForgetMemory's
// `CHAT_ENDPOINT.endsWith('/')` throws before fetch is ever called.
vi.stubEnv('VITE_CHAT_ENDPOINT', 'https://test-chat-endpoint.example.com');

// Mock session-token issuance so tests don't depend on Turnstile, the issuer
// endpoint, or the network. No token => no Authorization header (the unset-endpoint
// path); request bodies and streaming behavior are unaffected.
// The forget path resets the cached session token as well as calling the
// endpoint: the token is signed over a hash of the device id being erased, so
// leaving it cached would keep presenting the wiped identity to the server for
// the rest of its TTL. Mock the whole module surface the hook touches, not just
// getSessionToken - a partial mock throws at the reset() call and the failure
// surfaces as a missing confirmation banner rather than as a mock error.
vi.mock('../../utils/sessionToken', () => ({
  getSessionToken: vi.fn().mockResolvedValue(''),
  sessionTokens: { getToken: vi.fn().mockResolvedValue(''), reset: vi.fn() },
}));

// jsdom in this Vitest config does not expose window.localStorage, so
// getOrCreateDeviceId() would return null and handleForgetMemory would
// short-circuit before issuing the /forget fetch. Provide a stable device id
// so the forget path is exercised end-to-end.
vi.mock('../../utils/deviceId', () => ({
  getOrCreateDeviceId: vi.fn(() => 'test-device-id-1234'),
  clearDeviceId: vi.fn(),
  DEVICE_ID_STORAGE_KEY: 'alti-device-id',
}));

// jsdom does not implement scrollTo on elements; polyfill for these tests
beforeEach(() => {
  Element.prototype.scrollTo = vi.fn();
});

// Note: Unlike the unit test for ChatWidget that mocks child components,
// this integration test renders the FULL widget including ChatWidgetButton and ChatWidgetPanel
// to verify the entire widget interaction flow.

const renderWidget = (route = '/') => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ChatWidget />
    </MemoryRouter>,
  );
};

describe('Chat Widget Integration', () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('Widget button', () => {
    it('renders the widget button', () => {
      renderWidget();

      const button = screen.getByRole('button', { name: /open chat/i });
      expect(button).toBeInTheDocument();
    });

    it('button has correct aria-expanded state when closed', () => {
      renderWidget();

      const button = screen.getByRole('button', { name: /open chat/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Opening and closing the panel', () => {
    it('opens the chat panel when the widget button is clicked', async () => {
      const user = userEvent.setup();
      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog', { name: /alti/i });
        expect(dialog).toBeInTheDocument();
      });
    });

    it('shows the chat interface inside the panel', async () => {
      const user = userEvent.setup();
      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        // Should show the welcome message
        expect(screen.getByText(/I'm Alti/i)).toBeInTheDocument();

        // Should show the input
        expect(screen.getByRole('textbox', { name: /type a message/i })).toBeInTheDocument();

        // Should show page-specific suggestions (Home page for route '/')
        expect(screen.getByText("What's Christian's story?")).toBeInTheDocument();
      });
    });

    it('closes the panel when the close button is clicked', async () => {
      const user = userEvent.setup();
      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Two buttons match "Close chat" (panel close + widget button).
      // Target the one inside the dialog.
      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /close chat/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes the panel when Escape key is pressed', async () => {
      const user = userEvent.setup();
      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Focus something inside the dialog so the keydown event
      // bubbles through the panel's onKeyDown handler
      const input = screen.getByRole('textbox', { name: /type a message/i });
      await user.click(input);
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('toggles widget button aria-expanded when panel opens', async () => {
      const user = userEvent.setup();
      renderWidget();

      const button = screen.getByRole('button', { name: /open chat/i });
      await user.click(button);

      await waitFor(() => {
        // After opening, the widget button label changes to "Close chat" and has aria-expanded="true".
        // Two buttons match "Close chat" (widget button + panel close button).
        // The widget button is the one with aria-expanded attribute.
        const closeButtons = screen.getAllByRole('button', { name: /close chat/i });
        const widgetButton = closeButtons.find((btn) => btn.getAttribute('aria-expanded') !== null);
        expect(widgetButton).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('Panel header controls', () => {
    it('renders the expand button to navigate to full chat', async () => {
      const user = userEvent.setup();
      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open full chat/i })).toBeInTheDocument();
      });
    });

    it('shows clear button after user sends a message', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('Response'));
            controller.close();
          },
        }),
      } as Response);

      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const input = screen.getByRole('textbox', { name: /type a message/i });
      await user.type(input, 'Hello');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear conversation/i })).toBeInTheDocument();
      });
    });

    it('renders a Forget me control distinct from clear/reset (VAL-ENG-013)', async () => {
      const user = userEvent.setup();
      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      // Forget-me is always present (even before any message), distinct from the
      // clear/reset control (which only appears after a user message).
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /forget me/i })).toBeInTheDocument();
      });
      // Clear conversation must NOT be present yet (no user messages sent).
      expect(screen.queryByRole('button', { name: /clear conversation/i })).not.toBeInTheDocument();
    });

    it('fires POST /forget and shows a distinct confirmation when Forget me is activated (VAL-ENG-013)', async () => {
      const user = userEvent.setup();
      // /forget returns JSON { ok: true, deleted: N }
      fetchSpy.mockImplementation(async (url: string | URL | Request) => {
        const u = String(url);
        if (u.includes('/forget') || u.endsWith('forget')) {
          return { ok: true, json: async () => ({ ok: true, deleted: 3 }) } as Response;
        }
        // chat-stream call (shouldn't be reached in this test)
        return {
          ok: true,
          body: new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
        } as Response;
      });

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      const forgetButton = await screen.findByRole('button', { name: /forget me/i });
      await user.click(forgetButton);

      // A POST to the /forget endpoint was issued.
      await waitFor(() => {
        const forgetCall = fetchSpy.mock.calls.find((c) => String(c[0]).includes('forget'));
        expect(forgetCall).toBeDefined();
        expect((forgetCall![1] as RequestInit).method).toBe('POST');
      });

      // A distinct confirmation banner appears in the panel.
      await waitFor(() => {
        expect(screen.getByText(/I've forgotten 3 saved item/i)).toBeInTheDocument();
      });

      // The cached token is signed over a hash of the device id just erased, so
      // a successful forget has to drop it too. Asserting it here keeps the
      // coupling from regressing silently once chat-stream trusts the token's
      // deviceHash over the request body.
      expect(vi.mocked(sessionTokens.reset)).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('does NOT fire /forget when the visitor cancels the confirm dialog', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, deleted: 0 }),
      } as Response);

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      const forgetButton = await screen.findByRole('button', { name: /forget me/i });
      await user.click(forgetButton);

      // No /forget call was issued.
      const forgetCall = fetchSpy.mock.calls.find((c) => String(c[0]).includes('forget'));
      expect(forgetCall).toBeUndefined();
      // No confirmation banner.
      expect(screen.queryByText(/I've forgotten/i)).not.toBeInTheDocument();

      confirmSpy.mockRestore();
    });

    it('renders the "What do you know about me?" memory-inspection chip (VAL-ENG-013)', async () => {
      const user = userEvent.setup();
      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      // The memory-inspection affordance is a distinct chip shown alongside the
      // contextual starter chips when suggestions are visible.
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /what do you know about me\?/i })).toBeInTheDocument();
      });
    });

    it('sends the memory-inspection prompt as a message when the chip is clicked (VAL-ENG-013)', async () => {
      const user = userEvent.setup();
      fetchSpy.mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      } as Response);

      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      const chip = await screen.findByRole('button', { name: /what do you know about me\?/i });
      await user.click(chip);

      // The chip's text is sent to the chat endpoint as the latest user message.
      await waitFor(() => {
        const chatCall = fetchSpy.mock.calls.find(
          (c) => !String(c[0]).includes('forget') && (c[1] as RequestInit).method === 'POST',
        );
        expect(chatCall).toBeDefined();
        const body = JSON.parse((chatCall![1] as RequestInit).body as string);
        const last = body.messages[body.messages.length - 1];
        expect(last.role).toBe('user');
        expect(last.content).toBe('What do you know about me?');
      });
    });
  });

  describe('Accessibility', () => {
    it('panel has proper dialog ARIA attributes', async () => {
      const user = userEvent.setup();
      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-label', "Alti - Altivum's AI Agent");
      });
    });

    it('panel has a chat messages region with aria-live', async () => {
      const user = userEvent.setup();
      renderWidget();

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        const messagesRegion = screen.getByRole('log', {
          name: /chat messages/i,
        });
        expect(messagesRegion).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('launcher exposes a non-empty accessible name and a tooltip describing the action', () => {
      renderWidget();

      const button = screen.getByRole('button', { name: /open chat/i });
      // Accessible name must be non-empty (VAL-ENG-010).
      expect(button.getAttribute('aria-label')).toBeTruthy();
      expect(button.getAttribute('aria-label')!.length).toBeGreaterThan(0);
      // Tooltip element exists and is associated via aria-describedby.
      const tooltipId = button.getAttribute('aria-describedby');
      expect(tooltipId).toBeTruthy();
      const tooltip = document.getElementById(tooltipId!);
      expect(tooltip).not.toBeNull();
      expect(tooltip!.getAttribute('role')).toBe('tooltip');
      expect(tooltip!.textContent).toBeTruthy();
    });

    it('moves focus inside the panel when opened', async () => {
      const user = userEvent.setup();
      renderWidget();

      const button = screen.getByRole('button', { name: /open chat/i });
      await user.click(button);

      // The data-autofocus chat input should receive focus shortly after open.
      await waitFor(() => {
        const input = screen.getByRole('textbox', { name: /type a message/i });
        expect(document.activeElement).toBe(input);
      });
    });

    it('returns focus to the launcher when the panel is closed via Escape', async () => {
      const user = userEvent.setup();
      renderWidget();

      const button = screen.getByRole('button', { name: /open chat/i });
      await user.click(button);

      // Wait for focus to land inside the panel.
      await waitFor(() => {
        const input = screen.getByRole('textbox', { name: /type a message/i });
        expect(document.activeElement).toBe(input);
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Focus should be restored to the launcher (VAL-ENG-010).
      expect(document.activeElement).toBe(button);
    });
  });

  describe('Context-aware suggestions per route (VAL-ENG-011)', () => {
    it('shows About-page suggestions on /about', async () => {
      const user = userEvent.setup();
      renderWidget('/about');

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        // About-specific chip from routes.ts.
        expect(screen.getByText('What was his military career like?')).toBeInTheDocument();
      });
    });

    it('shows AWS-page suggestions on /aws', async () => {
      const user = userEvent.setup();
      renderWidget('/aws');

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        // AWS-specific chip from routes.ts.
        expect(screen.getByText('What does he do as an AWS Community Builder?')).toBeInTheDocument();
      });
    });

    it('shows different suggestion sets on /about vs /aws', async () => {
      // /about
      const { unmount: unmountAbout } = renderWidget('/about');
      await userEvent.setup().click(screen.getByRole('button', { name: /open chat/i }));
      await waitFor(() => {
        expect(screen.getByText('What was his military career like?')).toBeInTheDocument();
      });
      // The AWS-specific chip must NOT appear on /about.
      expect(screen.queryByText('What does he do as an AWS Community Builder?')).not.toBeInTheDocument();
      unmountAbout();

      // /aws
      renderWidget('/aws');
      await userEvent.setup().click(screen.getByRole('button', { name: /open chat/i }));
      await waitFor(() => {
        expect(screen.getByText('What does he do as an AWS Community Builder?')).toBeInTheDocument();
      });
      // The About-specific chip must NOT appear on /aws.
      expect(screen.queryByText('What was his military career like?')).not.toBeInTheDocument();
    });
  });
});
