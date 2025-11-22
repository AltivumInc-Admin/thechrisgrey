import { Link } from 'react-router-dom';
// import { useState } from 'react';
import { SEO } from '../components/SEO';
import altivumImage from '../assets/altivum.jpg';
import awsPartnerLogo from '../assets/aws-partner-dark.png';
import altivumLogo from '../assets/altivum.png';
import { typography } from '../utils/typography';

const Altivum = () => {
  // const [expandedSection, setExpandedSection] = useState<number | null>(null);
  // const toggleSection = (index: number) => {
  //   setExpandedSection(expandedSection === index ? null : index);
  // };

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
            Altivum™ Inc. is a veteran-founded technology firm building intelligent, cloud-native architectures that integrate AI at the core of their operations. Our mission is to engineer artificial intelligence systems that empower people and organizations to adapt and excel.
          </p>
          <p className="text-altivum-silver" style={typography.bodyText}>
            From local business enablement to national mission alignment, we translate real-world experience into transformative digital solutions. Designed to operate at speed, serve with integrity, and endure.
          </p>
          <p className="text-altivum-silver" style={typography.bodyText}>
            Our technology bridges military precision with civilian innovation, creating systems that empower veterans to lead in any environment. We transform experience into advantage through intelligence, structure, and measurable impact.
          </p>
          <div className="mt-6 p-4 bg-altivum-navy/30 rounded-lg border-l-4 border-altivum-gold">
            <p className="text-altivum-gold italic" style={typography.bodyText}>
              "We deploy AI into high-stakes, real-world environments, not just to test performance, but to expand its frontier by solving problems that matter."
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
      preview: "Three imperatives that drive everything we build",
      content: (
        <div className="space-y-4">
          <p className="text-altivum-silver" style={typography.bodyText}>
            In February 2025, I made a deliberate choice: Altivum would be a Public Benefit Corporation. This wasn't just a legal designation. It was a commitment that profit would never come before people. Every business decision is measured not just by revenue, but by the veterans employed, the small businesses empowered, and the communities strengthened.
          </p>
          <h4 className="text-white mt-6" style={typography.cardTitleSmall}>Our Imperatives</h4>
          <ul className="space-y-3">
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Advance AI through real-world application:</span> We deploy AI into high-stakes, real-world environments, not just to test performance, but to expand its frontier by solving problems that matter.
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Strengthen human-machine integration:</span> We integrate AI with the decisiveness, adaptability, and mission-first mindset of veterans, creating systems that think fast, act smart, and align with human intent.
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Position veterans as strategic leaders:</span> We equip veterans to lead the charge, not just as users of autonomous technology, but as architects, commanders, and ethical stewards of the AI-driven future.
              </div>
            </li>
          </ul>
          <p className="text-altivum-silver mt-6" style={typography.bodyText}>
            These imperatives guide every line of code, every deployment, and every partnership. They define who we are and what we're building.
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
      preview: "Operational excellence criteria that define our standard",
      content: (
        <div className="space-y-4">
          <p className="text-altivum-silver" style={typography.bodyText}>
            The goal is to be the hub of Cloud and AI architecture, inference, and data in Clarksville and the surrounding areas. We're building the technical infrastructure and talent pipeline that positions this region as a center of excellence for intelligent systems and cloud-native solutions.
          </p>
          <h4 className="text-white mt-6" style={typography.cardTitleSmall}>Operational Excellence Criteria</h4>
          <ul className="space-y-3">
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Accuracy:</span> Every system must deliver reliable, verifiable outputs, whether it's a semantic summary, alignment score, or chatbot response.
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Effectiveness:</span> Features must produce meaningful outcomes for the user. If it doesn't move the mission forward, it doesn't ship.
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Efficient Use of Resources:</span> Infrastructure, compute, and development time must be optimized. Lean execution is not optional. It's a principle.
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Security:</span> From data handling to IAM policies, all systems must be secure by design. Veterans entrust Altivum with sensitive transitions. That trust must be earned and defended.
              </div>
            </li>
            <li className="flex items-start text-altivum-silver" style={typography.bodyText}>
              <span className="text-altivum-gold mr-3 mt-1">→</span>
              <div>
                <span className="font-semibold text-white">Scalability:</span> Every feature must be architected to grow, from a single veteran to an enterprise or federal deployment, without rework.
              </div>
            </li>
          </ul>
          <div className="mt-6 p-4 bg-altivum-gold/10 rounded-lg border border-altivum-gold/30">
            <p className="text-altivum-silver" style={typography.bodyText}>
              <span className="font-semibold text-white">My Legacy:</span> I don't want to build just another tech company. I want to create a model that proves business can be a force for good. That serving your community and building a sustainable company aren't mutually exclusive. If Altivum inspires even one other veteran to start a mission-driven company, we've succeeded.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-altivum-dark">
      <SEO
        title="Altivum Inc."
        description="Altivum Inc. is a cloud architecture and AI integration firm founded by Christian Perez. We build resilient, scalable systems for the future."
        keywords="Altivum Inc, Altivum Logic, Altivum Vanguard, Altivum Press, Cloud Architecture, AI Integration, Christian Perez"
        url="https://thechrisgrey.com/altivum"
        structuredData={[
          {
            "@type": "Corporation",
            "name": "Altivum Inc.",
            "url": "https://altivum.ai",
            "logo": "https://altivum.ai/logo.png",
            "description": "A veteran-founded technology firm building intelligent, cloud-native architectures.",
            "founder": {
              "@type": "Person",
              "name": "Christian Perez"
            },
            "slogan": "Intelligence. Structure. Impact.",
            "sameAs": [
              "https://www.linkedin.com/company/altivum",
              "https://github.com/altivum"
            ]
          }
        ]}
      />
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden opacity-0 animate-fade-in">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6 sm:mb-8">
              <img
                src={altivumLogo}
                alt="Altivum Inc."
                className="w-full max-w-3xl mx-auto opacity-90"
              />
            </div>
          </div>
        </div>

        {/* AWS Partner Logo - Bottom Right */}
        <div className="absolute bottom-[12.5rem] right-8 z-20">
          <img
            src={awsPartnerLogo}
            alt="AWS Partner"
            className="w-20 h-20 object-contain opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
      </section>

      {/* Company Structure Visualization */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-white mb-4" style={typography.sectionHeader}>
              The Ecosystem
            </h2>
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
                <h3 className="text-altivum-gold font-semibold tracking-widest uppercase text-lg">Altivum HQ</h3>
                <p className="text-altivum-silver text-sm mt-2">Strategic Core</p>
              </div>
            </div>

            {/* Branches */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 lg:gap-8">
              {/* Vanguard */}
              <div className="flex flex-col items-center opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="hidden md:block w-px h-12 bg-altivum-gold/30 mb-4"></div>
                <div className="bg-altivum-navy/30 border border-altivum-slate/30 p-6 rounded-lg w-full max-w-sm hover:border-altivum-gold/30 transition-colors duration-300 group">
                  <h4 className="text-white text-xl mb-3 group-hover:text-altivum-gold transition-colors">Altivum Vanguard</h4>
                  <p className="text-altivum-silver text-sm leading-relaxed mb-4">
                    Serving the <span className="text-white">veteran population</span>. Empowering those who served with technology and opportunity.
                  </p>
                  <ul className="text-xs text-altivum-silver/70 space-y-1 border-t border-altivum-slate/20 pt-3">
                    <li className="flex items-center">
                      <span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>
                      <a href="https://vetroi.altivum.ai" target="_blank" rel="noopener noreferrer" className="hover:text-altivum-gold transition-colors">VetROI™</a>
                    </li>
                    <li className="flex items-center"><span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>NextMission.ai on Amazon PartyRock</li>
                  </ul>
                </div>
              </div>

              {/* Logic */}
              <div className="flex flex-col items-center opacity-0 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="hidden md:block w-px h-12 bg-altivum-gold/30 mb-4"></div>
                <div className="bg-altivum-navy/30 border border-altivum-slate/30 p-6 rounded-lg w-full max-w-sm hover:border-altivum-gold/30 transition-colors duration-300 group">
                  <h4 className="text-white text-xl mb-3 group-hover:text-altivum-gold transition-colors">Altivum Logic</h4>
                  <p className="text-altivum-silver text-sm leading-relaxed mb-4">
                    Serving <span className="text-white">small businesses</span>. Democratizing access to enterprise-grade cloud & AI solutions.
                  </p>
                  <ul className="text-xs text-altivum-silver/70 space-y-1 border-t border-altivum-slate/20 pt-3">
                    <li className="flex items-center"><span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>Web Design</li>
                    <li className="flex items-center"><span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>SEO and AEO</li>
                    <li className="flex items-center"><span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>Cloud Migration</li>
                    <li className="flex items-center"><span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>AI Integration</li>
                  </ul>
                </div>
              </div>

              {/* Press */}
              <div className="flex flex-col items-center opacity-0 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <div className="hidden md:block w-px h-12 bg-altivum-gold/30 mb-4"></div>
                <div className="bg-altivum-navy/30 border border-altivum-slate/30 p-6 rounded-lg w-full max-w-sm hover:border-altivum-gold/30 transition-colors duration-300 group">
                  <h4 className="text-white text-xl mb-3 group-hover:text-altivum-gold transition-colors">Altivum Press</h4>
                  <p className="text-altivum-silver text-sm leading-relaxed mb-4">
                    The media arm amplifying our message.
                  </p>
                  <ul className="text-xs text-altivum-silver/70 space-y-1 border-t border-altivum-slate/20 pt-3">
                    <li className="flex items-center"><span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>Social Media</li>
                    <li className="flex items-center"><span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>Publications & Books</li>
                    <li className="flex items-center"><span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>Blogs</li>
                    <li className="flex items-center"><span className="w-1 h-1 bg-altivum-gold rounded-full mr-2"></span>The Vector Podcast</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full Screen Image */}
      <section className="relative h-[60vh] overflow-hidden block">
        <img
          src={altivumImage}
          alt="Altivum Inc. workspace"
          className="w-full h-full object-cover block opacity-60"
          style={{ objectPosition: 'center 90%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-altivum-dark via-transparent to-transparent"></div>
      </section>

      {/* Founder Timeline */}
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-white mb-4" style={typography.sectionHeader}>
              My Founder Journey
            </h2>
            <p className="text-altivum-silver max-w-xl mx-auto" style={typography.subtitle}>
              Building with purpose, vision, and a commitment to serve
            </p>
          </div>

          {/* Timeline Items */}
          <div className="space-y-8">
            {timelineItems.map((item, index) => (
              <div
                key={index}
                className="border-l border-altivum-slate/30 pl-8 relative group"
              >
                <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-altivum-slate/50 group-hover:bg-altivum-gold transition-colors duration-300"></div>

                <div className="mb-4">
                  <h3 className="text-white mb-2 group-hover:text-altivum-gold transition-colors duration-300" style={typography.cardTitleLarge}>
                    {item.title}
                  </h3>
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
            <h2 className="text-white mb-6" style={typography.sectionHeader}>
              Our Mission
            </h2>
            <p className="text-altivum-silver" style={typography.subtitle}>
              To engineer artificial intelligence systems that empower people and organizations to adapt and excel. From local business enablement to national mission alignment, we translate real-world experience into transformative digital solutions.
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-16">
            <h3 className="text-white mb-8 text-center" style={typography.cardTitleLarge}>Our Imperatives</h3>
            <div className="space-y-6">
              <div className="p-6 border border-altivum-slate/20 rounded-lg hover:border-altivum-gold/30 transition-colors duration-300">
                <h4 className="text-white mb-3" style={typography.cardTitleSmall}>Advance AI through real-world application</h4>
                <p className="text-altivum-silver/70" style={typography.smallText}>We deploy AI into high-stakes, real-world environments, not just to test performance, but to expand its frontier by solving problems that matter.</p>
              </div>
              <div className="p-6 border border-altivum-slate/20 rounded-lg hover:border-altivum-gold/30 transition-colors duration-300">
                <h4 className="text-white mb-3" style={typography.cardTitleSmall}>Strengthen human-machine integration</h4>
                <p className="text-altivum-silver/70" style={typography.smallText}>We integrate AI with the decisiveness, adaptability, and mission-first mindset of veterans, creating systems that think fast, act smart, and align with human intent.</p>
              </div>
              <div className="p-6 border border-altivum-slate/20 rounded-lg hover:border-altivum-gold/30 transition-colors duration-300">
                <h4 className="text-white mb-3" style={typography.cardTitleSmall}>Position veterans as strategic leaders</h4>
                <p className="text-altivum-silver/70" style={typography.smallText}>We equip veterans to lead the charge, not just as users of autonomous technology, but as architects, commanders, and ethical stewards of the AI-driven future.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learn More Section */}
      <section className="py-24 bg-altivum-navy/10">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-white mb-6" style={typography.sectionHeader}>
            Want to Learn More?
          </h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center mt-12">
            <a
              href="https://altivum.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-altivum-gold text-altivum-dark font-semibold rounded hover:bg-altivum-gold/90 transition-all duration-200"
            >
              Visit Altivum.ai
            </a>
            <Link
              to="/contact"
              className="inline-block px-8 py-4 bg-transparent border border-altivum-gold text-altivum-gold font-semibold rounded hover:bg-altivum-gold/10 transition-all duration-200"
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
