import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GenerativeBlocks from './GenerativeBlocks';
import { getBreadcrumbs } from '../../utils/rum';
import type { UiBlock } from '../../utils/uiBlocks';

function renderBlocks(blocks: UiBlock[]) {
  return render(
    <MemoryRouter>
      <GenerativeBlocks blocks={blocks} />
    </MemoryRouter>,
  );
}

describe('GenerativeBlocks', () => {
  it('renders nothing for an empty list', () => {
    const { container } = renderBlocks([]);
    expect(container.firstChild).toBeNull();
  });

  it('renders a timeline block', () => {
    renderBlocks([
      {
        type: 'timeline',
        title: 'Career',
        items: [
          { year: '2008', heading: 'Enlisted', detail: 'Joined the Army.' },
          { year: '2014', heading: '18D', detail: 'Special Forces medic.' },
        ],
      },
    ]);
    expect(screen.getByText('Career')).toBeInTheDocument();
    expect(screen.getByText('Enlisted')).toBeInTheDocument();
    expect(screen.getByText('18D')).toBeInTheDocument();
  });

  it('renders a comparison block with both columns', () => {
    renderBlocks([
      {
        type: 'comparison',
        title: 'Two hats',
        left: { heading: 'AWS work', points: ['Community Builder'] },
        right: { heading: 'Claude work', points: ['Applied AI engineer'] },
      },
    ]);
    expect(screen.getByText('AWS work')).toBeInTheDocument();
    expect(screen.getByText('Claude work')).toBeInTheDocument();
    expect(screen.getByText('Community Builder')).toBeInTheDocument();
  });

  it('renders a stat_row block', () => {
    renderBlocks([
      {
        type: 'stat_row',
        stats: [
          { value: '9', label: 'Episodes' },
          { value: '2025', label: 'Launched' },
        ],
      },
    ]);
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('Episodes')).toBeInTheDocument();
  });

  it('renders a link_grid with internal links and filters external ones', () => {
    renderBlocks([
      {
        type: 'link_grid',
        links: [
          { label: 'Podcast', path: '/podcast', blurb: 'The Vector Podcast' },
          // Both shapes are filtered by the isInternalPath guard. The
          // protocol-relative one is the case worth pinning: it LOOKS like a
          // path, and ViewTransitionLink returns early on cmd/ctrl-click, so
          // the browser would resolve //evil.example cross-origin.
          { label: 'Evil', path: 'https://evil.example', blurb: 'nope' },
          { label: 'Protocol relative', path: '//evil.example', blurb: 'also nope' },
        ],
      },
    ]);
    const podcastLink = screen.getByRole('link', { name: /Podcast/i });
    expect(podcastLink).toHaveAttribute('href', '/podcast');
    expect(screen.queryByText('Evil')).not.toBeInTheDocument();
    expect(screen.queryByText('Protocol relative')).not.toBeInTheDocument();
  });

  it('renders a profile_mini with an internal CTA', () => {
    renderBlocks([
      {
        type: 'profile_mini',
        name: 'Christian Perez',
        role: 'Founder & CEO',
        blurb: 'Former Green Beret.',
        ctaPath: '/about',
      },
    ]);
    expect(screen.getByText('Christian Perez')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Learn more/i })).toHaveAttribute('href', '/about');
  });

  it('renders an explainer block with paragraphs and bullets', () => {
    renderBlocks([
      {
        type: 'explainer',
        title: 'What is Alti',
        paragraphs: ['Alti is the site agent.'],
        bullets: ['RAG', 'Tool use'],
      },
    ]);
    expect(screen.getByText('What is Alti')).toBeInTheDocument();
    expect(screen.getByText('Alti is the site agent.')).toBeInTheDocument();
    expect(screen.getByText('RAG')).toBeInTheDocument();
  });

  it('ignores an unknown block type without crashing', () => {
    const { container } = renderBlocks([{ type: 'iframe', src: 'x' } as unknown as UiBlock]);
    // The wrapper renders but the unknown block produces no child content.
    expect(container.textContent).toBe('');
  });

  it('reports an unknown block type to RUM instead of dropping it silently', () => {
    // A vocabulary drift renders nothing, so it never reaches ErrorBoundary's
    // reporting and the Lambda has already counted GenUiRendered as a success.
    // recordEvent is the only signal that a visitor paid for an empty answer.
    renderBlocks([{ type: 'flowchart', nodes: [] } as unknown as UiBlock]);
    const signal = getBreadcrumbs().find(
      (b) => b.message === 'gen_ui_unknown_block' && b.data?.blockType === 'flowchart',
    );
    expect(signal).toBeDefined();
  });

  it('reports a link_grid whose every path failed the internal-path filter', () => {
    renderBlocks([
      {
        type: 'link_grid',
        title: 'All external',
        links: [
          { label: 'A', path: 'https://evil.example', blurb: 'nope' },
          { label: 'B', path: '//evil.example', blurb: 'also nope' },
        ],
      },
    ]);
    const signal = getBreadcrumbs().find((b) => b.message === 'gen_ui_empty_link_grid' && b.data?.dropped === 2);
    expect(signal).toBeDefined();
  });

  it('contains a throwing block so sibling blocks still render', () => {
    // The boundary is per block, not around the list: React error boundaries do
    // not reset on new props, so a list-level one latched by this malformed
    // timeline would blank the stat_row beside it (and every block streamed in
    // after it, since useChatEngine appends into the same message).
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      renderBlocks([
        // items is missing entirely — Timeline calls block.items.map and throws.
        { type: 'timeline', title: 'Broken' } as unknown as UiBlock,
        {
          type: 'stat_row',
          stats: [
            { value: '9', label: 'Episodes' },
            { value: '2025', label: 'Launched' },
          ],
        },
      ]);
      expect(screen.queryByText('Broken')).not.toBeInTheDocument();
      expect(screen.getByText('Episodes')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('keeps rendering blocks that arrive after a throwing one', () => {
    // Blocks stream in one event at a time and append to msg.uiBlocks, so the
    // same component instance re-renders with a longer list. A latched boundary
    // would swallow the newly-arrived block too.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const broken = { type: 'timeline', title: 'Broken' } as unknown as UiBlock;
      const { rerender } = render(
        <MemoryRouter>
          <GenerativeBlocks blocks={[broken]} />
        </MemoryRouter>,
      );
      rerender(
        <MemoryRouter>
          <GenerativeBlocks blocks={[broken, { type: 'explainer', paragraphs: ['Arrived after the bad block.'] }]} />
        </MemoryRouter>,
      );
      expect(screen.getByText('Arrived after the bad block.')).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });
});
