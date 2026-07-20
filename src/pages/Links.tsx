import type { ReactNode } from 'react';
import { SEO } from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import { typography } from '../utils/typography';
import ViewTransitionLink from '../components/ViewTransitionLink';
import builderQR from '../assets/builder-qr.png';
import { buildProfilePageSchema } from '../utils/schemas';
import { SOCIAL_LINKS } from '../constants/links';
import SocialIcon from '../components/SocialIcon';
import NewsletterCTA from '../components/NewsletterCTA';

const breadcrumbs = [
  { name: 'Home', url: 'https://thechrisgrey.com' },
  { name: 'Links', url: 'https://thechrisgrey.com/links' },
];

interface SocialLink {
  name: string;
  handle: string;
  url: string;
  icon: ReactNode;
}

/**
 * A single social/contact card. Shared by the Personal and Company grids, which
 * were previously byte-identical markup.
 */
const SocialCard = ({ social }: { social: SocialLink }) => (
  <a
    href={social.url}
    target="_blank"
    rel="noopener noreferrer"
    className="block p-6 rounded-lg border border-white/10 hover:border-altivum-gold/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-altivum-gold/5 transition-all duration-300 group bg-transparent"
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 flex items-center justify-center text-altivum-gold/70 group-hover:text-altivum-gold transition-all shrink-0">
        {social.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white group-hover:text-altivum-gold transition-colors" style={typography.cardTitleSmall}>
          {social.name}
        </h3>
        <p className="text-altivum-silver/60 text-xs truncate">{social.handle}</p>
      </div>
      <span className="material-icons text-altivum-silver/30 group-hover:text-altivum-gold group-hover:translate-x-1 transition-all shrink-0 text-sm">
        arrow_forward
      </span>
    </div>
  </a>
);

const Links = () => {
  const websites = [
    {
      name: 'Altivum Inc.',
      url: SOCIAL_LINKS.altivum,
      description: 'Cloud-native AI integration for small businesses',
      category: 'Company',
    },
    {
      name: 'Altivum Logic',
      url: SOCIAL_LINKS.altivumLogic,
      description: 'Multicloud infrastructure & web development services',
      category: 'Product',
    },
    {
      name: 'VetROI',
      url: SOCIAL_LINKS.vetroi,
      description: 'AI-powered veteran career transition tool',
      category: 'Product',
    },
    {
      // No SOCIAL_LINKS entry for Elo \u2014 keep literal until one is added.
      name: 'Elo\u2122',
      url: 'https://elo.altivum.ai',
      description: 'Eloquence & articulation coach for career transition',
      category: 'Product',
    },
  ];

  const personalSocials: SocialLink[] = [
    {
      name: 'AWS Builder',
      handle: 'AWS Community Builder Profile',
      url: SOCIAL_LINKS.awsBuilder,
      icon: <SocialIcon platform="aws" />,
    },
    { name: 'Substack', handle: '@thechrisgrey', url: SOCIAL_LINKS.substack, icon: <SocialIcon platform="substack" /> },
    { name: 'Linktree', handle: '@thechrisgrey', url: SOCIAL_LINKS.linktree, icon: <SocialIcon platform="linktree" /> },
    {
      name: 'Arizona State University',
      handle: 'ASU Search Profile',
      url: SOCIAL_LINKS.asu,
      icon: <SocialIcon platform="asu" />,
    },
    { name: 'Facebook', handle: '@thechrisgrey', url: SOCIAL_LINKS.facebook, icon: <SocialIcon platform="facebook" /> },
    {
      name: 'X (Twitter)',
      handle: '@thechrisgrey',
      url: SOCIAL_LINKS.twitter,
      icon: <SocialIcon platform="twitter" />,
    },
    {
      name: 'LinkedIn',
      handle: 'Christian Perez',
      url: SOCIAL_LINKS.linkedin,
      icon: <SocialIcon platform="linkedin" />,
    },
    { name: 'GitHub', handle: '@AltivumInc-Admin', url: SOCIAL_LINKS.github, icon: <SocialIcon platform="github" /> },
    { name: 'DEV Community', handle: '@thechrisgrey', url: SOCIAL_LINKS.devto, icon: <SocialIcon platform="devto" /> },
    {
      name: 'Email',
      handle: 'christian.perez@altivum.ai',
      url: SOCIAL_LINKS.email,
      icon: <SocialIcon platform="email" />,
    },
  ];

  const companySocials: SocialLink[] = [
    {
      name: 'Facebook',
      handle: 'Altivum Inc.',
      url: SOCIAL_LINKS.altivumFacebook,
      icon: <SocialIcon platform="facebook" />,
    },
    {
      name: 'X (Twitter)',
      handle: '@AltivumAI',
      url: SOCIAL_LINKS.altivumTwitter,
      icon: <SocialIcon platform="twitter" />,
    },
    {
      name: 'LinkedIn',
      handle: 'Altivum Inc.',
      url: SOCIAL_LINKS.altivumLinkedIn,
      icon: <SocialIcon platform="linkedin" />,
    },
    {
      name: 'YouTube',
      handle: '@AltivumPress',
      url: SOCIAL_LINKS.altivumYouTube,
      icon: <SocialIcon platform="youtube" />,
    },
    { name: 'Email', handle: 'info@altivum.ai', url: SOCIAL_LINKS.altivumEmail, icon: <SocialIcon platform="email" /> },
  ];

  return (
    <div className="min-h-screen pt-20">
      <SEO
        title="Links & Resources"
        description="Connect with Christian Perez across the web. Links to Altivum Inc., The Vector Podcast, social media profiles, and featured projects."
        keywords="Christian Perez links, social media, Altivum links, podcast links, thechrisgrey socials"
        url="https://thechrisgrey.com/links"
        breadcrumbs={breadcrumbs}
        structuredData={[
          buildProfilePageSchema({
            name: 'Christian Perez Links & Resources',
            description: 'Connect with Christian Perez across the web. All social profiles and projects in one place.',
            url: 'https://thechrisgrey.com/links',
          }),
        ]}
      />

      {/* Visible breadcrumb trail — mirrors the BreadcrumbList JSON-LD emitted
          by <SEO> above. Ancestors are SPA-transition links; the current page
          carries aria-current="page". The wrapper's `pt-20` clears the fixed
          nav, so this bar only adds bottom spacing before the hero. */}
      <div className="pb-3 max-w-7xl mx-auto px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} />
      </div>
      {/* Hero Section */}
      <section className="py-32 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-4 py-2 bg-altivum-gold/10 rounded-md mb-6">
              <span className="text-altivum-gold font-semibold text-sm uppercase tracking-wider">@thechrisgrey</span>
            </div>
            <h1 className="text-white mb-6" style={typography.heroHeader}>
              All My Links
            </h1>
            <div className="h-px w-24 bg-altivum-gold mx-auto mb-8"></div>

            <p className="text-altivum-silver" style={typography.subtitle}>
              Connect with me across the web. Find all my websites, social profiles, and projects in one place.
            </p>
          </div>
        </div>
      </section>

      <NewsletterCTA
        source="links"
        heading="The one link worth keeping"
        blurb="Social platforms come and go. Join the newsletter and stay connected no matter where the internet moves next."
      />

      {/* AWS Builder Section with QR Code */}
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="p-8 md:p-12 rounded-lg border border-white/10 bg-white/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-block px-3 py-1 bg-altivum-gold/20 rounded-sm text-xs font-medium text-altivum-gold mb-4">
                  Featured
                </div>
                <h2 className="text-white mb-4" style={typography.sectionHeader}>
                  AWS Community Builder
                </h2>
                <div className="h-px w-16 bg-altivum-gold mb-6"></div>
                <p className="text-altivum-silver mb-8" style={typography.bodyText}>
                  Connect with me on AWS Builder to explore my cloud architecture projects, technical insights, and
                  contributions to the AWS community.
                </p>
                <a
                  href="https://builder.aws.com/profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-8 py-4 bg-white text-altivum-dark font-medium hover:bg-altivum-gold transition-all duration-200"
                >
                  View Profile
                  <span className="material-icons ml-2 text-sm">open_in_new</span>
                </a>
              </div>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg shadow-2xl">
                  <img
                    src={builderQR}
                    alt="AWS Builder Profile QR Code"
                    width={512}
                    height={512}
                    loading="lazy"
                    decoding="async"
                    className="w-64 h-64 md:w-72 md:h-72"
                  />
                  <p className="text-center text-xs text-altivum-dark mt-4 font-medium uppercase tracking-widest">
                    Scan to connect
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-linear-to-r from-transparent via-altivum-gold/15 to-transparent" />

      {/* Websites Section */}
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-white mb-4" style={typography.sectionHeader}>
              Websites & Projects
            </h2>
            <div className="h-px w-16 bg-altivum-gold"></div>
          </div>

          <div className="space-y-4">
            {websites.map((site) => (
              <a
                key={site.name}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-6 rounded-lg border border-white/10 hover:border-altivum-gold/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-altivum-gold/5 transition-all duration-300 group bg-transparent"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3
                        className="text-white group-hover:text-altivum-gold transition-colors"
                        style={typography.cardTitleLarge}
                      >
                        {site.name}
                      </h3>
                      <span className="px-2 py-1 bg-white/5 rounded-sm text-xs font-medium text-altivum-silver border border-white/10">
                        {site.category}
                      </span>
                    </div>
                    <p className="text-altivum-silver text-sm mb-2">{site.description}</p>
                    <p className="text-altivum-gold/70 text-xs font-mono">{site.url}</p>
                  </div>
                  <span className="material-icons text-altivum-silver/30 group-hover:text-altivum-gold group-hover:translate-x-1 transition-all shrink-0 ml-4">
                    open_in_new
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Personal Social Media Section */}
      <div className="h-px bg-linear-to-r from-transparent via-altivum-gold/15 to-transparent" />
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-white mb-4" style={typography.sectionHeader}>
              Personal - Social Media
            </h2>
            <div className="h-px w-16 bg-altivum-gold"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personalSocials.map((social) => (
              <SocialCard key={social.name + social.handle} social={social} />
            ))}
          </div>
        </div>
      </section>

      {/* Company Social Media Section */}
      <div className="h-px bg-linear-to-r from-transparent via-altivum-gold/15 to-transparent" />
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-white mb-4" style={typography.sectionHeader}>
              Company - Social Media
            </h2>
            <div className="h-px w-16 bg-altivum-gold"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companySocials.map((social) => (
              <SocialCard key={social.name + social.handle} social={social} />
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <div className="h-px bg-linear-to-r from-transparent via-altivum-gold/15 to-transparent" />
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-white mb-6" style={typography.sectionHeader}>
            Want to Work Together?
          </h2>
          <p className="text-altivum-silver mb-10" style={typography.bodyText}>
            Whether you're interested in cloud services, AI integration, or veteran programs, let's connect.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <ViewTransitionLink
              to="/contact"
              className="inline-block px-10 py-4 bg-white text-altivum-dark font-medium hover:bg-altivum-gold transition-all duration-200"
            >
              Get in Touch
            </ViewTransitionLink>
            <a
              href="tel:+16152199425"
              className="inline-block px-10 py-4 bg-transparent border border-white/20 text-white font-medium hover:border-altivum-gold hover:text-altivum-gold transition-all duration-200"
            >
              Call (615) 219-9425
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Links;
