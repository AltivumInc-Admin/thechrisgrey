import ViewTransitionLink from './ViewTransitionLink';
import { typography } from '../utils/typography';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbsProps {
  /**
   * The same `breadcrumbs` array passed to `<SEO>` — the visible trail mirrors
   * the `BreadcrumbList` JSON-LD node 1:1 (order, labels, and target URLs).
   * The last item is the current page and is rendered as non-interactive text
   * with `aria-current="page"`; every ancestor is a `ViewTransitionLink` so
   * navigation stays inside the SPA and preserves chat / scroll state.
   */
  items: BreadcrumbItem[];
  /**
   * Optional extra className for the outer `<nav>`. Defaults to an empty string.
   */
  className?: string;
}

/**
 * Convert an absolute breadcrumb URL (e.g. `https://thechrisgrey.com/blog`)
 * into the route path a `ViewTransitionLink` expects (e.g. `/blog`).
 * Falls back to the raw string when the URL is not parseable so a malformed
 * entry degrades to a no-op rather than throwing.
 */
const toPath = (url: string): string => {
  try {
    const parsed = new URL(url);
    // `https://thechrisgrey.com` -> pathname `/`; keep that as the Home path.
    return parsed.pathname || '/';
  } catch {
    return url;
  }
};

/**
 * Visible breadcrumb trail for non-Home routes. Mirrors the JSON-LD
 * `BreadcrumbList` emitted by `<SEO breadcrumbs={...}>` so the structured data
 * and the on-page navigation agree. Ancestors are SPA-transition links; the
 * current page is marked with `aria-current="page"`.
 */
const Breadcrumbs = ({ items, className = '' }: BreadcrumbsProps) => {
  if (!items || items.length === 0) return null;

  const lastIndex = items.length - 1;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-altivum-silver/70" style={typography.smallText}>
        {items.map((item, index) => {
          const isCurrent = index === lastIndex;
          return (
            <li key={`${item.url}-${index}`} className="flex items-center gap-1.5 min-h-[28px]">
              {isCurrent ? (
                <span aria-current="page" className="text-altivum-silver truncate max-w-[60vw] sm:max-w-none">
                  {item.name}
                </span>
              ) : (
                <>
                  <ViewTransitionLink
                    to={toPath(item.url)}
                    className="text-altivum-silver/70 hover:text-altivum-gold underline-offset-2 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altivum-gold focus-visible:ring-offset-2 focus-visible:ring-offset-altivum-dark rounded-sm"
                  >
                    {item.name}
                  </ViewTransitionLink>
                  <span className="text-altivum-slate/60 select-none" aria-hidden="true">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
