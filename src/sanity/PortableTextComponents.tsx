import { PortableTextComponents } from '@portabletext/react';
import type { CodeBlock, Callout, YouTube, Divider, PullQuote, BookReference } from './types';
import { isRenderableImageSource } from './guards';
// Authored-href policy (scheme allowlist + internal-path resolution) now lives
// in its own module so BlogPost's `pdfUrl` — the third CMS-supplied href — is
// held to the same standard as the link mark and the bookReference card.
import { isAllowedHref, resolveInternalPath } from './href';
import { imageAspectRatio } from './imageMeta';
import YouTubeFacade from '../components/YouTubeFacade';
import HighlightedCodeBlock from '../components/HighlightedCodeBlock';
import SanityResponsiveImage from '../components/SanityResponsiveImage';
import ViewTransitionLink from '../components/ViewTransitionLink';
import { getYouTubeId } from '../utils/youtube';
import { typography } from '../utils/typography';
import { slugify, textFromChildren } from '../utils/slugify';
import Icon from '../components/icons/Icon';

// Callout icons and styles based on type
const calloutStyles = {
  note: {
    bg: 'bg-altivum-blue/20',
    border: 'border-altivum-blue',
    icon: 'info',
    label: 'Note',
  },
  tip: {
    bg: 'bg-green-900/20',
    border: 'border-green-500',
    icon: 'lightbulb',
    label: 'Tip',
  },
  warning: {
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-500',
    icon: 'warning',
    label: 'Warning',
  },
  important: {
    bg: 'bg-red-900/20',
    border: 'border-red-500',
    icon: 'priority_high',
    label: 'Important',
  },
};

