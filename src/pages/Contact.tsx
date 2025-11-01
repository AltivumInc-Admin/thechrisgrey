const Contact = () => {
  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-32 bg-gradient-to-br from-altivum-dark via-altivum-navy to-altivum-blue">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight">
              Let's Connect
            </h1>
            <div className="h-1 w-24 bg-altivum-gold mb-8"></div>

            <p className="text-2xl text-altivum-silver leading-relaxed">
              Whether you're interested in cloud migration, AI integration, veteran services,
              or just want to have a conversation, I'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-serif font-bold text-white mb-6">
                Send a Message
              </h2>
              <form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-altivum-silver mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="w-full px-4 py-3 rounded-md bg-altivum-navy border border-altivum-slate/30 text-white placeholder-altivum-silver focus:outline-none focus:border-altivum-gold transition-colors"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-altivum-silver mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-3 rounded-md bg-altivum-navy border border-altivum-slate/30 text-white placeholder-altivum-silver focus:outline-none focus:border-altivum-gold transition-colors"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-altivum-silver mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className="w-full px-4 py-3 rounded-md bg-altivum-navy border border-altivum-slate/30 text-white placeholder-altivum-silver focus:outline-none focus:border-altivum-gold transition-colors"
                    placeholder="What's this about?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-altivum-silver mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    className="w-full px-4 py-3 rounded-md bg-altivum-navy border border-altivum-slate/30 text-white placeholder-altivum-silver focus:outline-none focus:border-altivum-gold transition-colors resize-none"
                    placeholder="Tell me what you're thinking..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-altivum-gold text-altivum-dark font-semibold rounded-md hover:bg-altivum-gold/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Send Message
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-serif font-bold text-white mb-6">
                  Other Ways to Connect
                </h2>
                <p className="text-altivum-silver leading-relaxed mb-8">
                  Prefer a different communication method? I'm available through various channels
                  and typically respond within 24-48 hours.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="space-y-4">
                {/* Phone */}
                <a
                  href="tel:+16152199425"
                  className="block bg-altivum-navy p-6 rounded-lg border border-altivum-slate/30 hover:border-altivum-gold/50 transition-all duration-300"
                >
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <svg className="w-6 h-6 text-altivum-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Phone
                      </h3>
                      <p className="text-altivum-gold text-sm font-medium">
                        (615) 219-9425
                      </p>
                      <p className="text-altivum-silver text-sm mt-1">
                        Monday-Friday, 9 AM-5 PM CST
                      </p>
                    </div>
                  </div>
                </a>

                {/* Altivum Inc. Email */}
                <a
                  href="mailto:info@altivum.ai"
                  className="block bg-altivum-navy p-6 rounded-lg border border-altivum-slate/30 hover:border-altivum-gold/50 transition-all duration-300"
                >
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <svg className="w-6 h-6 text-altivum-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        General Inquiries
                      </h3>
                      <p className="text-altivum-gold text-sm font-medium">
                        info@altivum.ai
                      </p>
                      <p className="text-altivum-silver text-sm mt-1">
                        For general questions and information
                      </p>
                    </div>
                  </div>
                </a>

                {/* Altivum Logic Email */}
                <a
                  href="mailto:logic@altivum.ai"
                  className="block bg-altivum-navy p-6 rounded-lg border border-altivum-slate/30 hover:border-altivum-gold/50 transition-all duration-300"
                >
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <svg className="w-6 h-6 text-altivum-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Altivum Logic Services
                      </h3>
                      <p className="text-altivum-gold text-sm font-medium">
                        logic@altivum.ai
                      </p>
                      <p className="text-altivum-silver text-sm mt-1">
                        Cloud migration, web development, AI integration
                      </p>
                    </div>
                  </div>
                </a>

                {/* Personal Email */}
                <a
                  href="mailto:christian.perez@altivum.ai"
                  className="block bg-altivum-navy p-6 rounded-lg border border-altivum-slate/30 hover:border-altivum-gold/50 transition-all duration-300"
                >
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <svg className="w-6 h-6 text-altivum-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Direct Email
                      </h3>
                      <p className="text-altivum-gold text-sm font-medium">
                        christian.perez@altivum.ai
                      </p>
                      <p className="text-altivum-silver text-sm mt-1">
                        For personal inquiries and direct contact
                      </p>
                    </div>
                  </div>
                </a>

                {/* LinkedIn */}
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-altivum-navy p-6 rounded-lg border border-altivum-slate/30 hover:border-altivum-gold/50 transition-all duration-300"
                >
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <svg className="w-6 h-6 text-altivum-gold" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        LinkedIn
                      </h3>
                      <p className="text-altivum-silver text-sm">
                        Connect professionally and stay updated
                      </p>
                    </div>
                  </div>
                </a>

                {/* GitHub */}
                <a
                  href="https://github.com/AltivumInc-Admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-altivum-navy p-6 rounded-lg border border-altivum-slate/30 hover:border-altivum-gold/50 transition-all duration-300"
                >
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-altivum-gold/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <svg className="w-6 h-6 text-altivum-gold" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        GitHub
                      </h3>
                      <p className="text-altivum-silver text-sm">
                        View open-source projects and contributions
                      </p>
                    </div>
                  </div>
                </a>
              </div>

              {/* Location & Availability */}
              <div className="bg-altivum-navy p-6 rounded-lg border border-altivum-slate/30">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Availability
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center text-altivum-silver">
                    <svg className="w-5 h-5 text-altivum-gold mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Virtual consultations available
                  </li>
                  <li className="flex items-center text-altivum-silver">
                    <svg className="w-5 h-5 text-altivum-gold mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Speaking engagements
                  </li>
                  <li className="flex items-center text-altivum-silver">
                    <svg className="w-5 h-5 text-altivum-gold mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Podcast guest appearances
                  </li>
                  <li className="flex items-center text-altivum-silver">
                    <svg className="w-5 h-5 text-altivum-gold mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Strategic consulting
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
