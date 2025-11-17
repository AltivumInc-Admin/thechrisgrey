import { typography } from '../utils/typography';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-altivum-navy border-t border-altivum-slate/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-4">
        {/* Mobile: Compact 2-column layout for links, Desktop: 3-column with brand */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Brand - Hidden on mobile, shown on desktop */}
          <div className="hidden md:block">
            <h3 className="text-white mb-2" style={typography.cardTitleSmall}>
              Christian Perez
            </h3>
            <p className="text-altivum-silver" style={typography.smallText}>
              Founder & CEO of Altivum Inc., Former Green Beret, Bronze Star Recipient,
              Host of The Vector Podcast, Author of Beyond the Assessment
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white uppercase tracking-wider mb-2 sm:mb-3" style={{ ...typography.smallText, fontWeight: 600 }}>
              Quick Links
            </h4>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <a href="/about" className="text-altivum-silver hover:text-altivum-gold transition-colors" style={typography.smallText}>
                  About
                </a>
              </li>
              <li>
                <a href="/altivum" className="text-altivum-silver hover:text-altivum-gold transition-colors" style={typography.smallText}>
                  Altivum Inc.
                </a>
              </li>
              <li>
                <a href="/podcast" className="text-altivum-silver hover:text-altivum-gold transition-colors" style={typography.smallText}>
                  The Vector Podcast
                </a>
              </li>
              <li>
                <a href="/blog" className="text-altivum-silver hover:text-altivum-gold transition-colors" style={typography.smallText}>
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-white uppercase tracking-wider mb-2 sm:mb-3" style={{ ...typography.smallText, fontWeight: 600 }}>
              Connect
            </h4>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <a href="/contact" className="text-altivum-silver hover:text-altivum-gold transition-colors" style={typography.smallText}>
                  Get in Touch
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/AltivumInc-Admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors"
                  style={typography.smallText}
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors"
                  style={typography.smallText}
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 md:mt-4 pt-3 sm:pt-4 border-t border-altivum-slate/30">
          <p className="text-center text-altivum-silver" style={typography.smallText}>
            &copy; {currentYear} Christian Perez. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
