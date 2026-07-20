import { PortableTextComponents } from '@portabletext/react';
import type { CodeBlock, Callout, YouTube, Divider, PullQuote, BookReference } from './types';
import { isRenderableImageSource } from './guards';
import YouTubeFacade from '../components/YouTubeFacade';
import HighlightedCodeBlock from '../components/HighlightedCodeBlock';
import SanityResponsiveImage from '../components/SanityResponsiveImage';
import ViewTransitionLink from '../components/ViewTransitionLink';
import { getYouTubeId } from '../utils/youtube';
import { slugify, textFromChildren } from '../utils/slugify';

const SITE_ORIGIN = 'https://thechrisgrey.com';

/**
 * Resolve a Portable Text `link` mark `href` to an internal route path when it
 * points at this site, or return `null` when it is an external URL.
 *
 *   - Relative paths (`/blog/foo`) are internal — returned as-is.
 *   - Same-origin absolute URLs (`https://thechrisgrey.com/blog/foo`) are
 *     internal — the pathname is returned (`/blog/foo`).
 *   - Anything else (`https://example.com/...`, `mailto:`, etc.) is external
 *     and returns `null` so the caller keeps the plain `<a>` rendering.
 *
 * Internal links render as `ViewTransitionLink` so in-blog cross-links perform
 * an SPA transition (preserving chat state and avoiding a full reload); external
 * links keep their existing plain-anchor `target`/`rel` behavior.
 */
const resolveInternalPath = (href: string): string | null => {
  if (!href) return null;
  if (!href.startsWith('http')) return href;
  try {
    const parsed = new URL(href);
    if (parsed.origin === SITE_ORIGIN || parsed.origin === 'http://thechrisgrey.com') {
      return parsed.pathname || '/';
    }
  } catch {
    // Malformed absolute URL — treat as external so we don't silently misroute.
  }
  return null;
};

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
      return (
        <figure className="my-8">
          <div className="relative w-full rounded-lg" style={{ aspectRatio: '4 / 3' }}>
            <SanityResponsiveImage
              source={value}
              alt={value.alt || ''}
              aspectRatio={4 / 3}
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
            <span className="material-icons text-xl mt-0.5">{style.icon}</span>
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

      if (value.link) {
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
    h2: ({ children }) => (
      <h2 id={slugify(textFromChildren(children))} className="text-2xl font-semibold text-white mt-10 mb-4">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 id={slugify(textFromChildren(children))} className="text-xl font-semibold text-white mt-8 mb-3">
        {children}
      </h3>
    ),
    h4: ({ children }) => <h4 className="text-lg font-semibold text-white mt-6 mb-2">{children}</h4>,
    // Normal paragraph
    normal: ({ children }) => <p className="text-altivum-silver mb-6 leading-relaxed font-light">{children}</p>,
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
