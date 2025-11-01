import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import profileImage from '../assets/profile1.jpeg';
import heroImage from '../assets/hero2.png';

const Home = () => {
  const [scrollProgress, setScrollProgress] = useState(-1);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      // Calculate which key points should be visible (-1 to 3, where -1 means none visible)
      // Points are evenly distributed across the 200vh summary section (every 50vh)
      const progress = Math.min(Math.floor((scrollPosition - windowHeight) / (windowHeight * 0.5)), 3);
      setScrollProgress(Math.max(-1, progress));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const keyPoints = [
    "Founder & CEO | Altivum Inc",
    "Host | The Vector Podcast",
    "Author | Beyond the Assessment",
    "Former Green Beret | 18D"
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section with fade-in animation */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden opacity-0 animate-fade-in">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-altivum-dark via-altivum-navy to-altivum-blue opacity-50"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <img
                src={heroImage}
                alt="Leadership Forged in Service"
                className="w-full max-w-3xl mx-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Profile Image Section with Scrolling Summary Tabs */}
      <section className="relative h-[300vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={profileImage}
              alt="Christian Perez"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-altivum-dark/80 via-altivum-dark/40 to-transparent"></div>
          </div>

          {/* Left-side Summary Tabs */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 px-6 lg:px-12 space-y-8">
            {keyPoints.map((point, index) => (
              <div
                key={index}
                className={`transition-all duration-700 ${
                  index <= scrollProgress
                    ? 'opacity-100 transform translate-x-0'
                    : 'opacity-0 transform -translate-x-10'
                }`}
              >
                <div className="border-l-4 border-altivum-gold pl-6 py-4">
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">
                    {point.split(' | ')[0]}
                  </h3>
                  <p className="text-lg md:text-xl text-altivum-gold font-medium">
                    {point.split(' | ')[1]}
                  </p>
                </div>
              </div>
            ))}
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
