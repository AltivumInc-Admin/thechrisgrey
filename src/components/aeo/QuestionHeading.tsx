import type { ReactNode } from 'react';
import { slugify, textFromChildren } from '../../utils/slugify';
import { typography } from '../../utils/typography';

interface QuestionHeadingProps {
  /** Heading text (question or answer title). The id is derived from this. */
  children: ReactNode;
  /**
   * Heading level: `"h2"` (default) or `"h3"`. Drives both the rendered tag and
   * the typography style so question headings stay visually consistent with
   * their level.
   */
  as?: 'h2' | 'h3';
  /**
   * Optional explicit id override. When omitted, the id is derived from the
   * heading text via `slugify`, so it is stable across builds unless the text
   * changes (VAL-AEO-005).
   */
  id?: string;
  /** Extra className. */
  className?: string;
}

const STYLE_BY_TAG = {
  h2: typography.sectionHeader,
  h3: typography.cardTitleLarge,
} as const;

/**
 * Question-based heading (H2/H3) with a stable, slug-form `id` for fragment
 * linking (VAL-AEO-003, VAL-AEO-005).
 *
 * Use this for any heading phrased as a question ("What is...?", "How does...?")
 * or answer title. The slug id is derived from the heading text via `slugify`,
 * so `/aws#what-is-aws-certification` resolves to the right section across
 * builds. Pass an explicit `id` only when the derived slug would collide.
 */
const QuestionHeading = ({ children, as = 'h2', id, className = '' }: QuestionHeadingProps) => {
  const derivedId = id ?? slugify(textFromChildren(children));
  const classNames = `text-white ${className}`;
  if (as === 'h3') {
    return (
      <h3 id={derivedId} className={classNames} style={STYLE_BY_TAG.h3}>
        {children}
      </h3>
    );
  }
  return (
    <h2 id={derivedId} className={classNames} style={STYLE_BY_TAG.h2}>
      {children}
    </h2>
  );
};

export default QuestionHeading;
