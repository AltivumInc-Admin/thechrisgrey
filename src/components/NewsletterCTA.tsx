import NewsletterForm from './NewsletterForm';
import { typography } from '../utils/typography';
import { slugify } from '../utils/slugify';

interface NewsletterCTAProps {
  /** Surface name passed through to the Plausible "Newsletter Subscribe" goal. */
  source: string;
  eyebrow?: string;
  heading?: string;
  blurb?: string;
}

/**
 * Drop-in newsletter capture band: gold eyebrow + heading + benefit blurb + the
 * compact NewsletterForm. Used to surface owned-audience capture on top-of-funnel
 * pages (About, Podcast, Links) that previously dead-ended. The copy is
 * overridable per surface; `source` attributes signups to the page in analytics.
 */
const NewsletterCTA = ({
  source,
  eyebrow = 'Newsletter',
  heading = 'Stay in the loop',
  blurb = 'Field notes on AI, cloud, and leadership — straight to your inbox. No spam; unsubscribe anytime.',
}: NewsletterCTAProps) => (
  <section className="py-20 sm:py-24 border-t border-white/5">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <div className="inline-block px-4 py-1 bg-altivum-gold/10 border border-altivum-gold/20 rounded-full mb-6">
        <span className="text-altivum-gold text-xs uppercase tracking-widest font-medium">{eyebrow}</span>
      </div>
      <h2 id={slugify(heading)} className="text-white mb-4" style={typography.cardTitleLarge}>
        {heading}
      </h2>
      <p className="text-altivum-silver mb-8 max-w-xl mx-auto" style={typography.bodyText}>
        {blurb}
      </p>
      <NewsletterForm variant="compact" source={source} />
    </div>
  </section>
);

export default NewsletterCTA;
