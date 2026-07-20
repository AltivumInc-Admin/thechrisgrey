import { SEO } from '../components/SEO';
import NewsletterCTA from '../components/NewsletterCTA';
import CrossLinkBand from '../components/CrossLinkBand';
import { typography } from '../utils/typography';
import { buildWebPageSchema } from '../utils/schemas';
import claudeHero from '../assets/claude-hero.png';
import claudeBedrockCert from '../assets/claude-bedrock-cert.png';
import { ArchitectureXRay } from '../components/claude/ArchitectureXRay';
import { McpInstallBadge } from '../components/McpInstallBadge';

const Claude = () => {
  const featuredCert = {
    name: 'Claude with Amazon Bedrock',
    issued: 'January 2026',
    verifyUrl: 'https://verify.skilljar.com/c/chryt9ap866c',
  };

  const certGroups = [
    {
      label: 'Building with Claude',
      certs: [
        {
          name: 'Claude with the Anthropic API',
          issued: 'April 2026',
          verifyUrl: 'https://verify.skilljar.com/c/op29b22ona53',
        },
        {
          name: 'Introduction to Subagents',
          issued: 'March 2026',
          verifyUrl: 'https://verify.skilljar.com/c/n7rpsuyzh9ou',
        },
        {
          name: 'Claude Code in Action',
          issued: 'August 2025',
          verifyUrl: 'https://verify.skilljar.com/c/6x2epqfq2d23',
        },
        {
          name: 'Introduction to Model Context Protocol',
          issued: 'August 2025',
          verifyUrl: 'https://verify.skilljar.com/c/tpb2c5g4xf8n',
        },
      ],
    },
    {
      label: 'Claude Foundations',
      certs: [
        {
          name: 'Claude Code 101',
          issued: 'April 2026',
          verifyUrl: 'https://verify.skilljar.com/c/okegg2vghmqi',
        },
        {
          name: 'Claude 101',
          issued: 'March 2026',
          verifyUrl: 'https://verify.skilljar.com/c/3cda366afju7',
        },
        {
          name: 'Introduction to Claude Cowork',
          issued: 'March 2026',
          verifyUrl: 'https://verify.skilljar.com/c/6zjd4w9o9wut',
        },
      ],
    },
    {
      label: 'AI Fluency',
      certs: [
        {
          name: 'AI Fluency for Nonprofits',
          issued: 'March 2026',
          verifyUrl: 'https://verify.skilljar.com/c/9ifn2btkng7p',
        },
        {
          name: 'AI Fluency: Framework & Foundations',
          issued: 'August 2025',
          verifyUrl: 'https://verify.skilljar.com/c/migozd8amwfu',
        },
        {
          name: 'AI Fluency for Educators',
          issued: 'August 2025',
          verifyUrl: 'https://verify.skilljar.com/c/bo34q6bzx5ip',
        },
        {
          name: 'Teaching the AI Fluency Framework',
          issued: 'August 2025',
          verifyUrl: 'https://verify.skilljar.com/c/n526wya3fa69',
        },
      ],
    },
  ];

  const focusAreas = [
    {
      title: 'Conversational AI & RAG',
      description:
        "Designing retrieval-augmented generation systems that ground Claude's responses in domain-specific knowledge. From vector embeddings to real-time streaming, building conversational interfaces that are accurate, fast, and useful.",
      tools: ['Claude API', 'Bedrock Knowledge Bases', 'Titan Embeddings', 'Streaming'],
    },
    {
      title: 'AI-Augmented Development',
      description:
        'Using Claude Code as a force multiplier for full-stack engineering. Automated testing, architecture planning, code review, and iterative development workflows that compress weeks into days.',
      tools: ['Claude Code', 'Agent SDK', 'MCP Servers', 'Automated Testing'],
    },
    {
      title: 'Intelligent Systems Design',
      description:
        "Architecting AI-native applications where Claude isn't bolted on but built in. Guardrails, rate limiting, cost monitoring, and observability as first-class concerns in every system.",
      tools: ['System Prompts', 'Guardrails', 'Observability', 'Cost Optimization'],
    },
  ];

  return (
    <div className="min-h-screen bg-altivum-dark">
      <SEO
        title="Claude"
        description="Christian Perez is an Applied AI Engineer building production systems with Claude, Anthropic's AI. From RAG pipelines to AI-augmented development, designing intelligent applications that solve real problems."
        keywords="Claude AI, Applied AI Engineer, Anthropic, Claude API, Claude Code, RAG systems, AI engineering, Christian Perez AI, Anthropic Academy, Claude certifications"
        url="https://thechrisgrey.com/claude"
        breadcrumbs={[
          { name: 'Home', url: 'https://thechrisgrey.com' },
          { name: 'Claude', url: 'https://thechrisgrey.com/claude' },
        ]}
        structuredData={[
          buildWebPageSchema({
            name: 'Claude - Christian Perez',
            description: 'Christian Perez is an Applied AI Engineer building production systems with Claude.',
            url: 'https://thechrisgrey.com/claude',
          }),
        ]}
      />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden opacity-0 animate-fade-in">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6 sm:mb-8">
              <img
                src={claudeHero}
                alt="Applied — Claude by Anthropic"
                className="w-full max-w-3xl mx-auto opacity-90"
                fetchPriority="high"
              />
              <h1 className="sr-only">Claude - Applied AI Engineer</h1>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="pb-24 md:pb-32 pt-8 md:pt-16">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="mb-20 md:mb-24">
            <p className="text-white/80" style={typography.subtitle}>
              Claude isn't just a tool I use — it's the foundation of the{' '}
              <span className="text-white">AI systems I build</span>. Every conversational interface, every RAG
              pipeline, every intelligent automation at <span className="text-altivum-gold">Altivum Inc.</span> runs on
              Claude.
            </p>
          </div>

          <div className="mb-20 md:mb-24">
            <p className="text-white/80" style={typography.subtitle}>
              From the AI chat on this site — powered by Claude Haiku 4.5 with retrieval-augmented generation — to the
              development workflows that built it, Claude is embedded in how I think about and deliver{' '}
              <span className="text-white">production-grade AI applications</span>.
            </p>
          </div>

          <div className="mb-20 md:mb-24">
            <p className="text-white/80" style={typography.subtitle}>
              This page represents the applied side of AI engineering:{' '}
              <span className="text-white">building real systems</span> that are reliable, observable, and secure — not
              proofs of concept, but software that people use every day.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture X-Ray */}
      <div className="h-px bg-linear-to-r from-transparent via-altivum-gold/15 to-transparent" />
      <ArchitectureXRay />

      {/* MCP Install Badge */}
      <div className="h-px bg-linear-to-r from-transparent via-altivum-gold/15 to-transparent" />
      <McpInstallBadge />

      {/* Focus Areas */}
      <div className="h-px bg-linear-to-r from-transparent via-altivum-gold/15 to-transparent" />
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-white mb-4" style={typography.sectionHeader}>
              What I Build
            </h2>
            <p className="text-altivum-silver max-w-2xl mx-auto" style={typography.subtitle}>
              Production systems powered by Claude
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {focusAreas.map((area, index) => (
              <div
                key={index}
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${0.2 + index * 0.2}s` }}
              >
                <div className="bg-altivum-navy/30 border border-altivum-slate/30 p-8 rounded-lg hover:border-altivum-gold/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-altivum-gold/5 transition-all duration-300 group h-full flex flex-col">
                  <h3
                    className="text-white mb-4 group-hover:text-altivum-gold transition-colors duration-300"
                    style={typography.cardTitleLarge}
                  >
                    {area.title}
                  </h3>
                  <p className="text-altivum-silver mb-6 grow" style={typography.bodyText}>
                    {area.description}
                  </p>
                  <div className="flex flex-wrap gap-2 border-t border-altivum-slate/20 pt-4">
                    {area.tools.map((tool) => (
                      <span
                        key={tool}
                        className="text-xs text-altivum-gold/80 bg-altivum-gold/5 border border-altivum-gold/20 px-3 py-1 rounded-full"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How I Work */}
      <div className="h-px bg-linear-to-r from-transparent via-altivum-gold/15 to-transparent" />
      <section className="py-24 bg-altivum-navy/10">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-white mb-4" style={typography.sectionHeader}>
              How I Work With Claude
            </h2>
          </div>

          <div className="space-y-8">
            <div className="border-l border-altivum-slate/30 pl-8 relative group">
              <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-altivum-slate/50 group-hover:bg-altivum-gold transition-colors duration-300" />
              <h3
                className="text-white mb-2 group-hover:text-altivum-gold transition-colors duration-300"
                style={typography.cardTitleLarge}
              >
                Production First
              </h3>
              <p className="text-altivum-silver" style={typography.bodyText}>
                Every system ships with guardrails, rate limiting, cost monitoring, and observability built in. AI in
                production isn't a demo — it requires the same engineering rigor as any critical infrastructure.
              </p>
            </div>

            <div className="border-l border-altivum-slate/30 pl-8 relative group">
              <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-altivum-slate/50 group-hover:bg-altivum-gold transition-colors duration-300" />
              <h3
                className="text-white mb-2 group-hover:text-altivum-gold transition-colors duration-300"
                style={typography.cardTitleLarge}
              >
                Human in the Loop
              </h3>
              <p className="text-altivum-silver" style={typography.bodyText}>
                Claude augments decision-making — it doesn't replace it. The best AI systems are designed to make people
                more effective, not to remove them from the process. Every system I build keeps humans at the center.
              </p>
            </div>

            <div className="border-l border-altivum-slate/30 pl-8 relative group">
              <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-altivum-slate/50 group-hover:bg-altivum-gold transition-colors duration-300" />
              <h3
                className="text-white mb-2 group-hover:text-altivum-gold transition-colors duration-300"
                style={typography.cardTitleLarge}
              >
                Full-Stack AI
              </h3>
              <p className="text-altivum-silver" style={typography.bodyText}>
                From prompt engineering and system design to frontend streaming and infrastructure — I own the entire
                stack. Claude Code accelerates every layer, from architecture planning to automated test generation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Anthropic Academy */}
      <div className="h-px bg-linear-to-r from-transparent via-altivum-gold/15 to-transparent" />
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-white mb-4" style={typography.sectionHeader}>
              Anthropic Academy
            </h2>
            <div className="h-px w-24 bg-altivum-gold mx-auto mb-6"></div>
            <p className="text-altivum-silver" style={typography.bodyText}>
              Certifications completed through Anthropic's training program
            </p>
          </div>

          {/* Featured Certification */}
          <div className="p-6 sm:p-8 rounded-lg border border-white/10 bg-white/5 mb-8">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center">
              <div className="w-full md:w-1/2 rounded-lg overflow-hidden shadow-lg shrink-0">
                <img
                  src={claudeBedrockCert}
                  alt="Certificate of Completion — Claude with Amazon Bedrock"
                  className="w-full h-auto block"
                />
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="inline-block px-3 py-1 bg-altivum-gold/20 rounded-sm text-xs font-medium text-altivum-gold mb-3">
                  Featured
                </div>
                <h3 className="text-white mb-1" style={typography.cardTitleLarge}>
                  {featuredCert.name}
                </h3>
                <p className="text-altivum-silver/60 text-sm mb-2">
                  Where AWS Community Builder meets Applied AI Engineering
                </p>
                <p className="text-altivum-silver text-xs mb-4">Issued {featuredCert.issued}</p>
                <a
                  href={featuredCert.verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-altivum-gold/80 hover:text-altivum-gold border border-altivum-gold/20 hover:border-altivum-gold/40 rounded-sm transition-all duration-200"
                >
                  Verify
                  <span className="material-icons text-sm">open_in_new</span>
                </a>
              </div>
            </div>
          </div>

          {/* Other Certifications — grouped by theme */}
          <div className="space-y-14">
            {certGroups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-altivum-gold/70 text-[11px] uppercase tracking-[0.25em]">{group.label}</span>
                  <div className="flex-1 h-px bg-altivum-slate/15" />
                </div>

                <ul>
                  {group.certs.map((cert) => (
                    <li key={cert.name}>
                      <a
                        href={cert.verifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Verify ${cert.name} certification`}
                        className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-6 py-3.5 px-4 -mx-4 rounded-md group hover:bg-altivum-gold/4 transition-colors duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4 min-w-0">
                          <h4
                            className="text-white/90 group-hover:text-altivum-gold transition-colors duration-200"
                            style={typography.cardTitleSmall}
                          >
                            {cert.name}
                          </h4>
                          <span className="text-altivum-silver/40 text-xs shrink-0">Issued {cert.issued}</span>
                        </div>
                        <span className="text-altivum-gold/50 group-hover:text-altivum-gold transition-colors duration-200 inline-flex items-center gap-1 text-xs shrink-0">
                          Verify
                          <span className="material-icons" style={{ fontSize: '12px' }}>
                            open_in_new
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <NewsletterCTA
        source="claude"
        heading="Build with Claude, in your inbox"
        blurb="Notes on shipping agentic systems with Claude, Bedrock, and the Model Context Protocol. Practical patterns, no hype."
      />

      <CrossLinkBand
        heading="Explore more"
        eyebrow="Keep exploring"
        links={[
          {
            to: '/aws',
            label: 'AWS Work',
            description: 'The cloud-native architecture that hosts these Claude-powered agents on Amazon Bedrock.',
          },
          {
            to: '/altivum',
            label: 'Altivum Inc.',
            description: 'The production AI systems where these Claude patterns are applied every day.',
          },
          {
            to: '/about',
            label: 'About Christian',
            description: 'How a Green Beret medic became an Anthropic Academy-certified AI builder.',
          },
        ]}
      />
    </div>
  );
};

export default Claude;
