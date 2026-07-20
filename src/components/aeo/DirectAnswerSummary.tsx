import { typography } from '../../utils/typography';

interface DirectAnswerSummaryProps {
  /**
   * The direct-answer summary text. Must answer the page's implicit question in
   * plain language, 40-80 words (VAL-AEO-001). Sourced from the per-page typed
   * AEO content module, not hardcoded in JSX, so it stays a single source of
   * truth the schema / prerender gate can also read.
   */
  text: string;
  /**
   * Element to render. Defaults to `<p>`; use `"div"` when the summary contains
   * block-level markup. The `data-aio-summary` selector is the contract the
   * prerender SEO gate and AI crawlers look for.
   */
  as?: 'p' | 'div';
  /** Extra className for the rendered element. */
  className?: string;
}

/**
 * Direct-answer summary — a concise 40-80 word plain-language answer to the
 * page's implicit question, placed in the first viewport and BEFORE the first
 * `<h2>` (VAL-AEO-001, VAL-AEO-002).
 *
 * The `data-aio-summary` attribute is the stable selector the build-time
 * prerender SEO gate and AI answer-engine extraction look for. The summary is
 * intentionally NOT inside an `<h2>`-headed section so it appears first in the
 * DOM source order, ahead of every question-based heading.
 */
const DirectAnswerSummary = ({ text, as = 'p', className = '' }: DirectAnswerSummaryProps) => {
  const classNames = `text-altivum-silver ${className}`;
  if (as === 'div') {
    return (
      <div data-aio-summary className={classNames} style={typography.subtitle}>
        {text}
      </div>
    );
  }
  return (
    <p data-aio-summary className={classNames} style={typography.subtitle}>
      {text}
    </p>
  );
};

export default DirectAnswerSummary;
