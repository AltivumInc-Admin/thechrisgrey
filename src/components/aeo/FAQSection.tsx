import { slugify } from '../../utils/slugify';
import { typography } from '../../utils/typography';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  /**
   * The SAME FAQ array passed to `<SEO faq={...}>` so the visible Q&A text and
   * the `FAQPage` JSON-LD `mainEntity` text agree byte-for-byte (VAL-AEO-004).
   * Do not paraphrase — pass the exact source array.
   */
  faqs: FAQItem[];
  /** Optional section heading override. Defaults to "Frequently Asked Questions". */
  heading?: string;
  /** Extra className for the outer `<section>`. */
  className?: string;
}

/**
 * Visible FAQ section — renders the same Q/A pairs that `<SEO faq={...}>`
 * emits as a `FAQPage` JSON-LD node, so AI crawlers and readers see the same
 * text in the DOM and the structured data (VAL-AEO-004).
 *
 * Each question is an `<h3>` with a stable slug-form `id` derived from the
 * question text, so a fragment like `/about#what-is-christian-perezs-military-background`
 * links directly to the question (VAL-AEO-005). The section heading is an `<h2>`
 * with the id `frequently-asked-questions`.
 *
 * Render this AFTER the page's main content but before the closing CTAs, on
 * every route that passes a `faq` array to `<SEO>`.
 */
const FAQSection = ({ faqs, heading = 'Frequently Asked Questions', className = '' }: FAQSectionProps) => {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section
      className={`py-20 sm:py-24 border-t border-white/5 ${className}`}
      aria-labelledby="frequently-asked-questions"
      data-aio-faq
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="frequently-asked-questions" className="text-white mb-10" style={typography.sectionHeader}>
          {heading}
        </h2>
        <ul className="space-y-10 list-none">
          {faqs.map((faq) => {
            // Prefix with `faq-` so FAQ question IDs never collide with
            // page-level QuestionHeading IDs that use the same question text
            // (e.g. /aws has both a section "What is the AWS Community Builders
            // program?" and a FAQ question with the same text). The prefix is
            // slug-form so VAL-AEO-005's slug check still passes.
            const questionId = `faq-${slugify(faq.question)}`;
            return (
              <li key={questionId || faq.question} className="block">
                <h3 id={questionId} className="text-white mb-3" style={typography.cardTitleLarge}>
                  {faq.question}
                </h3>
                <p className="text-altivum-silver leading-relaxed" style={typography.bodyText} data-aio-answer>
                  {faq.answer}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default FAQSection;
