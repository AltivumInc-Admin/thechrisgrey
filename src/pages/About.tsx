import afg from '../assets/afg.png';
import horseSoldier from '../assets/horse-soldier.jpeg';
import readingImage from '../assets/reading.jpeg';

const About = () => {
  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-br from-altivum-dark to-altivum-navy">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight">
              From Special Forces to
              <span className="block text-altivum-gold">Strategic Leadership</span>
            </h1>
            <div className="h-1 w-24 bg-altivum-gold mb-8"></div>
            <p className="text-xl text-altivum-silver leading-relaxed">
              My journey spans from the mountains of Afghanistan as a Green Beret to the forefront
              of cloud technology and AI innovation, always driven by a commitment to serve
              veterans and empower small businesses.
            </p>
          </div>
        </div>
      </section>

      {/* Military Service Section */}
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-serif font-bold text-white">
                Military Service
              </h2>
              <div className="h-1 w-16 bg-altivum-gold"></div>

              <div className="space-y-6 text-altivum-silver leading-relaxed">
                <p>
                  As an <span className="text-white font-semibold">18D Special Forces Medical Sergeant</span> with
                  the U.S. Army Green Berets, I served in some of the world's most challenging environments,
                  leading and training indigenous forces while providing critical medical support in austere conditions.
                </p>

                <p>
                  My service was recognized with the <span className="text-altivum-gold font-semibold">Bronze Star</span>,
                  reflecting the dedication and sacrifice that defined my military career. From conducting complex
                  special operations to building relationships with local populations, every mission reinforced
                  the values of adaptability, precision, and unwavering commitment to the team.
                </p>

                <div className="bg-altivum-navy p-6 rounded-lg border border-altivum-slate/30">
                  <h3 className="text-lg font-semibold text-white mb-4">Military Qualifications</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <span className="material-icons text-altivum-gold mr-3">check_circle</span>
                      18D Special Forces Medical Sergeant
                    </li>
                    <li className="flex items-center">
                      <span className="material-icons text-altivum-gold mr-3">check_circle</span>
                      Bronze Star Recipient
                    </li>
                    <li className="flex items-center">
                      <span className="material-icons text-altivum-gold mr-3">check_circle</span>
                      Combat Deployments to Afghanistan
                    </li>
                    <li className="flex items-center">
                      <span className="material-icons text-altivum-gold mr-3">check_circle</span>
                      Foreign Internal Defense Operations
                    </li>
                  </ul>
                </div>

                <div className="bg-altivum-navy p-6 rounded-lg border border-altivum-slate/30">
                  <h3 className="text-lg font-semibold text-white mb-4">Professional Certifications</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <span className="material-icons text-altivum-gold mr-3">check_circle</span>
                      AWS Cloud Practitioner
                    </li>
                    <li className="flex items-center">
                      <span className="material-icons text-altivum-gold mr-3">check_circle</span>
                      AWS AI Practitioner
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-lg shadow-2xl">
                <img
                  src={horseSoldier}
                  alt="Christian Perez as Special Forces soldier on horseback"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="relative overflow-hidden rounded-lg shadow-2xl">
                <img
                  src={afg}
                  alt="Christian Perez in Afghanistan mountains"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-altivum-dark/90 to-transparent p-6">
                  <p className="text-sm text-altivum-silver italic">
                    Afghanistan, 2010 - Mountain operations in challenging terrain
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transition to Leadership */}
      <section className="py-24 bg-altivum-navy">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">
              Civilian Leadership
            </h2>
            <div className="h-1 w-24 bg-altivum-gold mx-auto mb-6"></div>
            <p className="text-xl text-altivum-silver leading-relaxed">
              Transitioning from military service, I applied the same principles of precision,
              adaptability, and service to building innovative solutions in the technology sector.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-altivum-dark p-8 rounded-lg border border-altivum-slate/30">
              <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-altivum-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-4">
                Strategic Vision
              </h3>
              <p className="text-altivum-silver leading-relaxed">
                Developed and implemented strategic initiatives that bridge technology gaps
                for underserved communities, particularly veterans and small businesses.
              </p>
            </div>

            <div className="bg-altivum-dark p-8 rounded-lg border border-altivum-slate/30">
              <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mb-6">
                <span className="material-icons text-altivum-gold text-3xl">groups</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-4">
                Team Building
              </h3>
              <p className="text-altivum-silver leading-relaxed">
                Applied special operations team-building principles to create high-performing
                organizations focused on mission success and continuous improvement.
              </p>
            </div>

            <div className="bg-altivum-dark p-8 rounded-lg border border-altivum-slate/30">
              <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mb-6">
                <span className="material-icons text-altivum-gold text-3xl">lightbulb</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-4">
                Innovation Focus
              </h3>
              <p className="text-altivum-silver leading-relaxed">
                Championing cutting-edge cloud and AI technologies to create competitive
                advantages for organizations of all sizes.
              </p>
            </div>

            <div className="bg-altivum-dark p-8 rounded-lg border border-altivum-slate/30">
              <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mb-6">
                <span className="material-icons text-altivum-gold text-3xl">favorite</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-4">
                Service Mission
              </h3>
              <p className="text-altivum-silver leading-relaxed">
                Committed to giving back through initiatives that empower veterans and support
                small business growth through accessible technology.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Book Section */}
      <section id="book" className="py-24 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src={readingImage}
                alt="Beyond the Assessment book"
                className="rounded-lg shadow-2xl"
              />
            </div>

            <div className="space-y-6">
              <div className="inline-block px-4 py-2 bg-altivum-gold/20 rounded-md">
                <span className="text-altivum-gold font-semibold text-sm uppercase tracking-wider">
                  Author
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight">
                Beyond the Assessment
              </h2>

              <p className="text-xl text-altivum-silver leading-relaxed">
                A comprehensive guide for military service members transitioning to civilian careers,
                based on personal experience and research into successful transitions.
              </p>

              <div className="space-y-4">
                <h3 className="text-2xl font-display font-semibold text-white">
                  What You'll Learn:
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-altivum-gold mt-1 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-altivum-silver">How to translate military experience into civilian career success</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-altivum-gold mt-1 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-altivum-silver">Strategies for navigating the job market and corporate culture</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-altivum-gold mt-1 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-altivum-silver">Building networks and leveraging military connections</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-altivum-gold mt-1 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-altivum-silver">Mental and emotional preparation for life after service</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                <a
                  href="#"
                  className="inline-block px-8 py-4 bg-altivum-gold text-altivum-dark font-semibold rounded-md hover:bg-altivum-gold/90 transition-all duration-200"
                >
                  Get the Book
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
