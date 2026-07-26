import ViewTransitionLink from '../components/ViewTransitionLink';
import { SEO } from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import NewsletterCTA from '../components/NewsletterCTA';
import CrossLinkBand from '../components/CrossLinkBand';
import ResponsiveImage from '../components/ResponsiveImage';
import foundationImage from '../assets/foundation.webp?responsive';
import { typography } from '../utils/typography';
import { foundationFAQs, buildFoundationOrganizationSchema } from '../utils/schemas';
import DirectAnswerSummary from '../components/aeo/DirectAnswerSummary';
import FAQSection from '../components/aeo/FAQSection';
import QuestionHeading from '../components/aeo/QuestionHeading';
import { AEO_SUMMARIES } from '../data/aeoSummaries';

const breadcrumbs = [
  { name: 'Home', url: 'https://thechrisgrey.com' },
  { name: 'The Altivum Foundation', url: 'https://thechrisgrey.com/foundation' },
];

const FOCUS_AREAS = [
  {
    ordinal: '01',
    name: 'Cloud Computing',
    description:
      'Infrastructure and certification paths across AWS, Azure, and GCP — the operational backbone of the modern economy.',
  },
  {
    ordinal: '02',
    name: 'Artificial Intelligence',
    description:
      'Machine learning, large language models, and applied AI systems. The fields redefining every industry veterans enter.',
  },
  {
    ordinal: '03',
    name: 'Robotics',
    description:
      'Autonomous systems, industrial automation, and field logistics. The civilian discipline closest to operational military work.',
  },
  {
    ordinal: '04',
    name: 'Cybersecurity',
    description:
      'Threat analysis and defense operations. A field that rewards the exact instincts trained by years of service.',
  },
];

const FOUNDATION_URL = 'https://altivumfoundation.org';
const GIVE_URL = 'https://altivumfoundation.org/give';

// Shared external CTA button — used in both the hero and the closing CTA. The
// gold/outline variants share every style except color treatment; `fullWidth`
// adds the mobile full-bleed sizing the closing CTA uses.
const ctaButtonBase =
  'inline-block px-8 py-4 font-semibold rounded-sm active:scale-[0.98] transition-all duration-300 touch-manipulation min-h-[48px]';
const ctaButtonVariant = {
  gold: 'bg-altivum-gold text-altivum-dark hover:bg-altivum-gold/90 hover:shadow-[0_0_20px_rgba(197,165,114,0.3)]',
  outline: 'bg-transparent border-2 border-altivum-gold text-altivum-gold hover:bg-altivum-gold/10',
} as const;

interface FoundationCtaButtonProps {
  href: string;
  variant: keyof typeof ctaButtonVariant;
  fullWidth?: boolean;
  children: string;
}

const FoundationCtaButton = ({ href, variant, fullWidth = false, children }: FoundationCtaButtonProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`${fullWidth ? 'w-full sm:w-auto ' : ''}${ctaButtonBase} ${ctaButtonVariant[variant]}`}
  >
    {children}
  </a>
);

