import ViewTransitionLink from '../components/ViewTransitionLink';
import { SEO } from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import NewsletterCTA from '../components/NewsletterCTA';
import CrossLinkBand from '../components/CrossLinkBand';
import ResponsiveImage from '../components/ResponsiveImage';
import altivumImage from '../assets/altivum.jpg?responsive';
import awsPartnerLogo from '../assets/aws-partner-dark.png?responsive';
import altivumLogo from '../assets/altivum.png?responsive';
import { typography } from '../utils/typography';
import { altivumFAQs, buildAltivumServicesSchemas } from '../utils/schemas';
import DirectAnswerSummary from '../components/aeo/DirectAnswerSummary';
import FAQSection from '../components/aeo/FAQSection';
import QuestionHeading from '../components/aeo/QuestionHeading';
import { AEO_SUMMARIES } from '../data/aeoSummaries';

const breadcrumbs = [
  { name: 'Home', url: 'https://thechrisgrey.com' },
  { name: 'Altivum', url: 'https://thechrisgrey.com/altivum' },
];

const IMPERATIVES = [
  {
    title: 'Advance AI through real-world application',
    description:
      'We deploy AI into high-stakes, real-world environments, not just to test performance, but to expand its frontier by solving problems that matter.',
  },
  {
    title: 'Strengthen human-machine integration',
    description:
      'We integrate AI with the decisiveness, adaptability, and mission-first mindset of veterans, creating systems that think fast, act smart, and align with human intent.',
  },
  {
    title: 'Position veterans as strategic leaders',
    description:
      'We equip veterans to lead the charge, not just as users of autonomous technology, but as architects, commanders, and ethical stewards of the AI-driven future.',
  },
];

