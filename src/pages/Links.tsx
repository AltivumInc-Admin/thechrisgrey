import { SEO } from '../components/SEO';
import { typography } from '../utils/typography';
import builderQR from '../assets/builder-qr.png';
import { buildProfilePageSchema } from '../utils/schemas';
import { SOCIAL_LINKS } from '../constants/links';

const Links = () => {
  const websites = [
    {
      name: 'Altivum Inc.',
      url: 'https://altivum.ai',
      description: 'Cloud-native AI integration for small businesses',
      category: 'Company',
    },
    {
      name: 'Altivum Logic',
      url: 'https://logic.altivum.ai',
      description: 'Multicloud infrastructure & web development services',
      category: 'Product',
    },
    {
      name: 'VetROI',
      url: 'https://vetroi.altivum.ai',
      description: 'AI-powered veteran career transition tool',
      category: 'Product',
    },
  ];

  const personalSocials = [
    {
      name: 'AWS Builder',
      handle: 'AWS Community Builder Profile',
      url: 'https://builder.aws.com/profile',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335c-.072.048-.144.071-.208.071-.08 0-.16-.04-.239-.112-.112-.12-.207-.247-.279-.391-.072-.144-.144-.304-.224-.495-.56.659-1.263.99-2.135.99-.615 0-1.103-.176-1.471-.519-.367-.344-.551-.815-.551-1.423 0-.631.224-1.143.687-1.543.463-.4 1.087-.6 1.88-.6.263 0 .535.023.832.064.296.04.6.104.912.176v-.583c0-.607-.127-1.031-.375-1.287-.255-.256-.695-.384-1.343-.384-.288 0-.583.032-.888.104-.303.071-.6.16-.888.263-.135.056-.224.095-.272.111-.047.016-.08.024-.104.024-.088 0-.135-.064-.135-.191v-.303c0-.096.016-.168.056-.215.04-.048.112-.096.2-.144.287-.144.632-.264 1.031-.36.4-.095.823-.143 1.271-.143.967 0 1.671.216 2.119.647.447.432.671 1.087.671 1.967v2.583zm-2.951 1.104c.255 0 .52-.048.8-.143.28-.096.527-.271.743-.52.128-.152.224-.32.272-.512.047-.191.08-.423.08-.695v-.335c-.24-.064-.495-.112-.767-.151-.272-.04-.536-.056-.792-.056-.56 0-.967.112-1.247.343-.28.232-.423.56-.423 1.003 0 .424.104.744.32.96.215.224.52.336.911.336zm5.183.943c-.112 0-.184-.016-.239-.056-.056-.04-.104-.12-.144-.215l-1.607-5.295c-.04-.127-.056-.215-.056-.263 0-.104.048-.16.152-.16h.615c.12 0 .2.016.247.056.056.04.096.12.135.215l1.151 4.535 1.071-4.535c.032-.127.072-.207.127-.247.056-.04.136-.056.256-.056h.503c.12 0 .2.016.256.056.055.04.104.12.127.247l1.087 4.591 1.183-4.591c.04-.127.088-.207.135-.247.056-.04.135-.056.247-.056h.584c.104 0 .16.056.16.16 0 .064-.008.127-.024.2-.016.071-.04.151-.08.263l-1.647 5.295c-.04.127-.088.207-.144.247-.056.04-.136.056-.239.056h-.544c-.12 0-.2-.016-.255-.056-.056-.04-.104-.12-.128-.247l-1.071-4.463-1.055 4.455c-.032.127-.072.207-.127.247-.056.04-.136.056-.256.056h-.544zm8.479.215c-.431 0-.863-.048-1.279-.143-.415-.096-.735-.2-.951-.32-.128-.071-.215-.151-.247-.223-.032-.072-.048-.151-.048-.224v-.311c0-.128.048-.192.143-.192.04 0 .08.008.12.024.04.016.104.048.168.08.303.136.631.247.984.311.36.064.711.096 1.063.096.6 0 1.063-.104 1.398-.32.336-.216.504-.52.504-.927 0-.272-.088-.503-.263-.695-.176-.192-.527-.368-1.055-.52l-1.511-.471c-.767-.24-1.335-.591-1.687-.991-.351-.4-.527-.871-.527-1.415 0-.407.088-.767.263-1.079.176-.312.415-.583.711-.807.296-.224.647-.392 1.047-.512.4-.12.832-.176 1.295-.176.183 0 .375.008.567.032.192.024.375.056.551.088.176.04.336.08.495.127.16.048.288.096.376.143.12.064.207.127.256.2.048.071.072.168.072.295v.287c0 .128-.048.2-.144.2-.056 0-.16-.04-.303-.096-.48-.216-1.007-.32-1.591-.32-.544 0-.967.088-1.271.272-.303.184-.455.455-.455.823 0 .272.096.511.288.719.191.208.559.391 1.103.551l1.479.471c.751.24 1.303.575 1.639.999.336.423.504.911.504 1.463 0 .416-.088.791-.256 1.111-.176.32-.415.6-.735.831-.312.232-.695.408-1.151.528-.447.112-.951.168-1.511.168z" />
        </svg>
      ),
    },
    {
      name: 'Substack',
      handle: '@thechrisgrey',
      url: 'https://substack.com/@thechrisgrey',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
        </svg>
      ),
    },
    {
      name: 'Linktree',
      handle: '@thechrisgrey',
      url: 'https://linktr.ee/thechrisgrey',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7.953 15.066c-.08.163-.08.324-.08.486.08.517.528.897 1.052.89h1.294v4.776c0 .486-.404.89-.89.89H6.577a.898.898 0 0 1-.889-.891v-4.774H.992c-.728 0-1.214-.729-.89-1.377l6.96-12.627a1.065 1.065 0 0 1 1.863 0l2.913 5.585-3.885 7.042zm15.945 0-6.96-12.627a1.065 1.065 0 0 0-1.862 0l-2.995 5.586 3.885 7.04c.081.164.081.326.081.487-.08.517-.529.897-1.052.89h-1.296v4.776c0 .486.404.89.89.89h2.914c.486 0 .89-.404.89-.89v-4.775h4.612c.728 0 1.214-.729.89-1.377z" />
        </svg>
      ),
    },
    {
      name: 'Arizona State University',
      handle: 'ASU Search Profile',
      url: 'https://search.asu.edu/profile/3714457',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      handle: '@thechrisgrey',
      url: 'https://www.facebook.com/thechrisgrey',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: 'X (Twitter)',
      handle: '@x_thechrisgrey',
      url: 'https://x.com/x_thechrisgrey',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: 'LinkedIn',
      handle: 'Christian Perez',
      url: SOCIAL_LINKS.linkedin,
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      name: 'GitHub',
      handle: '@AltivumInc-Admin',
      url: 'https://github.com/AltivumInc-Admin',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      name: 'DEV Community',
      handle: '@thechrisgrey',
      url: 'https://dev.to/thechrisgrey',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7.42 10.05c-.18-.16-.46-.23-.84-.23H6l.02 2.44.04 2.45.56-.02c.41 0 .63-.07.83-.26.24-.24.26-.36.26-2.2 0-1.91-.02-1.96-.29-2.18zM0 4.94v14.12h24V4.94H0zM8.56 15.3c-.44.58-1.06.77-2.53.77H4.71V8.53h1.4c1.67 0 2.16.18 2.6.9.27.43.29.6.32 2.57.05 2.23-.02 2.73-.47 3.3zm5.09-5.47h-2.47v1.77h1.52v1.28l-.72.04-.75.03v1.77l1.22.03 1.2.04v1.28h-1.6c-1.53 0-1.6-.01-1.87-.3l-.3-.28v-3.16c0-3.02.01-3.18.25-3.48.23-.31.25-.31 1.88-.31h1.64v1.3zm4.68 5.45c-.17.43-.64.79-1.14.79-.83 0-1.31-.59-1.31-1.6 0-1.58.68-2.15 2.11-1.77l.69.18v-.85l-.71-.18c-.32-.07-.68-.1-1.14-.1-1.69 0-2.6.72-2.6 2.03 0 1.18.81 1.92 2.12 1.92.26 0 .62-.04.79-.07.26-.05.49-.26.49-.26.05-.11.12-.42.12-.42s.01-.3.01-.3l-.32-.32-.59-.11-.59-.11v-1.3l-.69-.18c-.43-.1-.83-.07-1.14.07-.83.37-1.31 1.59-1.31 2.6 0 1.58.68 2.15 2.11 1.77l.69-.18v-.85l-.71.18c-.32.07-.68.1-1.14.10z" />
        </svg>
      ),
    },
    {
      name: 'Email',
      handle: 'christian.perez@altivum.ai',
      url: 'mailto:christian.perez@altivum.ai',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const companySocials = [
    {
      name: 'Facebook',
      handle: 'Altivum Inc.',
      url: 'https://www.facebook.com/profile.php?id=61576915349985',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: 'X (Twitter)',
      handle: '@AltivumAI',
      url: 'https://x.com/AltivumAI',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: 'LinkedIn',
      handle: 'Altivum Inc.',
      url: 'https://www.linkedin.com/company/altivuminc',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      name: 'YouTube',
      handle: '@AltivumPress',
      url: 'https://www.youtube.com/@AltivumPress',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      name: 'Email',
      handle: 'info@altivum.ai',
      url: 'mailto:info@altivum.ai',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen pt-20">
      <SEO
        title="Links & Resources"
        description="Connect with Christian Perez across the web. Links to Altivum Inc., The Vector Podcast, social media profiles, and featured projects."
        keywords="Christian Perez links, social media, Altivum links, podcast links, thechrisgrey socials"
        url="https://thechrisgrey.com/links"
        breadcrumbs={[
          { name: "Home", url: "https://thechrisgrey.com" },
          { name: "Links", url: "https://thechrisgrey.com/links" }
        ]}
        structuredData={[
          buildProfilePageSchema({
            name: "Christian Perez Links & Resources",
            description: "Connect with Christian Perez across the web. All social profiles and projects in one place.",
            url: "https://thechrisgrey.com/links"
          })
        ]}
      />
      {/* Hero Section */}
      {/* Hero Section */}
      <section className="py-32 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-4 py-2 bg-altivum-gold/10 rounded-md mb-6">
              <span className="text-altivum-gold font-semibold text-sm uppercase tracking-wider">
                @thechrisgrey
              </span>
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

      {/* AWS Builder Section with QR Code */}
      {/* AWS Builder Section with QR Code */}
      <section className="py-24 bg-altivum-dark border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="p-8 md:p-12 rounded-lg border border-white/10 bg-white/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-block px-3 py-1 bg-altivum-gold/20 rounded text-xs font-medium text-altivum-gold mb-4">
                  Featured
                </div>
                <h2 className="text-white mb-4" style={typography.sectionHeader}>
                  AWS Community Builder
                </h2>
                <div className="h-px w-16 bg-altivum-gold mb-6"></div>
                <p className="text-altivum-silver mb-8" style={typography.bodyText}>
                  Connect with me on AWS Builder to explore my cloud architecture projects,
                  technical insights, and contributions to the AWS community.
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

      {/* Websites Section */}
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
                className="block p-6 rounded-lg border border-white/10 hover:border-altivum-gold/50 transition-all duration-300 group bg-transparent"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white group-hover:text-altivum-gold transition-colors" style={typography.cardTitleLarge}>
                        {site.name}
                      </h3>
                      <span className="px-2 py-1 bg-white/5 rounded text-xs font-medium text-altivum-silver border border-white/10">
                        {site.category}
                      </span>
                    </div>
                    <p className="text-altivum-silver text-sm mb-2">{site.description}</p>
                    <p className="text-altivum-gold/70 text-xs font-mono">{site.url}</p>
                  </div>
                  <span className="material-icons text-altivum-silver/30 group-hover:text-altivum-gold transition-colors flex-shrink-0 ml-4">open_in_new</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Personal Social Media Section */}
      {/* Personal Social Media Section */}
      <section className="py-24 bg-altivum-dark border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-white mb-4" style={typography.sectionHeader}>
              Personal - Social Media
            </h2>
            <div className="h-px w-16 bg-altivum-gold"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personalSocials.map((social) => (
              <a
                key={social.name + social.handle}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-6 rounded-lg border border-white/10 hover:border-altivum-gold/50 transition-all duration-300 group bg-transparent"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center text-altivum-gold/70 group-hover:text-altivum-gold transition-all flex-shrink-0">
                    {social.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white group-hover:text-altivum-gold transition-colors" style={typography.cardTitleSmall}>
                      {social.name}
                    </h3>
                    <p className="text-altivum-silver/60 text-xs truncate">{social.handle}</p>
                  </div>
                  <span className="material-icons text-altivum-silver/30 group-hover:text-altivum-gold transition-colors flex-shrink-0 text-sm">arrow_forward</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Company Social Media Section */}
      {/* Company Social Media Section */}
      <section className="py-24 bg-altivum-dark border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-white mb-4" style={typography.sectionHeader}>
              Company - Social Media
            </h2>
            <div className="h-px w-16 bg-altivum-gold"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companySocials.map((social) => (
              <a
                key={social.name + social.handle}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-6 rounded-lg border border-white/10 hover:border-altivum-gold/50 transition-all duration-300 group bg-transparent"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center text-altivum-gold/70 group-hover:text-altivum-gold transition-all flex-shrink-0">
                    {social.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white group-hover:text-altivum-gold transition-colors" style={typography.cardTitleSmall}>
                      {social.name}
                    </h3>
                    <p className="text-altivum-silver/60 text-xs truncate">{social.handle}</p>
                  </div>
                  <span className="material-icons text-altivum-silver/30 group-hover:text-altivum-gold transition-colors flex-shrink-0 text-sm">arrow_forward</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      {/* Contact CTA */}
      <section className="py-24 bg-altivum-dark border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-white mb-6" style={typography.sectionHeader}>
            Want to Work Together?
          </h2>
          <p className="text-altivum-silver mb-10" style={typography.bodyText}>
            Whether you're interested in cloud services, AI integration, or veteran programs,
            let's connect.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a
              href="/contact"
              className="inline-block px-10 py-4 bg-white text-altivum-dark font-medium hover:bg-altivum-gold transition-all duration-200"
            >
              Get in Touch
            </a>
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
