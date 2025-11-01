const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-altivum-navy border-t border-altivum-slate/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-4">
        {/* Mobile: Compact 2-column layout for links, Desktop: 3-column with brand */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Brand - Hidden on mobile, shown on desktop */}
          <div className="hidden md:block">
            <h3 className="text-lg font-display font-bold text-white mb-2">
              Christian Perez
            </h3>
            <p className="text-altivum-silver text-sm leading-relaxed">
              Founder & CEO of Altivum Inc., Former Green Beret, Bronze Star Recipient,
              Host of The Vector Podcast, Author of Beyond the Assessment
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider mb-2 sm:mb-3">
              Quick Links
            </h4>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <a href="/about" className="text-altivum-silver hover:text-altivum-gold transition-colors text-xs sm:text-sm">
                  About
                </a>
              </li>
              <li>
                <a href="/altivum" className="text-altivum-silver hover:text-altivum-gold transition-colors text-xs sm:text-sm">
                  Altivum Inc.
                </a>
              </li>
              <li>
                <a href="/podcast" className="text-altivum-silver hover:text-altivum-gold transition-colors text-xs sm:text-sm">
                  The Vector Podcast
                </a>
              </li>
              <li>
                <a href="/blog" className="text-altivum-silver hover:text-altivum-gold transition-colors text-xs sm:text-sm">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider mb-2 sm:mb-3">
              Connect
            </h4>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <a href="/contact" className="text-altivum-silver hover:text-altivum-gold transition-colors text-xs sm:text-sm">
                  Get in Touch
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/AltivumInc-Admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors text-xs sm:text-sm"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-altivum-silver hover:text-altivum-gold transition-colors text-xs sm:text-sm"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 md:mt-4 pt-3 sm:pt-4 border-t border-altivum-slate/30">
          <p className="text-center text-altivum-silver text-xs sm:text-sm">
            &copy; {currentYear} Christian Perez. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
