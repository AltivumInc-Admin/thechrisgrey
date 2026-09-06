import type { HighlighterCore, LanguageRegistration } from 'shiki/core';

const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'bash',
  'json',
  'html',
  'css',
  'yaml',
  'markdown',
  'sql',
  'go',
  'rust',
  'java',
  'tsx',
  'jsx',
] as const;

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

type GrammarLoader = () => Promise<{ default: LanguageRegistration[] }>;

/**
 * Per-language grammar loaders, requested on demand by ensureLanguage().
 *
 * Handing all fifteen `import()` calls to createHighlighterCore made every post
 * download every grammar (1.12 MB raw / 166 KB gzipped over 16 requests) even
 * when its only snippet was bash. These stay *static* `import()` specifiers so
 * Vite still emits one chunk per grammar — the map changes when a chunk is
 * fetched, not whether it is built.
 */
const LANGUAGE_LOADERS: Record<SupportedLanguage, GrammarLoader> = {
  typescript: () => import('@shikijs/langs/typescript'),
  javascript: () => import('@shikijs/langs/javascript'),
  python: () => import('@shikijs/langs/python'),
  bash: () => import('@shikijs/langs/bash'),
  json: () => import('@shikijs/langs/json'),
  html: () => import('@shikijs/langs/html'),
  css: () => import('@shikijs/langs/css'),
  yaml: () => import('@shikijs/langs/yaml'),
  markdown: () => import('@shikijs/langs/markdown'),
  sql: () => import('@shikijs/langs/sql'),
  go: () => import('@shikijs/langs/go'),
  rust: () => import('@shikijs/langs/rust'),
  java: () => import('@shikijs/langs/java'),
  tsx: () => import('@shikijs/langs/tsx'),
  jsx: () => import('@shikijs/langs/jsx'),
};

let highlighterPromise: Promise<HighlighterCore> | null = null;
const languagePromises = new Map<SupportedLanguage, Promise<void>>();

function createHighlighterInstance(): Promise<HighlighterCore> {
  return import('shiki/core').then(({ createHighlighterCore }) =>
    import('shiki/engine/javascript').then(({ createJavaScriptRegexEngine }) =>
      createHighlighterCore({
        themes: [import('@shikijs/themes/github-dark')],
        // Empty on purpose — grammars are registered by ensureLanguage().
        langs: [],
        engine: createJavaScriptRegexEngine(),
      }),
    ),
  );
}

export function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    // Never memoize a rejection. Every code block on the page awaits this one
    // promise, so a single failed chunk request (a stale hashed asset after a
    // deploy while the tab is open) would otherwise disable highlighting for
    // the life of the tab with no retry short of a reload.
    highlighterPromise = createHighlighterInstance().catch((error) => {
      highlighterPromise = null;
      languagePromises.clear();
      throw error;
    });
  }
  return highlighterPromise;
}

/**
 * Resolve the highlighter with `lang`'s grammar registered.
 *
 * Each grammar is fetched at most once; a failed fetch is dropped from the
 * cache for the same reason getHighlighter() drops a failed instance, so the
 * next code block retries instead of inheriting the failure.
 */
export async function ensureLanguage(lang: SupportedLanguage): Promise<HighlighterCore> {
  const highlighter = await getHighlighter();

  let pending = languagePromises.get(lang);
  if (!pending) {
    pending = highlighter.loadLanguage(LANGUAGE_LOADERS[lang]()).catch((error) => {
      languagePromises.delete(lang);
      throw error;
    });
    languagePromises.set(lang, pending);
  }
  await pending;

  return highlighter;
}

export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

export type { SupportedLanguage };
