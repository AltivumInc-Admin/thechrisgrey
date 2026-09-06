import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HighlightedCodeBlock from './HighlightedCodeBlock';

// Mock the module the component actually imports. Mocking the bare `shiki`
// package (the previous approach) was inert: the component goes through
// ../utils/shikiHighlighter, which dynamic-imports 'shiki/core' — a different
// module id — so the real grammars were loaded in jsdom on every run and the
// failure branch was never exercised.
const { mockEnsureLanguage } = vi.hoisted(() => ({ mockEnsureLanguage: vi.fn() }));

vi.mock('../utils/shikiHighlighter', async () => {
  // Keep the real language table so the mock cannot drift from what the app
  // actually supports.
  const actual = await vi.importActual<typeof import('../utils/shikiHighlighter')>('../utils/shikiHighlighter');
  return { ...actual, ensureLanguage: mockEnsureLanguage };
});

const HIGHLIGHTED_HTML = '<pre class="shiki github-dark"><code><span>const x = 1;</span></code></pre>';

// Highlighting lands in an effect, so a case that only asserts on the first
// paint still has to await the swap — otherwise the state update escapes act().
const flushHighlight = (container: HTMLElement) =>
  waitFor(() => expect(container.querySelector('pre.shiki')).toBeInTheDocument());

describe('HighlightedCodeBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureLanguage.mockResolvedValue({ codeToHtml: vi.fn(() => HIGHLIGHTED_HTML) });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show plain text fallback initially', async () => {
    const { container } = render(<HighlightedCodeBlock code="const x = 1;" language="javascript" />);
    expect(container.querySelector('pre.shiki')).not.toBeInTheDocument();
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();

    await flushHighlight(container);
  });

  it('should render the highlighted HTML once shiki loads', async () => {
    const { container } = render(<HighlightedCodeBlock code="const x = 1;" language="javascript" />);

    await waitFor(() => {
      expect(container.querySelector('pre.shiki')).toBeInTheDocument();
    });
    expect(mockEnsureLanguage).toHaveBeenCalledWith('javascript');
  });

  it('should load only the grammar the block needs', async () => {
    render(<HighlightedCodeBlock code="echo hi" language="bash" />);

    await waitFor(() => {
      expect(mockEnsureLanguage).toHaveBeenCalledTimes(1);
    });
    expect(mockEnsureLanguage).toHaveBeenCalledWith('bash');
  });

  it('should not load shiki at all for an unsupported language', async () => {
    const { container } = render(<HighlightedCodeBlock code="SELECT 1" language="cobol" />);

    // 'cobol' has no grammar, so the plain <pre> is already the final output —
    // downloading the highlighter to produce it is pure waste.
    await waitFor(() => {
      expect(screen.getByText('SELECT 1')).toBeInTheDocument();
    });
    expect(mockEnsureLanguage).not.toHaveBeenCalled();
    expect(container.querySelector('pre.shiki')).not.toBeInTheDocument();
  });

  it('should not load shiki when no language is given', async () => {
    render(<HighlightedCodeBlock code="plain text" />);

    await waitFor(() => {
      expect(screen.getByText('plain text')).toBeInTheDocument();
    });
    expect(mockEnsureLanguage).not.toHaveBeenCalled();
  });

  it('should display filename when provided', async () => {
    const { container } = render(<HighlightedCodeBlock code="x = 1" language="python" filename="app.py" />);
    expect(screen.getByText('app.py')).toBeInTheDocument();

    await flushHighlight(container);
  });

  it('should not display filename when not provided', async () => {
    const { container } = render(<HighlightedCodeBlock code="x = 1" language="python" />);
    // No filename div should exist
    expect(container.querySelector('.font-mono.text-xs')).not.toBeInTheDocument();

    await flushHighlight(container);
  });

  it('should display language label when provided', async () => {
    const { container } = render(<HighlightedCodeBlock code="code" language="typescript" />);
    expect(screen.getByText('typescript')).toBeInTheDocument();

    await flushHighlight(container);
  });

  it('should not display language label when not provided', () => {
    render(<HighlightedCodeBlock code="code" />);
    // No language element at the bottom
    expect(screen.queryByText('text')).not.toBeInTheDocument();
  });

  it('should keep plain text and report the failure when shiki cannot load', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockEnsureLanguage.mockRejectedValue(new Error('chunk load failed'));

    const { container } = render(<HighlightedCodeBlock code="fallback code" language="go" />);

    // The plain fallback is what the reader keeps seeing...
    await waitFor(() => {
      expect(screen.getByText('fallback code')).toBeInTheDocument();
    });
    expect(container.querySelector('pre.shiki')).not.toBeInTheDocument();

    // ...and the degradation is no longer silent.
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR][HighlightedCodeBlock] highlight_failed'),
        expect.objectContaining({ language: 'go', errorMessage: 'chunk load failed' }),
      );
    });
  });

  it('should not attempt highlighting when code is empty', () => {
    render(<HighlightedCodeBlock code="" language="javascript" />);
    expect(mockEnsureLanguage).not.toHaveBeenCalled();
  });
});
