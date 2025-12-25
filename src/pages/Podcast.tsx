import { useEffect } from 'react';
import { typography } from '../utils/typography';
import { SEO } from '../components/SEO';
import tvpLogo from '../assets/tvp.png';
import { podcastFAQs, buildPodcastSeriesSchema } from '../utils/schemas';

const Podcast = () => {
  useEffect(() => {
    // Load Buzzsprout scripts dynamically
    const script1 = document.createElement('script');
    script1.src = 'https://www.buzzsprout.com/2554153/episodes/18199807-empowering-minds-ai-neurodiversity-the-future-of-mental-healthcare-with-jay-getten.js?container_id=buzzsprout-player-18199807&player=small';
    script1.type = 'text/javascript';
    script1.charset = 'utf-8';
    script1.async = true;

    const script2 = document.createElement('script');
    script2.src = 'https://www.buzzsprout.com/2554153/episodes/18141548-ethics-education-and-empathy-in-the-age-of-ai-with-dr-sarah-mendoza.js?container_id=buzzsprout-player-18141548&player=small';
    script2.type = 'text/javascript';
    script2.charset = 'utf-8';
    script2.async = true;

    const container1 = document.getElementById('buzzsprout-player-18199807');
    const container2 = document.getElementById('buzzsprout-player-18141548');

    if (container1) container1.appendChild(script1);
    if (container2) container2.appendChild(script2);

    return () => {
      if (container1 && script1.parentNode) container1.removeChild(script1);
      if (container2 && script2.parentNode) container2.removeChild(script2);
    };
  }, []);


  return (
    <div className="min-h-screen">
      <SEO
        title="The Vector Podcast"
        description="The Vector Podcast, hosted by Christian Perez, explores veteran experience, emerging technology, and purposeful entrepreneurship. Conversations on AI, cloud technology, and innovation."
        keywords="The Vector Podcast, Christian Perez podcast, AI podcast, veteran entrepreneurship, technology podcast, Altivum Press"
        url="https://thechrisgrey.com/podcast"
        faq={podcastFAQs}
        breadcrumbs={[
          { name: "Home", url: "https://thechrisgrey.com" },
          { name: "Podcast", url: "https://thechrisgrey.com/podcast" }
        ]}
        structuredData={[buildPodcastSeriesSchema()]}
      />
      {/* Hero Section */}
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden opacity-0 animate-fade-in">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6 sm:mb-8">
              <img
                src={tvpLogo}
                alt="The Vector Podcast"
                className="w-full max-w-3xl mx-auto opacity-90"
              />
            </div>
          </div>
        </div>
      </section>

      {/* About the Podcast */}
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-white mb-6" style={typography.sectionHeader}>
            About The Vector Podcast
          </h2>
          <div className="h-px w-24 bg-altivum-gold mx-auto mb-8"></div>
          <p className="text-altivum-silver text-lg leading-relaxed" style={typography.subtitle}>
            The Vector Podcast delivers mission-focused conversations at the intersection of veteran experience, small business, and modern technology. We break down artificial intelligence, cloud solutions, and entrepreneurship into clear, actionable insights anyone can apply.
          </p>
        </div>
      </section>

      {/* Latest Episodes */}
      <section className="py-24 bg-altivum-dark border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-white mb-4" style={typography.sectionHeader}>
              Latest Episodes
            </h2>
            <div className="h-px w-24 bg-altivum-gold mx-auto"></div>
          </div>

          <div className="space-y-8">
            {/* Episode 1 */}
            <div className="p-6 rounded-lg border border-white/10 bg-white/5">
              <div
                id="buzzsprout-player-18199807"
              ></div>
            </div>

            {/* Episode 2 */}
            <div className="p-6 rounded-lg border border-white/10 bg-white/5">
              <div
                id="buzzsprout-player-18141548"
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Subscribe Section */}
      <section className="py-24 bg-altivum-dark border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-white mb-6" style={typography.sectionHeader}>
            Listen & Subscribe
          </h2>
          <p className="text-altivum-silver mb-10" style={typography.bodyText}>
            Catch every episode on your favorite platform
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a
              href="https://vector.altivum.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-10 py-4 bg-altivum-gold text-altivum-dark font-semibold hover:bg-white transition-all duration-200"
            >
              <span className="material-icons mr-3">podcasts</span>
              Visit Podcast Website
            </a>
            <a
              href="https://www.youtube.com/@AltivumPress"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-10 py-4 bg-transparent border border-white/20 text-white font-semibold hover:border-altivum-gold hover:text-altivum-gold transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              YouTube Channel
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Podcast;
