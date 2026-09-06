import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Hoisted mock holders so the vi.mock factory can close over them safely.
const mocks = vi.hoisted(() => ({
  handleSend: vi.fn(),
  state: {
    messages: [] as Array<Record<string, unknown>>,
    isTyping: false,
    isStreaming: false,
    streamingMessageId: null as string | null,
  },
}));

vi.mock('../../hooks', () => ({
  useChatEngine: () => ({ ...mocks.state, handleSend: mocks.handleSend }),
  usePageContext: () => ({
    currentPage: '/podcast',
    pageTitle: 'The Vector Podcast',
    section: 'The Vector Podcast',
    visitedPages: ['/podcast'],
  }),
}));

import AskTheVector from './AskTheVector';

const CITATION = {
  kind: 'draft_action',
  action: 'podcast_citation',
  videoId: 'ndX9SkIY7Mc',
  startSeconds: 725,
  episodeTitle: 'Brittinie Wick on Women Veterans',
  quote: 'Women veterans are too often invisible after service.',
  timestampLabel: '12:05',
  url: 'https://www.youtube.com/watch?v=ndX9SkIY7Mc&t=725s',
};

function setup() {
  return render(
    <MemoryRouter>
      <AskTheVector />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.handleSend.mockClear();
  mocks.state.messages = [];
  mocks.state.isTyping = false;
  mocks.state.isStreaming = false;
  mocks.state.streamingMessageId = null;
});

