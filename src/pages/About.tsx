import mpbLogo from '../assets/mpb.png';
import { typography } from '../utils/typography';

const About = () => {
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
                src={mpbLogo}
                alt="My Personal Biography"
                className="w-full max-w-3xl mx-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Biography Content */}
      <section className="py-24 md:py-32 lg:py-40 bg-altivum-dark">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          {/* Opening Statement */}
          <div className="mb-16 md:mb-20">
            <p className="text-white" style={typography.sectionHeader}>
              My name is <span className="text-altivum-gold">Christian Perez</span>, and I'm the founder of{' '}
              <span className="text-altivum-gold">Altivum Inc.</span>
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-altivum-gold to-transparent mb-16 md:mb-20"></div>

          {/* Early Life */}
          <div className="mb-12 md:mb-16">
            <p className="text-white/70" style={typography.subtitle}>
              I was born in <span className="text-white">Guatemala City</span> and came to the United States
              with my family when I was two. <span className="text-white">Boston</span> shaped me—from enjoying
              Italian cuisine in the North End to runs along the Charles River, the city's energy became part of who I am.
            </p>
          </div>

          {/* Military Service */}
          <div className="mb-12 md:mb-16 relative pl-6 border-l-4 border-altivum-gold">
            <p className="text-white/70" style={typography.subtitle}>
              In <span className="text-white">2012</span>, I joined the Army and earned my{' '}
              <span className="text-altivum-gold">Green Beret</span> as a Special Forces Medic (18D).
              I was then assigned to 1st Special Forces Group and soon thereafter deployed to{' '}
              <span className="text-white">Afghanistan</span> with SFOD-A 1236, where I was awarded a{' '}
              <span className="text-altivum-gold">Bronze Star</span>. After receiving an Honorable Discharge,
              I wrote <span className="text-white" style={{ fontStyle: 'italic' }}>Beyond the Assessment</span>—a reflection on modern
              masculinity and a dedication to my son, <span className="text-white">Elijah</span>.
            </p>
          </div>

          {/* Career Evolution */}
          <div className="mb-12 md:mb-16">
            <p className="text-white/70" style={typography.subtitle}>
              Throughout my military career, I watched the rapid evolution of computing and artificial intelligence.
              In <span className="text-white">February 2025</span>, I founded{' '}
              <span className="text-altivum-gold">Altivum Inc.</span>, a public benefit corporation
              dedicated to engineering AI systems that <span className="text-white">empower people and
              organizations to adapt and excel</span>.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-altivum-gold to-transparent mb-16 md:mb-20"></div>

          {/* Core Mission */}
          <div className="bg-gradient-to-br from-altivum-navy/40 to-altivum-blue/20 border border-altivum-gold/30 rounded-lg p-8 md:p-10 lg:p-12">
            <p className="text-white mb-6" style={typography.cardTitleLarge}>
              At my core, I'm a <span className="text-altivum-gold">builder</span>.
            </p>
            <p className="text-white/70 mb-6" style={typography.subtitle}>
              I create systems that turn experience into opportunity. I work with veterans, students, and small
              businesses to help them step confidently into a rapidly changing world.
            </p>
            <p className="text-white/70" style={typography.subtitle}>
              I believe the next decade belongs to those who understand how to combine{' '}
              <span className="text-white">human judgment</span> with{' '}
              <span className="text-white">intelligent machines</span>—and my mission is to ensure
              the people I serve are among them.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
