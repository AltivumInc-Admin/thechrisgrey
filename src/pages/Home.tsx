import { Link } from 'react-router-dom';
import profileImage from '../assets/profile1.jpeg';
import readingImage from '../assets/reading.jpeg';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-altivum-dark via-altivum-navy to-altivum-blue opacity-50"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-serif font-bold text-white leading-tight">
                  Leadership
                  <span className="block text-altivum-gold">Forged in Service</span>
                </h1>
                <div className="h-1 w-24 bg-altivum-gold mx-auto"></div>
              </div>

              <p className="text-xl md:text-2xl text-altivum-silver leading-relaxed">
                From the mountains of Afghanistan to the frontlines of cloud innovation,
                I bridge the gap between military precision and technological advancement.
              </p>

              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  to="/about"
                  className="inline-block px-8 py-4 bg-altivum-gold text-altivum-dark font-semibold rounded-md hover:bg-altivum-gold/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Learn More
                </Link>
                <Link
                  to="/altivum"
                  className="inline-block px-8 py-4 bg-transparent border-2 border-altivum-gold text-altivum-gold font-semibold rounded-md hover:bg-altivum-gold/10 transition-all duration-200"
                >
                  Explore Altivum
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Height Profile Image Section */}
      <section className="relative h-screen overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={profileImage}
            alt="Christian Perez"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-altivum-dark via-transparent to-transparent"></div>
        </div>
      </section>

      {/* Key Pillars Section */}
      <section className="py-24 bg-altivum-navy">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">
              Areas of Impact
            </h2>
            <div className="h-1 w-24 bg-altivum-gold mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Altivum Inc. */}
            <div className="bg-altivum-dark p-8 rounded-lg border border-altivum-slate/30 hover:border-altivum-gold/50 transition-all duration-300">
              <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mb-6">
                <span className="material-icons text-altivum-gold text-3xl">bolt</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-4">
                Altivum Inc.
              </h3>
              <p className="text-altivum-silver leading-relaxed mb-6">
                A Public Benefit Corporation dedicated to empowering veterans and small businesses
                through cloud migration and AI integration.
              </p>
              <Link
                to="/altivum"
                className="inline-flex items-center text-altivum-gold hover:text-altivum-gold/80 font-medium"
              >
                Learn More
                <span className="material-icons ml-2">arrow_forward</span>
              </Link>
            </div>

            {/* The Vector Podcast */}
            <div className="bg-altivum-dark p-8 rounded-lg border border-altivum-slate/30 hover:border-altivum-gold/50 transition-all duration-300">
              <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mb-6">
                <span className="material-icons text-altivum-gold text-3xl">mic</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-4">
                The Vector Podcast
              </h3>
              <p className="text-altivum-silver leading-relaxed mb-6">
                Exploring AI applications across defense technology and local business sectors,
                from military innovation to Main Street commerce.
              </p>
              <Link
                to="/podcast"
                className="inline-flex items-center text-altivum-gold hover:text-altivum-gold/80 font-medium"
              >
                Listen Now
                <span className="material-icons ml-2">arrow_forward</span>
              </Link>
            </div>

            {/* Beyond the Assessment */}
            <div className="bg-altivum-dark p-8 rounded-lg border border-altivum-slate/30 hover:border-altivum-gold/50 transition-all duration-300">
              <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mb-6">
                <span className="material-icons text-altivum-gold text-3xl">menu_book</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-4">
                Beyond the Assessment
              </h3>
              <p className="text-altivum-silver leading-relaxed mb-6">
                A comprehensive guide to transitioning from military service to civilian success,
                drawing from personal experience and proven strategies.
              </p>
              <Link
                to="/about#book"
                className="inline-flex items-center text-altivum-gold hover:text-altivum-gold/80 font-medium"
              >
                Read More
                <span className="material-icons ml-2">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Section - Book */}
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src={readingImage}
                alt="Christian Perez with Beyond the Assessment"
                className="rounded-lg shadow-2xl"
              />
            </div>

            <div className="space-y-6">
              <div className="inline-block px-4 py-2 bg-altivum-gold/20 rounded-md">
                <span className="text-altivum-gold font-semibold text-sm uppercase tracking-wider">
                  Featured Publication
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight">
                Beyond the Assessment
              </h2>

              <p className="text-xl text-altivum-silver leading-relaxed">
                Drawing from years of experience transitioning from Special Forces to the corporate world,
                this book provides a roadmap for veterans seeking meaningful civilian careers.
              </p>

              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="material-icons text-altivum-gold mt-1 mr-3 flex-shrink-0">check_circle</span>
                  <span className="text-altivum-silver">Practical strategies for career transition</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons text-altivum-gold mt-1 mr-3 flex-shrink-0">check_circle</span>
                  <span className="text-altivum-silver">Real-world insights from military to civilian life</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons text-altivum-gold mt-1 mr-3 flex-shrink-0">check_circle</span>
                  <span className="text-altivum-silver">Leveraging military skills in new contexts</span>
                </li>
              </ul>

              <Link
                to="/about#book"
                className="inline-block px-8 py-4 bg-altivum-gold text-altivum-dark font-semibold rounded-md hover:bg-altivum-gold/90 transition-all duration-200"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-altivum-navy to-altivum-blue">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">
            Let's Connect
          </h2>
          <p className="text-xl text-altivum-silver mb-8">
            Whether you're interested in cloud migration, AI integration, or veteran transition services,
            I'm here to help.
          </p>
          <Link
            to="/contact"
            className="inline-block px-8 py-4 bg-altivum-gold text-altivum-dark font-semibold rounded-md hover:bg-altivum-gold/90 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