const Foundation = () => {
  return (
    <div className="min-h-screen bg-altivum-dark">
      <SEO
        title="The Altivum Foundation"
        description="The Altivum Foundation is a 501(c)(3) nonprofit funding U.S. military veterans pursuing education in cloud, AI, robotics, and cybersecurity at no cost."
        keywords="The Altivum Foundation, Altivum Foundation, veteran scholarships, 501c3, cloud computing education, AI education, robotics education, cybersecurity education, Christian Perez Founder"
        url="https://thechrisgrey.com/foundation"
        imageAlt="The Altivum Foundation — 501(c)(3) nonprofit funding veteran education in cloud, AI, robotics, and cybersecurity"
        faq={foundationFAQs}
        breadcrumbs={breadcrumbs}
        structuredData={[buildFoundationOrganizationSchema()]}
      />

      {/* Visible breadcrumb trail — mirrors the BreadcrumbList JSON-LD emitted
          by <SEO> above. Ancestors are SPA-transition links; the current page
          carries aria-current="page". */}
      <div className="pt-24 pb-3 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden opacity-0 animate-fade-in">
        <div className="absolute inset-0">
          <ResponsiveImage
            src={foundationImage}
            alt="Veterans pursuing education in technology"
            sizes="100vw"
            className="w-full h-full object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-altivum-dark via-altivum-dark/80 to-altivum-dark/40" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-altivum-gold uppercase tracking-[0.3em] mb-4 sm:mb-6" style={typography.smallText}>
              The Altivum Foundation
            </p>
            <h1 className="text-white mb-6 sm:mb-8" style={typography.heroHeader}>
              Veteran scholarships in AI, Cloud, Robotics &amp; Cybersecurity.
            </h1>
            <div className="h-px w-16 bg-altivum-gold mx-auto mb-6 sm:mb-8" />
            {/* Direct-answer summary — first viewport, before the first H2 (VAL-AEO-001, VAL-AEO-002). */}
            <DirectAnswerSummary text={AEO_SUMMARIES['/foundation']} className="max-w-2xl mx-auto mb-8 sm:mb-10" />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <FoundationCtaButton href={FOUNDATION_URL} variant="gold">
                Visit altivumfoundation.org
              </FoundationCtaButton>
              <FoundationCtaButton href={GIVE_URL} variant="outline">
                Give Now
              </FoundationCtaButton>
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-altivum-gold uppercase tracking-[0.25em] mb-4" style={typography.smallText}>
            Our Vision
          </p>
          <QuestionHeading as="h2" className="mb-6">
            What is the Altivum Foundation's vision?
          </QuestionHeading>
          <div className="h-px w-16 bg-altivum-gold/60 mx-auto mb-8" />
          <p className="text-altivum-silver" style={typography.subtitle}>
            The men and women who served this country bring discipline, adaptability, and leadership forged under
            pressure. The industries shaping the next century — cloud computing, artificial intelligence, robotics, and
            cybersecurity — need exactly those qualities. The Altivum Foundation exists to connect the two.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 md:py-20 bg-altivum-navy/30 border-y border-altivum-slate/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
            <div>
              <p className="text-altivum-gold" style={typography.heroHeader}>
                200K+
              </p>
              <p className="text-altivum-silver mt-2" style={typography.bodyText}>
                Veterans transition out of service annually
              </p>
            </div>
            <div>
              <p className="text-altivum-gold" style={typography.heroHeader}>
                3.5M
              </p>
              <p className="text-altivum-silver mt-2" style={typography.bodyText}>
                Tech jobs unfilled in the United States
              </p>
            </div>
            <div>
              <p className="text-altivum-gold" style={typography.heroHeader}>
                $0
              </p>
              <p className="text-altivum-silver mt-2" style={typography.bodyText}>
                Cost to our scholars
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Focus Areas */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 md:mb-20">
            <p className="text-altivum-gold uppercase tracking-[0.25em] mb-4" style={typography.smallText}>
              Eligible Paths
            </p>
            <QuestionHeading as="h2" className="mb-4">
              What fields does the Foundation fund?
            </QuestionHeading>
            <p className="text-altivum-silver max-w-2xl mx-auto" style={typography.subtitle}>
              Four fields. Each rewards exactly the skills veterans already have.
            </p>
          </div>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 list-none">
            {FOCUS_AREAS.map((area) => (
              <li
                key={area.ordinal}
                className="p-8 bg-altivum-navy/30 border border-altivum-slate/30 rounded-lg hover:border-altivum-gold/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-altivum-gold/5 transition-all duration-300 group"
              >
                <p className="text-altivum-gold/80 mb-3" style={typography.smallText}>
                  {area.ordinal}
                </p>
                <QuestionHeading as="h3" className="mb-4 group-hover:text-altivum-gold transition-colors">
                  {`Why ${area.name}?`}
                </QuestionHeading>
                <p className="text-altivum-silver" style={typography.bodyText}>
                  {area.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Founder tie-in */}
      <section className="py-24 md:py-32 bg-altivum-navy/10">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="border-l-4 border-altivum-gold pl-6 md:pl-8">
            <p className="text-altivum-gold uppercase tracking-[0.25em] mb-3" style={typography.smallText}>
              Founder &amp; President
            </p>
            <QuestionHeading as="h2" className="mb-6">
              Why did I build the Foundation?
            </QuestionHeading>
            <div className="space-y-4">
              <p className="text-altivum-silver" style={typography.bodyText}>
                When I took off the uniform, the path from special operations to cloud architecture was not a roadmap.
                It was a lot of self-funded certifications, late nights, and the sense that a generation of proven
                leaders was being locked out of the industries that needed them most.
              </p>
              <p className="text-altivum-silver" style={typography.bodyText}>
                The Altivum Foundation exists because certification costs are prohibitive and training programs are
                fragmented. The veterans who can lead a team through a combat zone can lead an engineering team through
                a product launch — if someone gives them the technical foundation.
              </p>
              <p className="text-altivum-silver" style={typography.bodyText}>
                This is that foundation. A 501(c)(3) nonprofit (EIN 41-4163272) that funds the education at no cost to
                the scholar, with every contribution fully tax-deductible.
              </p>
            </div>
            <div className="mt-8">
              <ViewTransitionLink
                to="/about"
                className="inline-flex items-center text-altivum-gold hover:text-altivum-gold/80 transition-colors group"
                style={typography.bodyText}
              >
                More about Christian
                <svg
                  className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </ViewTransitionLink>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 bg-linear-to-br from-altivum-navy to-altivum-blue">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <QuestionHeading as="h2" className="mb-6">
            Ready to invest in a veteran's future?
          </QuestionHeading>
          <p className="text-altivum-silver mb-4" style={typography.subtitle}>
            Every contribution is tax-deductible.
          </p>
          <p className="text-altivum-silver/70 mb-10" style={typography.smallText}>
            501(c)(3) &middot; EIN 41-4163272
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <FoundationCtaButton href={GIVE_URL} variant="gold" fullWidth>
              Give Now
            </FoundationCtaButton>
            <FoundationCtaButton href={FOUNDATION_URL} variant="outline" fullWidth>
              Visit altivumfoundation.org
            </FoundationCtaButton>
          </div>
        </div>
      </section>

      {/* Visible FAQ — mirrors the FAQPage JSON-LD emitted by <SEO faq={foundationFAQs}>
          so the DOM text and structured data agree (VAL-AEO-004). */}
      <FAQSection faqs={foundationFAQs} />

      <NewsletterCTA
        source="foundation"
        heading="Want to follow the Foundation?"
        blurb="Updates on veteran grants, program launches, and partnerships. We email rarely and never share your address."
      />

      <CrossLinkBand
        heading="Want to explore more?"
        eyebrow="Keep exploring"
        links={[
          {
            to: '/altivum',
            label: 'Altivum Inc.',
            description:
              'The public benefit corporation whose mission the Foundation extends into veteran opportunity.',
          },
          {
            to: '/about',
            label: 'About Christian',
            description: "The Green Beret-to-founder story behind the Foundation's mission.",
          },
          {
            to: '/beyond-the-assessment',
            label: 'Beyond the Assessment',
            description:
              "Christian's book on leadership, resilience, and the intangibles that define high-stakes success.",
          },
        ]}
      />
    </div>
  );
};

export default Foundation;
