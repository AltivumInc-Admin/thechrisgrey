import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ChatWidget from '../../components/chat/ChatWidget';

// Mock AltiMascot since Three.js Canvas doesn't work in jsdom
vi.mock('../../components/chat/AltiMascot', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="alti-mascot" data-is-open={isOpen}>
      {isOpen && <span>close</span>}
    </div>
  ),
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
