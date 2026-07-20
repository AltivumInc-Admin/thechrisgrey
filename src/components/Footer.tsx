import ViewTransitionLink from './ViewTransitionLink';
import { typography } from '../utils/typography';
import { SOCIAL_LINKS } from '../constants/links';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer data-vt-persist="footer" className="bg-altivum-navy border-t border-altivum-slate/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-4">
        {/* Mobile: Compact 2-column layout for links, Desktop: 3-column with brand */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Brand - Hidden on mobile, shown on desktop */}
          <div className="hidden md:block">
            <h3 id="footer-christian-perez" className="text-white mb-2" style={typography.cardTitleSmall}>
              Christian Perez
            </h3>
            <p className="text-altivum-silver" style={typography.smallText}>
              Founder & CEO of Altivum Inc., Former Green Beret, Bronze Star Recipient, Host of The Vector Podcast,
              Author of Beyond the Assessment
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="text-white uppercase tracking-wider mb-2 sm:mb-3"
              style={{ ...typography.smallText, fontWeight: 600 }}
            >
              Quick Links
            </h4>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <ViewTransitionLink
                  to="/about"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors link-underline"
                  style={typography.smallText}
                >
                  About
                </ViewTransitionLink>
              </li>
              <li>
                <ViewTransitionLink
                  to="/altivum"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors link-underline"
                  style={typography.smallText}
                >
                  Altivum Inc.
                </ViewTransitionLink>
              </li>
              <li>
                <ViewTransitionLink
                  to="/podcast"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors link-underline"
                  style={typography.smallText}
                >
                  The Vector Podcast
                </ViewTransitionLink>
              </li>
              <li>
                <ViewTransitionLink
                  to="/claude"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors link-underline"
                  style={typography.smallText}
                >
                  Claude
                </ViewTransitionLink>
              </li>
              <li>
                <ViewTransitionLink
                  to="/blog"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors link-underline"
                  style={typography.smallText}
                >
                  Blog
                </ViewTransitionLink>
              </li>
              <li>
                <a
                  href="/rss.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors link-underline"
                  style={typography.smallText}
                >
                  RSS Feed
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4
              className="text-white uppercase tracking-wider mb-2 sm:mb-3"
              style={{ ...typography.smallText, fontWeight: 600 }}
            >
              Connect
            </h4>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <ViewTransitionLink
                  to="/contact"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors link-underline"
                  style={typography.smallText}
                >
                  Get in Touch
                </ViewTransitionLink>
              </li>
              <li>
                <a
                  href={SOCIAL_LINKS.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors link-underline"
                  style={typography.smallText}
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={SOCIAL_LINKS.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors link-underline"
                  style={typography.smallText}
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-4 sm:mt-6 md:mt-4 pt-3 sm:pt-4 border-t border-white/3"
          style={{ borderImage: 'linear-gradient(to right, transparent, rgba(197,165,114,0.15), transparent) 1' }}
        >
          <p className="text-center text-altivum-silver" style={typography.smallText}>
            &copy; {currentYear} Christian Perez. All rights reserved.
            <span className="mx-2">·</span>
            <ViewTransitionLink to="/privacy" className="hover:text-altivum-gold transition-colors link-underline">
              Privacy Policy
            </ViewTransitionLink>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
