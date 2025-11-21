import { SEO } from '../components/SEO';
import btaLogo from '../assets/bta.png';
import readingImage from '../assets/reading.jpeg';

const BeyondTheAssessment = () => {
  return (
    <div className="min-h-screen bg-altivum-dark text-white">
      <SEO
        title="Beyond the Assessment | Christian Perez"
        description="Beyond the Assessment: A book by Christian Perez on leadership, resilience, and the human element in special operations and business."
        keywords="Beyond the Assessment, Christian Perez book, leadership book, special operations leadership, resilience, Green Beret author"
        url="https://thechrisgrey.com/beyond-the-assessment"
        type="article"
      />

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center">
        {/* Background Overlay for mobile readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-altivum-dark/90 via-altivum-dark/80 to-altivum-dark z-10 lg:hidden"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20 py-20 lg:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left Column: Image */}
            <div className="relative order-2 lg:order-1 opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-altivum-blue/20 group">
                <div className="absolute inset-0 bg-altivum-blue/10 group-hover:bg-transparent transition-colors duration-500"></div>
                <img
                  src={readingImage}
                  alt="Christian Perez reading Beyond the Assessment"
                  className="w-full h-auto object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-6 -left-6 w-24 h-24 border-b-2 border-l-2 border-altivum-gold/30 rounded-bl-2xl hidden lg:block"></div>
              <div className="absolute -top-6 -right-6 w-24 h-24 border-t-2 border-r-2 border-altivum-gold/30 rounded-tr-2xl hidden lg:block"></div>
            </div>

            {/* Right Column: Content */}
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <div className="opacity-0 animate-fade-in">
                <img
                  src={btaLogo}
                  alt="Beyond the Assessment Logo"
                  className="w-64 md:w-80 mx-auto lg:mx-0 mb-8 drop-shadow-lg"
                />

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                  The Human Element in <span className="text-transparent bg-clip-text bg-gradient-to-r from-altivum-gold to-amber-300">High Performance</span>
                </h1>

                <p className="text-lg md:text-xl text-altivum-silver mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  In a world obsessed with metrics and data, <em>Beyond the Assessment</em> explores the intangible qualities that define true leadership and resilience. Drawing from experiences in Special Operations and modern business, this book bridges the gap between tactical precision and human connection.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
                  <a
                    href="https://a.co/d/iC9TEDW"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-4 bg-altivum-gold hover:bg-amber-400 text-altivum-dark font-bold rounded-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-altivum-gold/20 flex items-center gap-2 min-w-[200px] justify-center"
                  >
                    <span>Order on Amazon</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </a>
                  <a
                    href="https://altivum.ai/bta"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-4 bg-transparent border border-altivum-silver/30 hover:border-altivum-gold text-altivum-silver hover:text-altivum-gold font-medium rounded-lg transition-all duration-300 min-w-[200px] text-center"
                  >
                    Learn More
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeyondTheAssessment;