export const portableTextComponents: PortableTextComponents = {
  types: {
    // Inline images with CLS fix and responsive srcset
    image: ({ value }) => {
      // Validate the asset is actually renderable before handing it to urlFor —
      // a malformed/un-dereferenced image would otherwise throw in the builder.
      if (!isRenderableImageSource(value)) return null;
      // Reserve a box shaped like the ACTUAL image. The hardcoded 4:3 still
      // protected against CLS, but `object-cover` then cropped everything that
      // did not fit it: a 953x1000 portrait screenshot lost ~28% of its height
      // and a 1708x450 banner ~65% of its width, silently and with no author
      // control. `metadata.dimensions` rides along in the same GROQ response, so
      // the ratio is known before the raster loads and the CLS guarantee holds.
      const ratio = imageAspectRatio(value) ?? 4 / 3;
      return (
        <figure className="my-8">
          <div className="relative w-full rounded-lg" style={{ aspectRatio: `${ratio}` }}>
            <SanityResponsiveImage
              source={value}
              alt={value.alt || ''}
              aspectRatio={ratio}
              widths={[480, 640, 800]}
              sizes="(max-width: 768px) 100vw, 800px"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          {value.caption && (
            <figcaption className="text-center text-sm text-altivum-silver/70 mt-3">{value.caption}</figcaption>
          )}
        </figure>
      );
    },

    // Code blocks with syntax highlighting
    codeBlock: ({ value }: { value: CodeBlock }) => (
      <HighlightedCodeBlock code={value.code?.code || ''} language={value.code?.language} filename={value.filename} />
    ),

    // Callout boxes (Note, Tip, Warning, Important)
    callout: ({ value }: { value: Callout }) => {
      const style = calloutStyles[value.type] || calloutStyles.note;
      return (
        <div className={`my-6 p-4 ${style.bg} border-l-4 ${style.border} rounded-r-lg`}>
          <div className="flex items-start gap-3">
            <Icon name={style.icon} className="text-xl mt-0.5" />
            <div>
              <div className="font-semibold text-white mb-1">{style.label}</div>
              <p className="text-altivum-silver text-sm leading-relaxed">{value.text}</p>
            </div>
          </div>
        </div>
      );
    },

    // YouTube embeds
    youtube: ({ value }: { value: YouTube }) => {
      const videoId = getYouTubeId(value.url);
      if (!videoId) return null;
      return (
        <figure className="my-8">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-altivum-navy">
            <YouTubeFacade videoId={videoId} title={value.caption || 'YouTube video'} />
          </div>
          {value.caption && (
            <figcaption className="text-center text-sm text-altivum-silver/70 mt-3">{value.caption}</figcaption>
          )}
        </figure>
      );
    },

    // Dividers / horizontal rules
    divider: ({ value }: { value: Divider }) => {
      const style = value.style || 'line';

      if (style === 'space') {
        return <div className="my-12" aria-hidden="true" />;
      }

      if (style === 'dots') {
        return (
          <div className="my-10 flex justify-center gap-3" aria-hidden="true">
            <span className="w-1.5 h-1.5 rounded-full bg-altivum-gold/60" />
            <span className="w-1.5 h-1.5 rounded-full bg-altivum-gold/60" />
            <span className="w-1.5 h-1.5 rounded-full bg-altivum-gold/60" />
          </div>
        );
      }

      // Default: line
      return <hr className="my-10 border-0 h-px bg-linear-to-r from-transparent via-altivum-gold/40 to-transparent" />;
    },

    // Pull quotes - prominent callout for key insights
    pullQuote: ({ value }: { value: PullQuote }) => {
      return (
        <figure className="my-10 px-6 py-8 border-l-4 border-r-4 border-altivum-gold/60 bg-altivum-navy/30 rounded-lg">
          <blockquote className="text-xl md:text-2xl text-white font-light leading-relaxed text-center italic">
            "{value.quote}"
          </blockquote>
          {value.attribution && (
            <figcaption className="mt-4 text-center text-altivum-silver text-sm">— {value.attribution}</figcaption>
          )}
        </figure>
      );
    },

    // Book references - cards for recommended reading
    bookReference: ({ value }: { value: BookReference }) => {
      const content = (
        <div className="my-8 flex gap-5 p-5 bg-altivum-navy/40 border border-altivum-blue/30 rounded-lg hover:border-altivum-gold/40 transition-colors">
          {isRenderableImageSource(value.cover) && (
            <div className="shrink-0">
              <SanityResponsiveImage
                source={value.cover}
                alt={`Cover of ${value.title}`}
                aspectRatio={2 / 3}
                widths={[80, 120, 160]}
                sizes="(max-width: 768px) 80px, 96px"
                className="w-20 md:w-24 rounded-sm shadow-lg"
              />
            </div>
          )}
          <div className="flex flex-col justify-center">
            <div className="text-xs uppercase tracking-wider text-altivum-gold mb-1">Recommended Reading</div>
            <h4 className="text-lg font-semibold text-white mb-1">{value.title}</h4>
            <p className="text-sm text-altivum-silver mb-2">by {value.author}</p>
            {value.description && <p className="text-sm text-altivum-silver/80 leading-relaxed">{value.description}</p>}
          </div>
        </div>
      );

      // Same scheme allowlist as the link mark — this href is author-supplied too.
      if (value.link && isAllowedHref(value.link)) {
        return (
          <a href={value.link} target="_blank" rel="noopener noreferrer" className="block no-underline">
            {content}
          </a>
        );
      }

      return content;
    },
  },

  block: {
    // Headings — each gets a stable slug-form id for fragment linking (VAL-AEO-005).
    // The id is derived from the heading text via slugify, so it is stable across
    // builds unless the heading text changes.
    //
    // Sizing/weight come from typography.ts, not ad-hoc Tailwind classes. With the
    // inert `prose` wrapper gone these classes were the ONLY body styling left, and
    // they rendered the article in the browser default stack at font-semibold —
    // beside a page whose own H1 and section headings are SF Pro Display at weight
    // 200. The article body was the one part of a post that did not look like the
    // site. (h4 rides `subtitle`: the scale has no fourth display step, and it
    // still separates from h3 where a fourth heading level realistically appears.)
    h2: ({ children }) => (
      <h2 id={slugify(textFromChildren(children))} className="text-white mt-10 mb-4" style={typography.cardTitleLarge}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 id={slugify(textFromChildren(children))} className="text-white mt-8 mb-3" style={typography.cardTitleSmall}>
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-white mt-6 mb-2" style={typography.subtitle}>
        {children}
      </h4>
    ),
    // Normal paragraph. `lineHeight` is the one deliberate departure from the
    // token: bodyText is tuned at 1.5 for short UI copy, and running article prose
    // wants the 1.625 `leading-relaxed` gave it. It is set inline rather than left
    // as a class because an inline style would silently win over the class and
    // leave the class as decoration.
    normal: ({ children }) => (
      <p className="text-altivum-silver mb-6" style={{ ...typography.bodyText, lineHeight: 1.625 }}>
        {children}
      </p>
    ),
    // Blockquote
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-altivum-gold pl-6 my-6 italic text-altivum-silver/90">
        {children}
      </blockquote>
    ),
  },

  marks: {
    // Text formatting
    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    underline: ({ children }) => <span className="underline">{children}</span>,
    'strike-through': ({ children }) => <span className="line-through">{children}</span>,
    code: ({ children }) => (
      <code className="bg-altivum-navy/50 px-1.5 py-0.5 rounded-sm text-sm font-mono text-altivum-gold">
        {children}
      </code>
    ),
    // Links
    link: ({ children, value }) => {
      const href = value?.href || '';
      // A scheme outside the allowlist never becomes a live anchor — render the
      // text and drop the href rather than emitting `javascript:`/`data:` into
      // the DOM.
      if (!isAllowedHref(href)) return <>{children}</>;

      const internalPath = resolveInternalPath(href);
      const isExternal = internalPath === null;
      // Authors can force a new tab on internal links (rare); external links
      // always open in a new tab. When `openInNewTab` is set we keep a plain
      // anchor so the browser actually opens a new tab instead of an in-app
      // SPA transition.
      const opensInNewTab = Boolean(value?.openInNewTab) || isExternal;

      if (!opensInNewTab && internalPath) {
        return (
          <ViewTransitionLink
            to={internalPath}
            className="text-altivum-gold hover:text-white underline underline-offset-2 transition-colors"
          >
            {children}
          </ViewTransitionLink>
        );
      }

      return (
        <a
          href={href}
          target={opensInNewTab ? '_blank' : undefined}
          rel={opensInNewTab ? 'noopener noreferrer' : undefined}
          className="text-altivum-gold hover:text-white underline underline-offset-2 transition-colors"
        >
          {children}
        </a>
      );
    },
  },

  list: {
    bullet: ({ children }) => <ul className="list-disc list-inside mb-6 space-y-2 text-altivum-silver">{children}</ul>,
    number: ({ children }) => (
      <ol className="list-decimal list-inside mb-6 space-y-2 text-altivum-silver">{children}</ol>
    ),
  },

  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },
};
