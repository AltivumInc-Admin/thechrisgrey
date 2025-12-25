import { SEO } from '../components/SEO';
import btaLogo from '../assets/bta.png';
import readingImage from '../assets/reading.jpeg';
import { typography } from '../utils/typography';
import { bookFAQs, buildBookSchema } from '../utils/schemas';

const BeyondTheAssessment = () => {
  return (
    <div className="min-h-screen bg-altivum-dark">
      <SEO
        title="Beyond the Assessment"
        description="Beyond the Assessment: A book by Christian Perez exploring leadership, resilience, and the intangible qualities that define success in high-stakes environments. Available on Amazon."
        keywords="Beyond the Assessment, Christian Perez book, leadership book, special operations leadership, resilience, Green Beret author, military leadership"
        url="https://thechrisgrey.com/beyond-the-assessment"
        type="book"
        faq={bookFAQs}
        breadcrumbs={[
          { name: "Home", url: "https://thechrisgrey.com" },
          { name: "Beyond the Assessment", url: "https://thechrisgrey.com/beyond-the-assessment" }
        ]}
        structuredData={[buildBookSchema()]}
      />

      {/* Hero Section - Standard Style */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden opacity-0 animate-fade-in">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6 sm:mb-8">
              <img
                src={btaLogo}
                alt="Beyond the Assessment"
                className="w-full max-w-3xl mx-auto opacity-90"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="pb-24 md:pb-32 lg:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Image Column */}
            <div className="relative opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-lg overflow-hidden shadow-2xl border border-altivum-silver/10 group">
                <div className="absolute inset-0 bg-altivum-blue/10 group-hover:bg-transparent transition-colors duration-500"></div>
                <img
                  src={readingImage}
                  alt="Christian Perez reading Beyond the Assessment"
                  className="w-full h-auto object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>
              {/* Decorative Quote Card */}
              <div className="hidden lg:block absolute -bottom-12 -right-12 max-w-xs bg-altivum-navy p-6 rounded-lg border border-altivum-gold/20 shadow-xl">
                <p className="text-altivum-gold italic text-sm leading-relaxed" style={typography.bodyText}>
                  "Control the controllable. Influence the variables."
                </p>
                <p className="text-white/60 text-xs mt-3 uppercase tracking-wider">— Christian Perez</p>
              </div>
            </div>

            {/* Text Column */}
            <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <h2 className="text-white mb-6" style={typography.sectionHeader}>
                You Are Always <span className="text-altivum-gold">Being Assessed</span>
              </h2>

              <div className="space-y-6 text-white/80" style={typography.subtitle}>
                <p>
                  "Men, congratulations on the success you have achieved here after a challenging 21 days. Own it. Enjoy it. Celebrate it. You’ve earned that much."
                </p>
                <p>
                  These words marked the end of Special Forces Assessment and Selection (SFAS)—a 21-day back-breaking, knee-buckling job interview shrouded in secrecy. But the most important lesson wasn't about the physical feat; it was the warning that followed:
                </p>
                <p className="text-white font-medium border-l-2 border-altivum-gold pl-4 italic">
                  "Do not make the catastrophic mistake of forgetting the following: you are always being assessed."
                </p>
                <p>
                  <em>Beyond the Assessment</em> explores the intangible qualities that define true leadership and resilience. It bridges the gap between tactical precision and human connection, challenging you to prove—every day—that you have the character and capability to excel.
                </p>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <a
                  href="https://a.co/d/iC9TEDW"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-4 bg-altivum-gold hover:bg-amber-400 text-altivum-dark font-bold rounded-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-altivum-gold/20 min-w-[200px]"
                >
                  <span>Order on Amazon</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BeyondTheAssessment;
