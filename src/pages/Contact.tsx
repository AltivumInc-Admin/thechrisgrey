import { SEO } from '../components/SEO';
import { typography } from '../utils/typography';
import { useState, FormEvent } from 'react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: '' // honeypot field
  });
  const [formStatus, setFormStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const validateForm = (): string | null => {
    if (formData.name.trim().length < 2 || formData.name.trim().length > 100) {
      return 'Name must be between 2 and 100 characters';
    }
    if (!emailRegex.test(formData.email.trim())) {
      return 'Please enter a valid email address';
    }
    if (formData.message.trim().length < 10 || formData.message.trim().length > 5000) {
      return 'Message must be between 10 and 5000 characters';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const validationError = validateForm();
    if (validationError) {
      setFormStatus({ type: 'error', message: validationError });
      return;
    }

    setFormStatus({ type: 'loading', message: 'Sending...' });

    try {
      const response = await fetch('https://vrs4egsi745nep54y6abvwlcwq0smqak.lambda-url.us-east-2.on.aws/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          message: `Subject: ${formData.subject.trim() || 'No subject'}\n\n${formData.message.trim()}`,
          website: formData.website // honeypot
        })
      });

      const result = await response.json();

      if (response.ok) {
        setFormData({ name: '', email: '', subject: '', message: '', website: '' });
        setFormStatus({ type: 'idle', message: '' });
        setShowSuccessModal(true);
      } else if (response.status === 429) {
        setFormStatus({
          type: 'error',
          message: 'Too many requests. Please try again in a few minutes.'
        });
      } else {
        setFormStatus({
          type: 'error',
          message: result.error || 'Failed to send message. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setFormStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.'
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Clear error when user starts typing
    if (formStatus.type === 'error') {
      setFormStatus({ type: 'idle', message: '' });
    }
  };

  return (
    <div className="min-h-screen pt-20">
      <SEO
        title="Contact Christian Perez"
        description="Get in touch with Christian Perez and Altivum Inc. for inquiries about cloud services, AI integration, or speaking engagements."
        keywords="contact Christian Perez, hire Altivum, cloud consulting inquiry, AI integration services"
        url="https://thechrisgrey.com/contact"
      />
      {/* Hero Section */}
      {/* Hero Section */}
      <section className="py-32 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl">
            <h1 className="text-white mb-6" style={typography.heroHeader}>
              Let's Connect
            </h1>
            <div className="h-px w-24 bg-altivum-gold mb-8"></div>

            <p className="text-altivum-silver" style={typography.subtitle}>
              Whether you're interested in cloud migration, AI integration, veteran services,
              or just want to have a conversation, I'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      {/* Contact Content */}
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="text-white mb-8" style={typography.sectionHeader}>
                Send a Message
              </h2>
              <form className="space-y-10" onSubmit={handleSubmit}>
                <div className="group">
                  <label htmlFor="name" className="block text-xs font-medium text-altivum-gold mb-3 uppercase tracking-widest">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    minLength={2}
                    maxLength={100}
                    className="w-full px-0 py-4 bg-transparent border-b-2 border-white/10 text-white placeholder-altivum-silver/40 focus:outline-none focus:border-altivum-gold transition-all duration-300 rounded-none"
                    placeholder="Your name"
                  />
                </div>

                <div className="group">
                  <label htmlFor="email" className="block text-xs font-medium text-altivum-gold mb-3 uppercase tracking-widest">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    maxLength={255}
                    className="w-full px-0 py-4 bg-transparent border-b-2 border-white/10 text-white placeholder-altivum-silver/40 focus:outline-none focus:border-altivum-gold transition-all duration-300 rounded-none"
                    placeholder="your@email.com"
                  />
                </div>

                <div className="group">
                  <label htmlFor="subject" className="block text-xs font-medium text-altivum-silver mb-3 uppercase tracking-widest">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    maxLength={200}
                    className="w-full px-0 py-4 bg-transparent border-b-2 border-white/10 text-white placeholder-altivum-silver/40 focus:outline-none focus:border-altivum-gold transition-all duration-300 rounded-none"
                    placeholder="What's this about?"
                  />
                </div>

                <div className="group">
                  <label htmlFor="message" className="block text-xs font-medium text-altivum-gold mb-3 uppercase tracking-widest">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    minLength={10}
                    maxLength={5000}
                    rows={6}
                    className="w-full px-0 py-4 bg-transparent border-b-2 border-white/10 text-white placeholder-altivum-silver/40 focus:outline-none focus:border-altivum-gold transition-all duration-300 resize-none rounded-none"
                    placeholder="Tell me what you're thinking..."
                  ></textarea>
                </div>

                {/* Honeypot field - hidden from users */}
                <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                  <label htmlFor="website">Website (leave blank)</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {/* Status Message */}
                {formStatus.message && (
                  <div
                    className={`p-5 rounded-sm backdrop-blur-sm transition-all duration-300 ${
                      formStatus.type === 'success'
                        ? 'bg-green-900/30 border-l-4 border-green-500 text-green-300'
                        : formStatus.type === 'error'
                        ? 'bg-red-900/30 border-l-4 border-red-500 text-red-300'
                        : 'bg-altivum-blue/30 border-l-4 border-altivum-gold text-altivum-gold'
                    }`}
                    role="alert"
                  >
                    {formStatus.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={formStatus.type === 'loading'}
                  className={`group relative px-12 py-5 font-medium uppercase tracking-wider text-sm overflow-hidden transition-all duration-300 ${
                    formStatus.type === 'loading'
                      ? 'bg-altivum-slate/50 text-altivum-silver cursor-not-allowed'
                      : 'bg-altivum-gold text-altivum-dark hover:bg-white hover:shadow-[0_0_30px_rgba(197,165,114,0.3)]'
                  }`}
                >
                  <span className="relative z-10">
                    {formStatus.type === 'loading' ? 'Sending...' : 'Send Message'}
                  </span>
                  {formStatus.type !== 'loading' && (
                    <span className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-12 lg:pt-20">
              <div>
                <h2 className="text-white mb-6" style={typography.cardTitleLarge}>
                  Other Ways to Connect
                </h2>
                <p className="text-altivum-silver" style={typography.bodyText}>
                  Prefer a different communication method? I'm available through various channels
                  and typically respond within 24-48 hours.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="space-y-6">
                {/* Phone */}
                <a href="tel:+16152199425" className="block group">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 flex items-center justify-center text-altivum-gold/50 group-hover:text-altivum-gold transition-colors">
                      <span className="material-icons text-3xl">phone</span>
                    </div>
                    <div>
                      <h3 className="text-white mb-1 group-hover:text-altivum-gold transition-colors" style={typography.cardTitleSmall}>Phone</h3>
                      <p className="text-altivum-silver text-sm">(615) 219-9425</p>
                    </div>
                  </div>
                </a>

                {/* Altivum Inc. Email */}
                <a href="mailto:info@altivum.ai" className="block group">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 flex items-center justify-center text-altivum-gold/50 group-hover:text-altivum-gold transition-colors">
                      <span className="material-icons text-3xl">email</span>
                    </div>
                    <div>
                      <h3 className="text-white mb-1 group-hover:text-altivum-gold transition-colors" style={typography.cardTitleSmall}>General Inquiries</h3>
                      <p className="text-altivum-silver text-sm">info@altivum.ai</p>
                    </div>
                  </div>
                </a>

                {/* Altivum Logic Email */}
                <a href="mailto:logic@altivum.ai" className="block group">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 flex items-center justify-center text-altivum-gold/50 group-hover:text-altivum-gold transition-colors">
                      <span className="material-icons text-3xl">business_center</span>
                    </div>
                    <div>
                      <h3 className="text-white mb-1 group-hover:text-altivum-gold transition-colors" style={typography.cardTitleSmall}>Altivum Logic Services</h3>
                      <p className="text-altivum-silver text-sm">logic@altivum.ai</p>
                    </div>
                  </div>
                </a>

                {/* Personal Email */}
                <a href="mailto:christian.perez@altivum.ai" className="block group">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 flex items-center justify-center text-altivum-gold/50 group-hover:text-altivum-gold transition-colors">
                      <span className="material-icons text-3xl">person</span>
                    </div>
                    <div>
                      <h3 className="text-white mb-1 group-hover:text-altivum-gold transition-colors" style={typography.cardTitleSmall}>Direct Email</h3>
                      <p className="text-altivum-silver text-sm">christian.perez@altivum.ai</p>
                    </div>
                  </div>
                </a>

                {/* LinkedIn */}
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="block group">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 flex items-center justify-center text-altivum-gold/50 group-hover:text-altivum-gold transition-colors">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white mb-1 group-hover:text-altivum-gold transition-colors" style={typography.cardTitleSmall}>LinkedIn</h3>
                      <p className="text-altivum-silver text-sm">Connect professionally</p>
                    </div>
                  </div>
                </a>

                {/* GitHub */}
                <a href="https://github.com/AltivumInc-Admin" target="_blank" rel="noopener noreferrer" className="block group">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 flex items-center justify-center text-altivum-gold/50 group-hover:text-altivum-gold transition-colors">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white mb-1 group-hover:text-altivum-gold transition-colors" style={typography.cardTitleSmall}>GitHub</h3>
                      <p className="text-altivum-silver text-sm">View open-source projects</p>
                    </div>
                  </div>
                </a>
              </div>

              {/* Location & Availability */}
              <div className="pt-8 border-t border-white/5">
                <h3 className="text-white mb-4" style={typography.cardTitleSmall}>
                  Availability
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center text-altivum-silver">
                    <span className="material-icons text-altivum-gold mr-3 text-sm">check_circle</span>
                    Virtual consultations available
                  </li>
                  <li className="flex items-center text-altivum-silver">
                    <span className="material-icons text-altivum-gold mr-3 text-sm">check_circle</span>
                    Speaking engagements
                  </li>
                  <li className="flex items-center text-altivum-silver">
                    <span className="material-icons text-altivum-gold mr-3 text-sm">check_circle</span>
                    Podcast guest appearances
                  </li>
                  <li className="flex items-center text-altivum-silver">
                    <span className="material-icons text-altivum-gold mr-3 text-sm">check_circle</span>
                    Strategic consulting
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowSuccessModal(false)}
          ></div>
          <div className="relative bg-gradient-to-br from-altivum-navy to-altivum-blue max-w-md w-full p-8 border-2 border-altivum-gold/30 shadow-[0_0_60px_rgba(197,165,114,0.2)]">
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-altivum-silver hover:text-white transition-colors"
              aria-label="Close"
            >
              <span className="material-icons text-2xl">close</span>
            </button>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-altivum-gold/10 border-2 border-altivum-gold mb-6">
                <span className="material-icons text-altivum-gold text-4xl">check_circle</span>
              </div>

              <h3 className="text-white mb-4" style={typography.cardTitleLarge}>
                Thank You!
              </h3>

              <p className="text-altivum-silver mb-8" style={typography.bodyText}>
                Thanks for contacting me. I'll reach back as soon as possible.
              </p>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-8 py-3 bg-altivum-gold text-altivum-dark font-medium uppercase tracking-wider text-sm hover:bg-white transition-colors duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;