describe('AskTheVector', () => {
  it('renders the heading and example prompts before any question', () => {
    setup();
    expect(screen.getByText('Ask The Vector')).toBeInTheDocument();
    expect(screen.getByText(/Try asking/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /What do guests say about leaving the military\?/i }),
    ).toBeInTheDocument();
  });

  it('sends an example prompt when clicked', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Which episodes talk about AI in defense\?/i }));
    expect(mocks.handleSend).toHaveBeenCalledWith('Which episodes talk about AI in defense?');
  });

  it('submits a typed question and clears the input', () => {
    setup();
    const input = screen.getByPlaceholderText(/Ask about a topic/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'veteran mental health' } });
    fireEvent.submit(input.closest('form')!);
    expect(mocks.handleSend).toHaveBeenCalledWith('veteran mental health');
    expect(input.value).toBe('');
  });

  it('does not send an empty or whitespace-only question', () => {
    setup();
    const input = screen.getByPlaceholderText(/Ask about a topic/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);
    expect(mocks.handleSend).not.toHaveBeenCalled();
  });

  it('renders the latest answer and its podcast citation card', () => {
    mocks.state.messages = [
      { id: 'u1', role: 'user', content: 'What about women veterans?', timestamp: new Date() },
      {
        id: 'a1',
        role: 'assistant',
        content: 'Brittinie Wick talked about how women veterans are often overlooked.',
        timestamp: new Date(),
        drafts: [CITATION],
      },
    ];
    setup();
    expect(screen.getByText(/Brittinie Wick talked about/)).toBeInTheDocument();
    expect(screen.getByText(/From The Vector Podcast/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play at 12:05/i })).toBeInTheDocument();
    // Example prompts are hidden once a conversation exists.
    expect(screen.queryByText(/Try asking/i)).not.toBeInTheDocument();
  });

  it('surfaces a system message (e.g. rate limit) gracefully', () => {
    mocks.state.messages = [
      { id: 'u1', role: 'user', content: 'too many', timestamp: new Date() },
      {
        id: 's1',
        role: 'assistant',
        content: "You've reached the message limit. Please try again in about an hour.",
        timestamp: new Date(),
        isSystem: true,
      },
    ];
    setup();
    expect(screen.getByText(/reached the message limit/i)).toBeInTheDocument();
  });

  it('drops the previous answer and its citation card while a follow-up is in flight', () => {
    // The engine appends the user message immediately but only creates the assistant
    // bubble on the first streamed chunk, so this is the real state during a search.
    mocks.state.messages = [
      { id: 'u1', role: 'user', content: 'What about women veterans?', timestamp: new Date() },
      {
        id: 'a1',
        role: 'assistant',
        content: 'Brittinie Wick talked about how women veterans are often overlooked.',
        timestamp: new Date(),
        drafts: [CITATION],
      },
      { id: 'u2', role: 'user', content: 'What about transition programs?', timestamp: new Date() },
    ];
    mocks.state.isTyping = true;
    setup();

    expect(screen.getByText('What about transition programs?')).toBeInTheDocument();
    expect(screen.queryByText(/Brittinie Wick talked about/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Play at 12:05/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Searching the episodes/i)).toBeInTheDocument();
  });

  it('does not pin a system notice from an earlier turn under a later answer', () => {
    mocks.state.messages = [
      { id: 'u1', role: 'user', content: 'too many', timestamp: new Date() },
      {
        id: 's1',
        role: 'assistant',
        content: "You've reached the message limit. Please try again in about an hour.",
        timestamp: new Date(),
        isSystem: true,
      },
      { id: 'u2', role: 'user', content: 'What about transition programs?', timestamp: new Date() },
      {
        id: 'a2',
        role: 'assistant',
        content: 'Several guests describe the transition as the hardest part.',
        timestamp: new Date(),
      },
    ];
    setup();

    expect(screen.getByText(/Several guests describe the transition/)).toBeInTheDocument();
    expect(screen.queryByText(/reached the message limit/i)).not.toBeInTheDocument();
  });

  it('stays focusable and refuses a second send while a search is in flight', () => {
    mocks.state.messages = [{ id: 'u1', role: 'user', content: 'What about women veterans?', timestamp: new Date() }];
    mocks.state.isTyping = true;
    setup();

    const input = screen.getByPlaceholderText(/Ask about a topic/i) as HTMLInputElement;
    // readOnly rather than disabled, so focus is never yanked to <body> mid-search.
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveAttribute('aria-disabled', 'true');
    expect(input).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Search the podcast/i })).toBeDisabled();

    fireEvent.change(input, { target: { value: 'another question' } });
    fireEvent.submit(input.closest('form')!);
    expect(mocks.handleSend).not.toHaveBeenCalled();
  });

  it('returns focus to the input when an example prompt is used', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /What is discussed about veteran mental health\?/i }));
    expect(document.activeElement).toBe(screen.getByPlaceholderText(/Ask about a topic/i));
  });

  it('keeps the answer live region mounted before the first question', () => {
    const { container } = setup();
    const region = container.querySelector('[aria-live]');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-busy', 'false');
  });

  it('silences the live region while the answer is streaming', () => {
    mocks.state.messages = [
      { id: 'u1', role: 'user', content: 'What about women veterans?', timestamp: new Date() },
      { id: 'a1', role: 'assistant', content: 'Brittinie Wick talked', timestamp: new Date() },
    ];
    mocks.state.isStreaming = true;
    mocks.state.streamingMessageId = 'a1';
    const { container } = setup();

    const region = container.querySelector('[aria-live]');
    expect(region).toHaveAttribute('aria-live', 'off');
    expect(region).toHaveAttribute('aria-busy', 'true');
  });

  it('caps the question at the length the chat Lambda accepts', () => {
    setup();
    expect(screen.getByPlaceholderText(/Ask about a topic/i)).toHaveAttribute('maxlength', '4000');
  });

  it('discloses a visitor-memory write on this surface', () => {
    mocks.state.messages = [
      { id: 'u1', role: 'user', content: 'I am an Army veteran', timestamp: new Date() },
      {
        id: 'a1',
        role: 'assistant',
        content: 'Plenty of episodes cover that.',
        timestamp: new Date(),
        memoryEvents: [{ action: 'remembered', content: 'visitor is an Army veteran' }],
      },
    ];
    setup();
    expect(screen.getByText(/Saved that for next time/i)).toBeInTheDocument();
  });
});
