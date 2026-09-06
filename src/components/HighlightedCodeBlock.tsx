import { useState, useEffect, memo } from 'react';
import { ensureLanguage, isSupportedLanguage, type SupportedLanguage } from '../utils/shikiHighlighter';
import { createLogger } from '../utils/logger';

const log = createLogger('HighlightedCodeBlock');

interface HighlightedCodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

const HighlightedCodeBlock = memo(({ code, language, filename }: HighlightedCodeBlockProps) => {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function highlight(lang: SupportedLanguage) {
      try {
        const highlighter = await ensureLanguage(lang);
        const html = highlighter.codeToHtml(code, {
          lang,
          theme: 'github-dark',
        });
        if (!cancelled) {
          setHighlightedHtml(html);
        }
      } catch (error) {
        // The plain <pre> below stays on screen, so the failure is invisible
        // otherwise: a broken grammar chunk would unstyle every code block on
        // the blog with no operator signal. Logged with the raw Error too so
        // the logger can hand Sentry a real capture target.
        log.error('highlight_failed', {
          language: lang,
          errorMessage: error instanceof Error ? error.message : String(error),
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    // An absent or unsupported language used to fall back to 'text', which has
    // no grammar to tokenize with — yet still pulled the whole highlighter down
    // to produce what the plain <pre> below already renders.
    const lang = language && isSupportedLanguage(language) ? language : null;
    if (code && lang) {
      highlight(lang);
    }

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return (
    <div className="my-6">
      {filename && (
        <div className="bg-altivum-navy/80 px-4 py-2 text-xs text-altivum-silver border-b border-white/10 rounded-t-lg font-mono">
          {filename}
        </div>
      )}
      {highlightedHtml ? (
        // Safe: Shiki generates HTML from its own tokenizer on CMS-authored code strings.
        // No user-supplied content flows through this path.
        <div
          className={`[&>pre]:bg-altivum-navy/50 [&>pre]:p-4 [&>pre]:overflow-x-auto [&>pre]:text-sm [&>pre]:font-mono ${
            filename ? '[&>pre]:rounded-b-lg [&>pre]:rounded-t-none' : '[&>pre]:rounded-lg'
          }`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre
          className={`bg-altivum-navy/50 p-4 overflow-x-auto text-sm text-altivum-silver font-mono ${
            filename ? 'rounded-b-lg' : 'rounded-lg'
          }`}
        >
          <code>{code}</code>
        </pre>
      )}
      {language && <div className="text-right text-xs text-altivum-silver mt-1">{language}</div>}
    </div>
  );
});

HighlightedCodeBlock.displayName = 'HighlightedCodeBlock';

export default HighlightedCodeBlock;
