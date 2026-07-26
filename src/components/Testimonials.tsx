import { typography } from '../utils/typography';
import { slugify } from '../utils/slugify';
import { TESTIMONIALS, type Testimonial } from '../data/testimonials';

interface TestimonialsProps {
  /** Override the global list (e.g. page-specific quotes). Defaults to TESTIMONIALS. */
  items?: Testimonial[];
  eyebrow?: string;
  heading?: string;
}

/**
 * Social-proof band: attributed testimonials in the brand's pull-quote style.
 * Renders NOTHING when there are no testimonials, so it's safe to mount on pages
 * now and it simply appears once real quotes are added to src/data/testimonials.ts.
 */
const Testimonials = ({
  items = TESTIMONIALS,
  eyebrow = 'What people say',
  heading = 'In their words',
}: TestimonialsProps) => {
  if (!items || items.length === 0) return null;

  return (
    <section className="cv-below-fold py-20 sm:py-24 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-1 bg-altivum-gold/10 border border-altivum-gold/20 rounded-full mb-6">
            <span className="text-altivum-gold text-xs uppercase tracking-widest font-medium">{eyebrow}</span>
          </div>
          <h2 id={slugify(heading)} className="text-white" style={typography.cardTitleLarge}>
            {heading}
          </h2>
        </div>
        <div className={`grid gap-6 ${items.length > 1 ? 'md:grid-cols-2' : 'max-w-2xl mx-auto'}`}>
          {items.map((t, i) => (
            <figure key={`${t.author}-${i}`} className="border-l-2 border-altivum-gold/40 pl-5 py-1">
              <blockquote className="text-altivum-silver mb-4" style={typography.bodyText}>
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption style={typography.smallText}>
                <span className="text-white font-medium">{t.author}</span>
                {t.role ? <span className="text-altivum-silver/70"> · {t.role}</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
