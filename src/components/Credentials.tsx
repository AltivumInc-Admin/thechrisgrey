import { CREDENTIALS, type Credential } from '../data/credentials';
import { typography } from '../utils/typography';
import { slugify } from '../utils/slugify';
import Icon from './icons/Icon';

interface CredentialsProps {
  /** Override the global list (e.g. for testing or curated subsets). */
  items?: Credential[];
  eyebrow?: string;
  heading?: string;
}

/**
 * Credentials & Recognition — a visible trust-signal section that mirrors the
 * data feeding the Person (and Organization) JSON-LD. Renders from the single
 * typed `CREDENTIALS` source so the visible section and the structured data
 * stay aligned (Bronze Star, Green Beret / 18D, AWS Community Builder, Anthropic
 * Academy certifications, Veteran Business of the Month).
 */
const Credentials = ({
  items = CREDENTIALS,
  eyebrow = 'Credentials & Recognition',
  heading = 'Credentials & Recognition',
}: CredentialsProps) => {
  if (!items || items.length === 0) return null;

  return (
    <section className="py-20 sm:py-24 border-t border-white/5" aria-labelledby="credentials-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-1 bg-altivum-gold/10 border border-altivum-gold/20 rounded-full mb-6">
            <span className="text-altivum-gold text-xs uppercase tracking-widest font-medium">{eyebrow}</span>
          </div>
          <h2 id="credentials-heading" className="text-white" style={typography.cardTitleLarge}>
            {heading}
          </h2>
        </div>

        <ul className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {items.map((credential) => {
            const isLink = Boolean(credential.url);
            const Wrapper = isLink ? 'a' : 'div';
            const wrapperProps = isLink
              ? {
                  href: credential.url,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  'aria-label': `${credential.label} — open reference`,
                }
              : {};

            return (
              <li key={credential.id}>
                <Wrapper
                  {...wrapperProps}
                  className={`flex items-start gap-4 p-5 bg-altivum-navy/30 border border-white/5 hover:border-altivum-gold/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-altivum-gold/5 transition-all duration-300 h-full ${
                    isLink ? 'group cursor-pointer' : ''
                  }`}
                >
                  <Icon
                    name={credential.icon ?? 'military_tech'}
                    className="text-altivum-gold shrink-0 text-2xl"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-altivum-gold/80 text-[11px] uppercase tracking-[0.2em] mb-1">
                      {credential.category}
                    </p>
                    <h3
                      id={slugify(credential.label)}
                      className="text-white font-medium mb-1 group-hover:text-altivum-gold transition-colors duration-300"
                      style={typography.cardTitleSmall}
                    >
                      {credential.label}
                    </h3>
                    <p className="text-altivum-silver text-sm leading-relaxed">{credential.description}</p>
                    {credential.issuedBy && (
                      <p className="text-altivum-silver/60 text-xs mt-2">
                        {credential.url ? (
                          <span className="inline-flex items-center gap-1 text-altivum-gold/70 group-hover:text-altivum-gold transition-colors">
                            {credential.issuedBy}
                            <Icon name="open_in_new" style={{ fontSize: '12px' }} aria-hidden="true" />
                          </span>
                        ) : (
                          credential.issuedBy
                        )}
                      </p>
                    )}
                  </div>
                </Wrapper>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default Credentials;
