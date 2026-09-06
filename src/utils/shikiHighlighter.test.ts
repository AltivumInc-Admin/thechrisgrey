import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub the Shiki modules the singleton dynamic-imports so jsdom never pulls the
// real core, regex engine or grammars. Only the two grammars exercised below
// are stubbed — the other thirteen loaders are never invoked, which is the
// point of the lazy map.
const { mockCreateHighlighterCore, mockLoadLanguage } = vi.hoisted(() => ({
  mockCreateHighlighterCore: vi.fn(),
  mockLoadLanguage: vi.fn(),
}));

vi.mock('shiki/core', () => ({ createHighlighterCore: mockCreateHighlighterCore }));
vi.mock('shiki/engine/javascript', () => ({ createJavaScriptRegexEngine: () => ({ name: 'javascript' }) }));
vi.mock('@shikijs/themes/github-dark', () => ({ default: { name: 'github-dark' } }));
vi.mock('@shikijs/langs/bash', () => ({ default: [{ name: 'bash' }] }));
vi.mock('@shikijs/langs/python', () => ({ default: [{ name: 'python' }] }));

const highlighter = { loadLanguage: mockLoadLanguage, codeToHtml: vi.fn() };

const loadModule = () => import('./shikiHighlighter');

describe('shikiHighlighter', () => {
  beforeEach(() => {
    // The singleton keeps module-level state; reset it between cases.
    vi.resetModules();
    vi.clearAllMocks();
    mockCreateHighlighterCore.mockResolvedValue(highlighter);
    mockLoadLanguage.mockResolvedValue(undefined);
  });

  it('should create the highlighter with no grammars loaded up front', async () => {
    const { getHighlighter } = await loadModule();

    await getHighlighter();

    // Passing the fifteen grammar imports here made one bash snippet download
    // 166 KB gzipped of grammars it never used.
    expect(mockCreateHighlighterCore).toHaveBeenCalledWith(expect.objectContaining({ langs: [] }));
  });

  it('should reuse a single highlighter instance', async () => {
    const { getHighlighter } = await loadModule();

    const [first, second] = await Promise.all([getHighlighter(), getHighlighter()]);

    expect(first).toBe(second);
    expect(mockCreateHighlighterCore).toHaveBeenCalledTimes(1);
  });

  it('should load each grammar once, on demand', async () => {
    const { ensureLanguage } = await loadModule();

    await ensureLanguage('bash');
    await ensureLanguage('bash');
    expect(mockLoadLanguage).toHaveBeenCalledTimes(1);

    await ensureLanguage('python');
    expect(mockLoadLanguage).toHaveBeenCalledTimes(2);
  });

  it('should not memoize a failed highlighter load', async () => {
    mockCreateHighlighterCore.mockRejectedValueOnce(new Error('chunk load failed'));
    const { getHighlighter } = await loadModule();

    await expect(getHighlighter()).rejects.toThrow('chunk load failed');

    // A cached rejection would disable highlighting for the life of the tab.
    await expect(getHighlighter()).resolves.toBe(highlighter);
    expect(mockCreateHighlighterCore).toHaveBeenCalledTimes(2);
  });

  it('should not memoize a failed grammar load', async () => {
    mockLoadLanguage.mockRejectedValueOnce(new Error('grammar chunk 404'));
    const { ensureLanguage } = await loadModule();

    await expect(ensureLanguage('bash')).rejects.toThrow('grammar chunk 404');

    await expect(ensureLanguage('bash')).resolves.toBe(highlighter);
    expect(mockLoadLanguage).toHaveBeenCalledTimes(2);
  });

  it('should recognise exactly the languages it can load', async () => {
    const { isSupportedLanguage } = await loadModule();

    expect(isSupportedLanguage('typescript')).toBe(true);
    expect(isSupportedLanguage('bash')).toBe(true);
    expect(isSupportedLanguage('text')).toBe(false);
    expect(isSupportedLanguage('cobol')).toBe(false);
  });
});
