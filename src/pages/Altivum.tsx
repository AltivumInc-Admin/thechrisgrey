import { Link } from 'react-router-dom';
import { useState } from 'react';
import altivumImage from '../assets/altivum.jpg';
import awsPartnerLogo from '../assets/aws-partner-dark.png';
import altivumLogo from '../assets/altivum.png';
import { typography } from '../utils/typography';

const Altivum = () => {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const toggleSection = (index: number) => {
    setExpandedSection(expandedSection === index ? null : index);
  };

  const timelineItems = [
    {
      title: "The Vision",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      preview: "Why Altivum exists and the future I'm building",
      content: (
        <div className="space-y-4">
          <p className="text-altivum-silver" style={typography.bodyText}>
            After years of service, I saw a critical gap: veterans transitioning to civilian life
            lacked access to the cutting-edge technology that could amplify their skills, and small
            businesses were priced out of the cloud and AI revolution that could transform their operations.
          </p>
          <p className="text-altivum-silver" style={typography.bodyText}>
            Altivum isn't just a company—it's my mission to democratize access to world-class technology.
            I believe that the discipline, adaptability, and problem-solving mindset forged in military
            service translates directly to building resilient, innovative businesses.
          </p>
          <p className="text-altivum-silver" style={typography.bodyText}>
            My vision is simple: create a technology company that serves with the same commitment we
            brought to the battlefield. Every line of code, every cloud deployment, every AI integration
            is an opportunity to empower those who've been left behind by the traditional tech industry.
          </p>
          <div className="mt-6 p-4 bg-altivum-navy/30 rounded-lg border-l-4 border-altivum-gold">
            <p className="text-altivum-gold italic" style={typography.bodyText}>
              "Technology should be a force multiplier for everyone—not just those who can afford
              enterprise solutions. That's the future I'm building with Altivum."
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Building for Impact",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      preview: "How I'm building a company that serves with purpose",
      content: (
        <div className="space-y-4">
          <p className="text-altivum-silver" style={typography.bodyText}>
            In February 2025, I made a deliberate choice: Altivum would be a Public Benefit Corporation.
            This wasn't just a legal designation—it was a commitment that profit would never come before
            people. Every business decision is measured not just by revenue, but by the veterans employed,
            the small businesses empowered, and the communities strengthened.
          </p>
          <h4 className="text-white mt-6" style={typography.cardTitleSmall}>My Approach to Building</h4>
          <ul className="space-y-3">
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Service First:</span> Every product we build
                starts with asking "Who are we serving?" and "What problem are we solving for them?"
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Veteran-Led Team:</span> I'm building a team
                of veterans who bring operational excellence, mission focus, and unwavering commitment
                to every engagement.
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Accessible Pricing:</span> Premium technology
                at prices small businesses can afford. We're proving you don't need VC funding to access
                enterprise-grade infrastructure.
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Education & Empowerment:</span> Through Altivum
                Press and VetROI, I'm not just selling services—I'm teaching people to fish, giving them
                the knowledge to succeed independently.
              </div>
            </li>
          </ul>
          <p className="text-altivum-silver mt-6" style={typography.bodyText}>
            I've watched too many talented veterans struggle in transition, and too many small businesses
            fail because they couldn't compete in the digital economy. Altivum is my way of changing that narrative.
          </p>
        </div>
      )
    },
    {
      title: "The Road Ahead",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      preview: "Where I'm taking Altivum and the legacy I'm building",
      content: (
        <div className="space-y-4">
          <p className="text-altivum-silver" style={typography.bodyText}>
            In five years, I envision Altivum as the go-to platform for veteran entrepreneurs and small
            businesses seeking to compete in the AI era. Not the biggest company, but the most impactful—measured
            in lives changed, businesses saved, and communities strengthened.
          </p>
          <h4 className="text-white mt-6" style={typography.cardTitleSmall}>What Success Looks Like</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-altivum-navy/30 rounded-lg">
              <div className="text-altivum-gold mb-2" style={typography.cardTitleLarge}>1,000+</div>
              <p className="text-altivum-silver" style={typography.smallText}>Veterans successfully transitioned to tech careers</p>
            </div>
            <div className="p-4 bg-altivum-navy/30 rounded-lg">
              <div className="text-altivum-gold mb-2" style={typography.cardTitleLarge}>5,000+</div>
              <p className="text-altivum-silver" style={typography.smallText}>Small businesses using our cloud infrastructure</p>
            </div>
            <div className="p-4 bg-altivum-navy/30 rounded-lg">
              <div className="text-altivum-gold mb-2" style={typography.cardTitleLarge}>$50M+</div>
              <p className="text-altivum-silver" style={typography.smallText}>Saved by clients vs. traditional platforms</p>
            </div>
            <div className="p-4 bg-altivum-navy/30 rounded-lg">
              <div className="text-altivum-gold mb-2" style={typography.cardTitleLarge}>100%</div>
              <p className="text-altivum-silver" style={typography.smallText}>Commitment to our PBC mission</p>
            </div>
          </div>
          <h4 className="text-white mt-6" style={typography.cardTitleSmall}>On the Horizon</h4>
          <ul className="space-y-3">
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">▸</span>
              <div>
                <span className="font-semibold text-white">Altivum Vanguard Launch:</span> Revolutionizing
                how companies hire veterans with AI-powered matching and skills translation
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">▸</span>
              <div>
                <span className="font-semibold text-white">VetROI Expansion:</span> Partnering with
                transition programs to provide free career guidance to every separating service member
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">▸</span>
              <div>
                <span className="font-semibold text-white">Altivum Academy:</span> Free technology
                training programs for veterans and military spouses entering the tech industry
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">▸</span>
              <div>
                <span className="font-semibold text-white">Strategic Partnerships:</span> Collaborating
                with organizations that share our mission to democratize technology access
              </div>
            </li>
          </ul>
          <div className="mt-6 p-4 bg-altivum-gold/10 rounded-lg border border-altivum-gold/30">
            <p className="text-altivum-silver" style={typography.bodyText}>
              <span className="font-semibold text-white">My Legacy:</span> I don't want to build just
              another tech company. I want to create a model that proves business can be a force for good—that
              serving your community and building a sustainable company aren't mutually exclusive. If Altivum
              inspires even one other veteran to start a mission-driven company, we've succeeded.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden opacity-0 animate-fade-in">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-altivum-dark via-altivum-navy to-altivum-blue opacity-50"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6 sm:mb-8">
              <img
                src={altivumLogo}
                alt="Altivum Inc."
                className="w-full max-w-3xl mx-auto"
              />
            </div>
          </div>
        </div>

        {/* AWS Partner Logo - Bottom Right */}
        <div className="absolute bottom-8 right-8 z-20">
          <img
            src={awsPartnerLogo}
            alt="AWS Partner"
            className="w-20 h-20 object-contain"
          />
        </div>
      </section>

      {/* Full Screen Image */}
      <section className="relative h-screen overflow-hidden block">
        <img
          src={altivumImage}
          alt="Altivum Inc. workspace"
          className="w-full h-full object-cover block"
          style={{ objectPosition: 'center 90%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-altivum-dark/80 via-altivum-dark/40 to-transparent"></div>
      </section>

      {/* Founder Timeline */}
      <section className="py-16 sm:py-20 md:py-24 bg-altivum-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-white mb-4" style={typography.sectionHeader}>
              My Founder Journey
            </h2>
            <div className="h-1 w-24 bg-altivum-gold mx-auto mb-4"></div>
            <p className="text-altivum-silver max-w-2xl mx-auto" style={typography.subtitle}>
              Building Altivum with purpose, vision, and a commitment to serve
            </p>
          </div>

          {/* Timeline Items */}
          <div className="space-y-6">
            {timelineItems.map((item, index) => (
              <div
                key={index}
                className="bg-altivum-navy/80 backdrop-blur-sm rounded-lg border border-altivum-slate/30 overflow-hidden transition-all duration-300 hover:border-altivum-gold/50"
              >
                {/* Timeline Card Header */}
                <button
                  onClick={() => toggleSection(index)}
                  className="w-full p-6 flex items-start gap-4 text-left transition-all duration-200 hover:bg-altivum-navy/60"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center text-altivum-gold">
                    {item.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-white" style={typography.cardTitleLarge}>
                        {item.title}
                      </h3>
                      <svg
                        className={`w-6 h-6 text-altivum-gold flex-shrink-0 transition-transform duration-300 ${
                          expandedSection === index ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="text-altivum-silver mt-2" style={typography.bodyText}>
                      {item.preview}
                    </p>
                  </div>
                </button>

                {/* Expandable Content */}
                <div
                  className={`transition-all duration-500 ease-in-out ${
                    expandedSection === index
                      ? 'max-h-[2000px] opacity-100'
                      : 'max-h-0 opacity-0'
                  } overflow-hidden`}
                >
                  <div className="px-6 pb-6 border-t border-altivum-slate/30 pt-6">
                    {item.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl">
            <h2 className="text-white mb-6" style={typography.sectionHeader}>
              Our Mission
            </h2>
            <div className="h-1 w-16 bg-altivum-gold mb-8"></div>

            <p className="text-altivum-silver mb-6" style={typography.subtitle}>
              Altivum Inc. bridges the technology gap for veterans transitioning to civilian careers
              and small businesses seeking to compete in the digital age. We believe that everyone
              deserves access to world-class cloud infrastructure and AI capabilities.
            </p>

            <p className="text-altivum-silver mb-12" style={typography.bodyText}>
              Our team brings military precision and operational excellence to every engagement,
              ensuring that technology serves as a force multiplier for growth and success.
            </p>

            <h3 className="text-white mb-6" style={typography.cardTitleLarge}>My Core Values</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start text-altivum-silver">
                <svg className="w-6 h-6 text-altivum-gold mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-white mb-1" style={typography.cardTitleSmall}>Service Before Self</h4>
                  <p style={typography.smallText}>Every decision prioritizes those we serve over short-term profits</p>
                </div>
              </div>
              <div className="flex items-start text-altivum-silver">
                <svg className="w-6 h-6 text-altivum-gold mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-white mb-1" style={typography.cardTitleSmall}>Excellence in Execution</h4>
                  <p style={typography.smallText}>Military precision applied to technology and business operations</p>
                </div>
              </div>
              <div className="flex items-start text-altivum-silver">
                <svg className="w-6 h-6 text-altivum-gold mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-white mb-1" style={typography.cardTitleSmall}>Accessibility for All</h4>
                  <p style={typography.smallText}>Enterprise technology shouldn't require enterprise budgets</p>
                </div>
              </div>
              <div className="flex items-start text-altivum-silver">
                <svg className="w-6 h-6 text-altivum-gold mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-white mb-1" style={typography.cardTitleSmall}>Innovation with Purpose</h4>
                  <p style={typography.smallText}>Technology should solve real problems, not create new ones</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learn More Section */}
      <section className="py-24 bg-gradient-to-br from-altivum-navy to-altivum-blue">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-white mb-6" style={typography.sectionHeader}>
            Want to Learn More?
          </h2>
          <p className="text-altivum-silver mb-8" style={typography.subtitle}>
            For information about Altivum's products and services, visit the company website.
            To discuss veteran transition, technology entrepreneurship, or collaboration opportunities,
            feel free to reach out.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://altivum.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-altivum-gold text-altivum-dark font-semibold rounded-md hover:bg-altivum-gold/90 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Visit Altivum.ai
            </a>
            <Link
              to="/contact"
              className="inline-block px-8 py-4 bg-transparent border-2 border-altivum-gold text-altivum-gold font-semibold rounded-md hover:bg-altivum-gold/10 transition-all duration-200"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Altivum;
