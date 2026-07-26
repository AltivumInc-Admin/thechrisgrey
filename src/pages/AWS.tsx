import { SEO } from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import NewsletterCTA from '../components/NewsletterCTA';
import CrossLinkBand from '../components/CrossLinkBand';
import ResponsiveImage from '../components/ResponsiveImage';
import awsHero from '../assets/aws-hero.png?responsive';
import awsCommunityBuilder from '../assets/aws-community-builder.webp?responsive';
import { typography } from '../utils/typography';
import { buildWebPageSchema, buildCredentialSchema, awsFAQs } from '../utils/schemas';
import { ogImageForUrl } from '../utils/ogCards';
import { InfraTopology } from '../components/aws/InfraTopology';
import DirectAnswerSummary from '../components/aeo/DirectAnswerSummary';
import QuestionHeading from '../components/aeo/QuestionHeading';
import FAQSection from '../components/aeo/FAQSection';
import { AEO_SUMMARIES } from '../data/aeoSummaries';

const breadcrumbs = [
  { name: 'Home', url: 'https://thechrisgrey.com' },
  { name: 'Amazon Web Services', url: 'https://thechrisgrey.com/aws' },
];

const AWS = () => {
  return (
    <div className="min-h-screen bg-altivum-dark">
      <SEO
        title="Amazon Web Services"
        description="Christian Perez is an AWS Community Builder in AI Engineering, building intelligent cloud-native systems with Amazon Bedrock and serverless architectures."
        keywords="AWS Community Builder, AI Engineering, Amazon Bedrock, cloud architecture, serverless, Christian Perez AWS, Amazon Web Services"
        url="https://thechrisgrey.com/aws"
        imageAlt="AWS Community Builder in AI Engineering — Christian Perez"
        breadcrumbs={breadcrumbs}
        faq={awsFAQs}
        structuredData={[
          buildWebPageSchema({
            name: 'Amazon Web Services - Christian Perez',
            description: 'Christian Perez is an AWS Community Builder in AI Engineering.',
            url: 'https://thechrisgrey.com/aws',
            image: ogImageForUrl('https://thechrisgrey.com/aws'),
          }),
          // Page-specific EducationalOccupationalCredential for the visible
          // AWS Community Builder recognition (VAL-SD-006). Sits outside the
          // global Person.hasCredential array so the page asserts the
          // credential it documents.
          buildCredentialSchema({
            name: 'AWS Community Builder — AI Engineering',
            description:
              'Recognized builder in the AI Engineering track of the AWS Community Builders program, awarded by Amazon Web Services.',
            credentialCategory: 'Community Program Membership',
            // The credential's own URL — the AWS Community Builders program page
            // where this recognition is published (VAL-SD-006 requires a url
            // where available).
            url: 'https://aws.amazon.com/developer/community/community-builders/',
            recognizedBy: {
              name: 'Amazon Web Services',
              url: 'https://aws.amazon.com/developer/community/community-builders/',
            },
          }),
        ]}
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
                src={awsHero}
                alt="AWS - AI Engineering"
                sizes="(min-width: 1024px) 1024px, 100vw"
                className="w-full max-w-6xl mx-auto opacity-90"
                priority
              />
              <h1 className="sr-only">Amazon Web Services - AWS Community Builder in AI Engineering</h1>
            </div>
            {/* Direct-answer summary — first viewport, before the first H2 (VAL-AEO-001, VAL-AEO-002). */}
            <DirectAnswerSummary text={AEO_SUMMARIES['/aws']} className="max-w-2xl mx-auto mt-6" />
          </div>
        </div>
      </section>

      {/* Community Builder Banner */}
      <section className="relative overflow-hidden">
        <div className="relative">
          <ResponsiveImage
            src={awsCommunityBuilder}
            alt="Christian Perez - AWS Community Builder"
            sizes="100vw"
            className="w-full h-auto block"
          />
          <div className="absolute inset-0 bg-linear-to-t from-altivum-dark via-transparent to-transparent" />
          <div className="absolute inset-0 bg-linear-to-b from-altivum-dark/40 via-transparent to-transparent" />
        </div>
      </section>

      {/* Introduction */}
      <section className="pb-24 md:pb-32 lg:pb-40 pt-16 md:pt-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="mb-24 md:mb-32 text-center">
            <p className="text-white" style={typography.sectionHeader}>
              AWS <span className="text-altivum-gold">Community Builder</span>
            </p>
            <p className="text-altivum-silver mt-6" style={typography.subtitle}>
              AI Engineering
            </p>
          </div>

          <div className="mb-20 md:mb-24">
            <QuestionHeading as="h2" className="mb-6">
              What is the AWS Community Builders program?
            </QuestionHeading>
            <p className="text-white/80" style={typography.subtitle}>
              The <span className="text-white">AWS Community Builders</span> program provides technical resources,
              mentorship, and networking opportunities to AWS enthusiasts and emerging thought leaders who are
              passionate about sharing knowledge and connecting with the technical community.
            </p>
          </div>

          <div className="mb-20 md:mb-24">
            <QuestionHeading as="h2" className="mb-6">
              How did Christian join the AI Engineering track?
            </QuestionHeading>
            <p className="text-white/80" style={typography.subtitle}>
              I was accepted into the program under the <span className="text-altivum-gold">AI Engineering</span> track,
              reflecting the work I do every day at <span className="text-white">Altivum Inc.</span> — building
              production AI systems on AWS, from RAG-powered conversational agents to serverless inference pipelines and
              intelligent document processing.
            </p>
          </div>

          <div className="mb-20 md:mb-24">
            <QuestionHeading as="h2" className="mb-6">
              What does being a Community Builder mean?
            </QuestionHeading>
            <p className="text-white/80" style={typography.subtitle}>
              This isn't a certification or a partnership. It's a{' '}
              <span className="text-white">recognition of builders</span> — people who are actively creating, learning,
              and sharing in the AWS ecosystem. For me, it's an extension of the same mission: translating complex cloud
              and AI capabilities into real-world impact.
            </p>
          </div>
        </div>
      </section>

      {/* Infrastructure Topology */}
      <div className="h-px bg-linear-to-r from-transparent via-altivum-gold/15 to-transparent" />
      <InfraTopology />

      {/* Visible FAQ — mirrors the FAQPage JSON-LD emitted by <SEO faq={awsFAQs}>
          so the DOM text and structured data agree (VAL-AEO-004, VAL-SD-007). */}
      <FAQSection faqs={awsFAQs} />

      <NewsletterCTA
        source="aws"
        heading="Stay sharp on AWS + AI"
        blurb="Field notes on building with Amazon Bedrock, serverless, and agentic AI on AWS. No spam; unsubscribe anytime."
      />

      <CrossLinkBand
        heading="Explore more"
        eyebrow="Keep exploring"
        links={[
          {
            to: '/claude',
            label: 'Claude in Production',
            description:
              "How Christian ships agentic systems with Anthropic's Claude and the Anthropic Academy certifications behind them.",
          },
          {
            to: '/altivum',
            label: 'Altivum Inc.',
            description: 'The veteran-founded firm where this AWS work becomes production AI for real-world missions.',
          },
          {
            to: '/about',
            label: 'About Christian',
            description: 'From Special Forces medic (18D) to AWS Community Builder in AI engineering.',
          },
        ]}
      />
    </div>
  );
};

export default AWS;
