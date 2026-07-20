import ViewTransitionLink from './ViewTransitionLink';
import { typography } from '../utils/typography';

interface CrossLink {
  /** Internal site path (must match a route in src/routes.ts). */
  to: string;
  /** Short label shown on the card. */
  label: string;
  /** One-sentence description of what the visitor will find at the destination. */
  description: string;
}

interface CrossLinkBandProps {
  /**
   * Page-specific heading copy. Defaults to "Explore more".
   */
  heading?: string;
  /**
   * Eyebrow chip text. Defaults to "Keep exploring".
   */
  eyebrow?: string;
  /**
   * At least two internal links to related pages. The band renders one card
   * per link; each card is a ViewTransitionLink so navigation is an SPA
   * transition (no full reload).
   */
  links: CrossLink[];
}

/**
 * "Explore more" cross-link band: surfaces two or more related internal pages
 * on isolated funnel sub-pages so visitors (and search crawlers) have a clear
 * next step instead of a dead-end. Every anchor is a ViewTransitionLink, so
 * navigation stays inside the SPA and preserves chat / scroll state.
 */
const CrossLinkBand = ({ heading = 'Explore more', eyebrow = 'Keep exploring', links }: CrossLinkBandProps) => {
  if (!links || links.length === 0) return null;

  return (
    <section className="py-20 sm:py-24 border-t border-white/5" aria-labelledby="cross-link-band-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-1 bg-altivum-gold/10 border border-altivum-gold/20 rounded-full mb-6">
            <span className="text-altivum-gold text-xs uppercase tracking-widest font-medium">{eyebrow}</span>
          </div>
          <h2 id="cross-link-band-heading" className="text-white" style={typography.cardTitleLarge}>
            {heading}
          </h2>
        </div>
        <nav aria-label={heading} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <ViewTransitionLink
              key={link.to}
              to={link.to}
              className="group block p-6 rounded-lg border border-white/10 hover:border-altivum-gold/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-altivum-gold/5 transition-all duration-300 bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altivum-gold focus-visible:ring-offset-2 focus-visible:ring-offset-altivum-dark touch-manipulation min-h-[48px]"
            >
              <div className="flex items-start justify-between gap-3">
                <h3
                  className="text-white group-hover:text-altivum-gold transition-colors"
                  style={typography.cardTitleSmall}
                >
                  {link.label}
                </h3>
                <span
                  className="material-icons text-altivum-silver/40 group-hover:text-altivum-gold group-hover:translate-x-1 transition-all shrink-0"
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              </div>
              <p className="text-altivum-silver/70 mt-3" style={typography.smallText}>
                {link.description}
              </p>
            </ViewTransitionLink>
          ))}
        </nav>
      </div>
    </section>
  );
};

export default CrossLinkBand;