const Altivum = () => {
  const timelineItems = [
    {
      title: 'Why does Altivum exist?',
      preview: "Why Altivum exists and the future I'm building",
      content: (
        <div className="space-y-4">
          <p className="text-altivum-silver" style={typography.bodyText}>
            Altivum™ Inc. is a veteran-founded technology firm building intelligent, cloud-native architectures that
            integrate AI at the core of their operations. Our mission is to engineer artificial intelligence systems
            that empower people and organizations to adapt and excel.
          </p>
          <p className="text-altivum-silver" style={typography.bodyText}>
            From local business enablement to national mission alignment, we translate real-world experience into
            transformative digital solutions. Designed to operate at speed, serve with integrity, and endure.
          </p>
          <p className="text-altivum-silver" style={typography.bodyText}>
            Our technology bridges military precision with civilian innovation, creating systems that empower veterans
            to lead in any environment. We transform experience into advantage through intelligence, structure, and
            measurable impact.
          </p>
          <div className="mt-6 p-4 bg-altivum-navy/30 rounded-lg border-l-4 border-altivum-gold">
            <p className="text-altivum-gold italic" style={typography.bodyText}>
              "We deploy AI into high-stakes, real-world environments, not just to test performance, but to expand its
              frontier by solving problems that matter."
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'How does Altivum build for impact?',
      preview: 'Three imperatives that drive everything we build',
      content: (
        <div className="space-y-4">
          <p className="text-altivum-silver" style={typography.bodyText}>
            In February 2025, I made a deliberate choice: Altivum would be a Public Benefit Corporation because
            profitability and public benefit are not mutually exclusive.
          </p>
          <h4 className="text-white mt-6" style={typography.cardTitleSmall}>
            Our Imperatives
          </h4>
          <ul className="space-y-3">
            {IMPERATIVES.map((imperative) => (
              <li key={imperative.title} className="flex items-start text-altivum-silver" style={typography.bodyText}>
                <span className="text-altivum-gold mr-3 mt-1">→</span>
                <div>
                  <span className="font-semibold text-white">{imperative.title}:</span> {imperative.description}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-altivum-silver mt-6" style={typography.bodyText}>
            These imperatives guide every line of code, every deployment, and every partnership. They define who we are
            and what we're building.
          </p>
        </div>
      ),
    },
    {
      title: 'What is the road ahead for Altivum?',
      preview: 'Operational excellence criteria that define our standard',
      content: (
        <div className="space-y-4">
          <p className="text-altivum-silver" style={typography.bodyText}>
            The goal is to be the hub of Cloud and AI architecture, inference, and data in Clarksville and the
            surrounding areas. We're building the technical infrastructure and talent pipeline that positions this
            region as a center of excellence for intelligent systems and cloud-native solutions.
          </p>
          <h4 className="text-white mt-6" style={typography.cardTitleSmall}>
            Operational Excellence Criteria
          </h4>
          <ul className="space-y-3">
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Accuracy:</span> Every system must deliver reliable,
                verifiable outputs, whether it's a semantic summary, alignment score, or chatbot response.
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Effectiveness:</span> Features must produce meaningful
                outcomes for the user. If it doesn't move the mission forward, it doesn't ship.
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Efficient Use of Resources:</span> Infrastructure, compute,
                and development time must be optimized. Lean execution is not optional. It's a principle.
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Security:</span> From data handling to IAM policies, all
                systems must be secure by design. Veterans entrust Altivum with sensitive transitions. That trust must
                be earned and defended.
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Scalability:</span> Every feature must be architected to
                grow, from a single veteran to an enterprise or federal deployment, without rework.
              </div>
            </li>
          </ul>
          <div className="mt-6 p-4 bg-altivum-gold/10 rounded-lg border border-altivum-gold/30">
            <p className="text-altivum-silver" style={typography.bodyText}>
              <span className="font-semibold text-white">My Legacy:</span> Empowerment. Emblematic of the first SOF
              Truth, Altivum is built on the principle that humans are more important than hardware. People—not
              equipment—make the critical difference. The right people, highly trained and working as a team, will
              accomplish the mission with the equipment available. The best technology in the world cannot compensate
              for a lack of the right people.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-altivum-dark">
      <SEO
        title="Altivum Inc."
        description="Altivum Inc. is a veteran-founded public benefit corporation building intelligent, cloud-native architectures. Three divisions: Vanguard, Logic, and Press."
        keywords="Altivum Inc, Altivum Logic, Altivum Vanguard, Altivum Press, VetROI, Elo, Cloud Architecture, AI Integration, Christian Perez, veteran entrepreneur"
        url="https://thechrisgrey.com/altivum"
        imageAlt="Altivum Inc. — veteran-founded public benefit corporation building cloud-native AI architectures"
        faq={altivumFAQs}
        breadcrumbs={breadcrumbs}
        structuredData={[...buildAltivumServicesSchemas()]}
      />

      {/* Visible breadcrumb trail — mirrors the BreadcrumbList JSON-LD emitted
          by <SEO> above. Ancestors are SPA-transition links; the current page
          carries aria-current="page". */}
      <div className="pt-24 pb-3 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} />
      </div>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden opacity-0 animate-fade-in">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6 sm:mb-8">
              <ResponsiveImage
                src={altivumLogo}
                alt="Altivum Inc."
                sizes="(min-width: 768px) 768px, 100vw"
                className="w-full max-w-3xl mx-auto opacity-90"
                priority
              />
              <h1 className="sr-only">Altivum Inc. - Veteran-Founded AI Technology Company</h1>
            </div>
            {/* Direct-answer summary — first viewport, before the first H2 (VAL-AEO-001, VAL-AEO-002). */}
            <DirectAnswerSummary text={AEO_SUMMARIES['/altivum']} className="max-w-2xl mx-auto mt-6" />
          </div>
        </div>

        {/* AWS Partner Logo - Bottom Right */}
        <div className="absolute bottom-8 right-8 z-20">
          <ResponsiveImage
            src={awsPartnerLogo}
            alt="AWS Partner"
            sizes="80px"
            className="w-20 h-20 object-contain opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>

        {/* Chamber Recognition - Bottom Left */}
        <a
          href="https://www.clarksvilleonline.com/2025/12/12/clarksville-area-chamber-of-commerces-veteran-business-of-the-month-altivum-inc/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Veteran Business of the Month — Clarksville Chamber, December 2025 (opens in new tab)"
          className="absolute bottom-8 left-8 z-20 text-xs text-altivum-silver/60 hover:text-altivum-gold transition-colors"
        >
          Veteran Business of the Month
          <span className="block text-[10px] text-altivum-silver/40">Clarksville Chamber - Dec 2025</span>
        </a>
      </section>

      {/* Company Structure Visualization */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <QuestionHeading as="h2" className="mb-4">
              What is the Altivum ecosystem?
            </QuestionHeading>
            <p className="text-altivum-silver max-w-2xl mx-auto" style={typography.subtitle}>
              A unified structure designed for impact
            </p>
          </div>

          <div className="relative">
            {/* Connecting Lines (Desktop) */}
            <div className="hidden md:block absolute top-12 left-1/2 -translate-x-1/2 w-3/4 h-24 border-t border-l border-r border-altivum-gold/30 rounded-t-3xl -z-10"></div>
            <div className="hidden md:block absolute top-12 left-1/2 -translate-x-1/2 w-px h-12 bg-altivum-gold/30 -z-10"></div>

            {/* HQ Node */}
            <div className="flex justify-center mb-16 md:mb-24 relative z-10">
              <div className="bg-altivum-dark border border-altivum-gold/50 px-8 py-6 rounded-lg text-center min-w-[200px] shadow-[0_0_30px_rgba(197,165,114,0.1)]">
                <h3
                  id="altivum-hq"
                  className="text-altivum-gold font-semibold tracking-widest uppercase"
                  style={typography.cardTitleSmall}
                >
                  Altivum HQ
                </h3>
                <p className="text-altivum-silver mt-2" style={typography.smallText}>
                  Strategic Core
                </p>
              </div>
            </div>

            {/* Branches */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 lg:gap-8">
              {/* Vanguard */}
              <div className="flex flex-col items-center opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="hidden md:block w-px h-12 bg-altivum-gold/30 mb-4"></div>
                <div className="bg-altivum-navy/30 border border-altivum-slate/30 p-6 rounded-lg w-full max-w-sm hover:border-altivum-gold/30 transition-colors duration-300 group">
                  <h4
                    className="text-white mb-3 group-hover:text-altivum-gold transition-colors"
                    style={typography.cardTitleSmall}
                  >
                    Altivum Vanguard
                  </h4>
                  <p className="text-altivum-silver mb-4" style={typography.bodyText}>
                    Serving the <span className="text-white">veteran population</span>. Empowering those who served with
                    technology and opportunity.
                  </p>
                  <ul
                    className="text-altivum-silver/70 space-y-1 border-t border-altivum-slate/20 pt-3"
                    style={typography.smallText}
                  >
                    <li className="flex items-center">
                      <span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>
                      <a
                        href="https://vetroi.altivum.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-altivum-gold transition-colors"
                      >
                        VetROI™
                      </a>
                    </li>
                    <li className="flex items-center">
                      <span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>
                      <a
                        href="https://elo.altivum.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-altivum-gold transition-colors"
                      >
                        Elo™
                      </a>
                    </li>
                    <li className="flex items-center">
                      <span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>NextMission.ai on Amazon
                      PartyRock
                    </li>
                  </ul>
                </div>
              </div>

              {/* Logic */}
              <div className="flex flex-col items-center opacity-0 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="hidden md:block w-px h-12 bg-altivum-gold/30 mb-4"></div>
                <div className="bg-altivum-navy/30 border border-altivum-slate/30 p-6 rounded-lg w-full max-w-sm hover:border-altivum-gold/30 transition-colors duration-300 group">
                  <h4
                    className="text-white mb-3 group-hover:text-altivum-gold transition-colors"
                    style={typography.cardTitleSmall}
                  >
                    Altivum Logic
                  </h4>
                  <p className="text-altivum-silver mb-4" style={typography.bodyText}>
                    Serving <span className="text-white">small businesses</span>. Democratizing access to
                    enterprise-grade cloud & AI solutions.
                  </p>
                  <ul
                    className="text-altivum-silver/70 space-y-1 border-t border-altivum-slate/20 pt-3"
                    style={typography.smallText}
                  >
                    <li className="flex items-center">
                      <span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>Web Design
                    </li>
                    <li className="flex items-center">
                      <span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>SEO and AEO
                    </li>
                    <li className="flex items-center">
                      <span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>Cloud Migration
                    </li>
                    <li className="flex items-center">
                      <span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>AI Integration
                    </li>
                  </ul>
                </div>
              </div>

              {/* Press */}
              <div className="flex flex-col items-center opacity-0 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <div className="hidden md:block w-px h-12 bg-altivum-gold/30 mb-4"></div>
                <div className="bg-altivum-navy/30 border border-altivum-slate/30 p-6 rounded-lg w-full max-w-sm hover:border-altivum-gold/30 transition-colors duration-300 group">
                  <h4
                    className="text-white mb-3 group-hover:text-altivum-gold transition-colors"
                    style={typography.cardTitleSmall}
                  >
                    Altivum Press
                  </h4>
                  <p className="text-altivum-silver mb-4" style={typography.bodyText}>
                    The media arm amplifying our message.
                  </p>
                  <ul
                    className="text-altivum-silver/70 space-y-1 border-t border-altivum-slate/20 pt-3"
                    style={typography.smallText}
                  >
                    <li className="flex items-center">
                      <span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>Social Media
                    </li>
                    <li className="flex items-center">
                      <span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>Publications & Books
                    </li>
                    <li className="flex items-center">
                      <span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>Blogs
                    </li>
                    <li className="flex items-center">
                      <span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>The Vector Podcast
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full Screen Image */}
      <section className="relative h-[60vh] overflow-hidden block">
        <ResponsiveImage
          src={altivumImage}
          alt="Altivum Inc. workspace"
          sizes="100vw"
          className="w-full h-full object-cover block opacity-60"
          style={{ objectPosition: 'center 90%' }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-altivum-dark via-transparent to-transparent"></div>
      </section>

      {/* Founder Timeline */}
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <QuestionHeading as="h2" className="mb-4">
              What is Christian Perez's founder journey?
            </QuestionHeading>
          </div>

          {/* Timeline Items */}
          <div className="space-y-8">
            {timelineItems.map((item, index) => (
              <div key={index} className="border-l border-altivum-slate/30 pl-8 relative group">
                <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-altivum-slate/50 group-hover:bg-altivum-gold transition-colors duration-300"></div>

                <div className="mb-4">
                  <QuestionHeading
                    as="h3"
                    className="mb-2 group-hover:text-altivum-gold transition-colors duration-300"
                  >
                    {item.title}
                  </QuestionHeading>
                  <p className="text-altivum-silver/80 italic" style={typography.bodyText}>
                    {item.preview}
                  </p>
                </div>

                <div className="text-altivum-silver/70" style={typography.bodyText}>
                  {item.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <QuestionHeading as="h2" className="mb-6">
              What is Altivum's mission?
            </QuestionHeading>
            <p className="text-altivum-silver" style={typography.subtitle}>
              To engineer artificial intelligence systems that empower people and organizations to adapt and excel. From
              local business enablement to national mission alignment, we translate real-world experience into
              transformative digital solutions.
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-16">
            <QuestionHeading as="h3" className="text-white mb-8 text-center">
              What are Altivum's imperatives?
            </QuestionHeading>
            <div className="space-y-6">
              {IMPERATIVES.map((imperative) => (
                <div
                  key={imperative.title}
                  className="p-6 border border-altivum-slate/20 rounded-lg hover:border-altivum-gold/30 transition-colors duration-300"
                >
                  <h4 className="text-white mb-3" style={typography.cardTitleSmall}>
                    {imperative.title}
                  </h4>
                  <p className="text-altivum-silver/70" style={typography.smallText}>
                    {imperative.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Learn More Section */}
      <section className="py-24 bg-altivum-navy/10">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <QuestionHeading as="h2" className="mb-6">
            Want to learn more about Altivum?
          </QuestionHeading>
          <div className="flex flex-col sm:flex-row gap-6 justify-center mt-12">
            <a
              href="https://altivum.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-altivum-gold text-altivum-dark font-semibold rounded-sm hover:bg-altivum-gold/90 hover:shadow-[0_0_20px_rgba(197,165,114,0.3)] active:scale-[0.98] transition-all duration-300 touch-manipulation min-h-[48px]"
            >
              Visit Altivum.ai
            </a>
            <ViewTransitionLink
              to="/contact"
              className="inline-block px-8 py-4 bg-transparent border border-altivum-gold text-altivum-gold font-semibold rounded-sm hover:bg-altivum-gold/10 active:scale-[0.98] transition-all duration-300 touch-manipulation min-h-[48px]"
            >
              Get in Touch
            </ViewTransitionLink>
          </div>
        </div>
      </section>

      {/* Visible FAQ — mirrors the FAQPage JSON-LD emitted by <SEO faq={altivumFAQs}>
          so the DOM text and structured data agree (VAL-AEO-004). */}
      <FAQSection faqs={altivumFAQs} />

      <NewsletterCTA
        source="altivum"
        heading="Follow Altivum's build"
        blurb="I share field notes on engineering AI systems, veteran opportunity, and the road from Special Operations to startup life. Get new pieces in your inbox."
      />

      <CrossLinkBand
        heading="Explore more"
        eyebrow="Keep exploring"
        links={[
          {
            to: '/foundation',
            label: 'Altivum Foundation',
            description:
              'The nonprofit arm investing in veteran futures across cloud, AI, robotics, and cybersecurity.',
          },
          {
            to: '/aws',
            label: 'AWS Work',
            description: "Christian's AWS Community Builder practice in AI engineering and cloud-native architecture.",
          },
          {
            to: '/about',
            label: 'About Christian',
            description: 'The journey from Green Beret medic to founder and CEO of Altivum Inc.',
          },
        ]}
      />
    </div>
  );
};

export default Altivum;
