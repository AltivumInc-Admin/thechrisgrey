import { memo } from 'react';
import { typography } from '../../utils/typography';
import ViewTransitionLink from '../ViewTransitionLink';
import ErrorBoundary from '../ErrorBoundary';
import type {
  UiBlock,
  TimelineBlock,
  ComparisonBlock,
  StatRowBlock,
  ProfileMiniBlock,
  ExplainerBlock,
  LinkGridBlock,
} from '../../utils/uiBlocks';
import Icon from '../icons/Icon';

/**
 * GenerativeBlocks renders Alti's generative answer surfaces from a constrained,
 * design-token-locked vocabulary (see src/utils/uiBlocks.ts). Rendered ONLY on the
 * dedicated /chat page — ChatMessage gates this on surface === 'page'. Every block
 * is locked to the existing typography + altivum palette; the model never supplies
 * markup or styling, only structured data. Unknown types render nothing.
 */

const cardShell =
  'max-w-[90%] md:max-w-[80%] px-5 py-4 bg-white/5 border border-altivum-gold/20 rounded-2xl animate-fade-in';

function BlockTitle({ children }: { children: string }) {
  return (
    <p className="text-altivum-silver uppercase tracking-wider mb-3" style={typography.smallText}>
      {children}
    </p>
  );
}

function isInternalPath(path: string): boolean {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

function Timeline({ block }: { block: TimelineBlock }) {
  return (
    <div className={cardShell} role="group" aria-label={block.title || 'Timeline'}>
      {block.title ? <BlockTitle>{block.title}</BlockTitle> : null}
      <ol className="border-l border-altivum-gold/30 pl-4 space-y-4">
        {block.items.map((item, i) => (
          <li key={i} className="relative">
            <span
              className="absolute left-[-21px] top-1.5 w-2 h-2 rounded-full bg-altivum-gold/70"
              aria-hidden="true"
            />
            <p className="text-altivum-gold" style={typography.smallText}>
              {item.year}
            </p>
            <p className="text-white" style={typography.bodyText}>
              {item.heading}
            </p>
            <p className="text-altivum-silver/80" style={typography.smallText}>
              {item.detail}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Hoisted to module scope — Column has no closure dependencies on its parent
// (it takes heading/points as props, nothing more). Defining it inside
// Comparison re-creates the component identity on every render, which trips
// react-hooks/static-components and (more importantly) defeats React's
// referential-equality memoization on the column subtrees.
function ComparisonColumn({ heading, points }: { heading: string; points: string[] }) {
  return (
    <div className="flex-1">
      <p className="text-altivum-gold mb-2" style={typography.bodyText}>
        {heading}
      </p>
      <ul className="space-y-1.5">
        {points.map((point, i) => (
          <li key={i} className="text-altivum-silver/90 flex items-start gap-2" style={typography.smallText}>
            <span className="text-altivum-gold/60 mt-0.5 shrink-0" aria-hidden="true">
              —
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Comparison({ block }: { block: ComparisonBlock }) {
  return (
    <div className={cardShell} role="group" aria-label={block.title || 'Comparison'}>
      {block.title ? <BlockTitle>{block.title}</BlockTitle> : null}
      <div className="flex flex-col sm:flex-row gap-5">
        <ComparisonColumn heading={block.left.heading} points={block.left.points} />
        <div
          className="hidden sm:block w-px bg-linear-to-b from-transparent via-altivum-gold/20 to-transparent"
          aria-hidden="true"
        />
        <ComparisonColumn heading={block.right.heading} points={block.right.points} />
      </div>
    </div>
  );
}

function StatRow({ block }: { block: StatRowBlock }) {
  return (
    <div className={cardShell} role="group" aria-label="Statistics">
      <div className="flex flex-wrap justify-around gap-6">
        {block.stats.map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl text-altivum-gold" style={{ fontWeight: 200 }}>
              {stat.value}
            </div>
            <div className="text-altivum-silver uppercase tracking-wider mt-1" style={typography.smallText}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileMini({ block }: { block: ProfileMiniBlock }) {
  return (
    <div className={cardShell} role="group" aria-label={`Profile: ${block.name}`}>
      <p className="text-white" style={typography.bodyText}>
        {block.name}
      </p>
      <p className="text-altivum-gold italic mb-2" style={typography.smallText}>
        {block.role}
      </p>
      <p className="text-altivum-silver/90 mb-3" style={typography.smallText}>
        {block.blurb}
      </p>
      {block.ctaPath && isInternalPath(block.ctaPath) ? (
        <ViewTransitionLink
          to={block.ctaPath}
          className="group inline-flex items-center gap-1 text-altivum-gold hover:underline"
          style={typography.smallText}
        >
          <span>Learn more</span>
          <Icon
            name="arrow_forward"
            className="text-base leading-none transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </ViewTransitionLink>
      ) : null}
    </div>
  );
}

function Explainer({ block }: { block: ExplainerBlock }) {
  return (
    <div className={cardShell} role="group" aria-label={block.title || 'Explainer'}>
      {block.title ? <BlockTitle>{block.title}</BlockTitle> : null}
      <div className="space-y-2">
        {block.paragraphs.map((paragraph, i) => (
          <p key={i} className="text-altivum-silver/90" style={typography.smallText}>
            {paragraph}
          </p>
        ))}
      </div>
      {block.bullets && block.bullets.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {block.bullets.map((bullet, i) => (
            <li key={i} className="text-altivum-silver/90 flex items-start gap-2" style={typography.smallText}>
              <span className="text-altivum-gold/60 mt-0.5 shrink-0" aria-hidden="true">
                —
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LinkGrid({ block }: { block: LinkGridBlock }) {
  const links = block.links.filter((l) => isInternalPath(l.path));
  if (links.length === 0) return null;
  return (
    <div className={cardShell} role="group" aria-label={block.title || 'Links'}>
      {block.title ? <BlockTitle>{block.title}</BlockTitle> : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((link, i) => (
          <ViewTransitionLink
            key={i}
            to={link.path}
            className="group block px-3 py-2 rounded-lg border border-white/10 hover:border-altivum-gold/40 transition-colors duration-200"
          >
            <span className="text-altivum-gold flex items-center gap-1" style={typography.bodyText}>
              {link.label}
              <Icon
                name="arrow_forward"
                className="text-base leading-none transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
            <span className="text-altivum-silver/80 block" style={typography.smallText}>
              {link.blurb}
            </span>
          </ViewTransitionLink>
        ))}
      </div>
    </div>
  );
}

function renderBlock(block: UiBlock, index: number) {
  switch (block.type) {
    case 'timeline':
      return <Timeline key={index} block={block} />;
    case 'comparison':
      return <Comparison key={index} block={block} />;
    case 'stat_row':
      return <StatRow key={index} block={block} />;
    case 'profile_mini':
      return <ProfileMini key={index} block={block} />;
    case 'explainer':
      return <Explainer key={index} block={block} />;
    case 'link_grid':
      return <LinkGrid key={index} block={block} />;
    default:
      return null;
  }
}

const GenerativeBlocks = memo(function GenerativeBlocks({ blocks }: { blocks: UiBlock[] }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    // Empty fragment fallback: a malformed block renders nothing rather than an
    // error card inside the chat thread.
    <ErrorBoundary fallback={<></>} showHomeButton={false} pageName="Generative UI">
      <div className="flex flex-col gap-3">{blocks.map((block, i) => renderBlock(block, i))}</div>
    </ErrorBoundary>
  );
});

export default GenerativeBlocks;
