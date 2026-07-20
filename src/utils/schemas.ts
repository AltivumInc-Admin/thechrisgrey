/**
 * Schema.org structured data builders for SEO and AEO optimization
 * These utilities generate JSON-LD schemas for AI discoverability
 */

import { SOCIAL_LINKS } from '../constants/links';
import { CREDENTIALS } from '../data/credentials';

// Base URLs
const SITE_URL = 'https://thechrisgrey.com';
const ALTIVUM_URL = 'https://altivum.ai';

// Common Types
interface FAQItem {
  question: string;
  answer: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface ServiceData {
  name: string;
  description: string;
  serviceType: string | string[];
  url?: string;
}

/**
 * Enhanced Person schema with E-E-A-T signals
 */
export const buildPersonSchema = () => ({
  '@type': 'Person',
  '@id': `${SITE_URL}/#person`,
  name: 'Christian Perez',
  alternateName: ['thechrisgrey', 'Chris Perez'],
  url: SITE_URL,
  image: `${SITE_URL}/og.png`,
  description:
    'Founder & CEO of Altivum Inc., Former Green Beret (18D), Bronze Star Recipient, Host of The Vector Podcast, and Author of Beyond the Assessment.',
  jobTitle: 'Founder & CEO',
  worksFor: {
    '@type': 'Organization',
    name: 'Altivum Inc.',
    '@id': `${ALTIVUM_URL}/#organization`,
  },
  birthPlace: {
    '@type': 'Place',
    name: 'Guatemala City, Guatemala',
  },
  hasCredential: CREDENTIALS.filter((c) => c.field === 'hasCredential').map((c) => ({
    '@type': 'EducationalOccupationalCredential',
    credentialCategory: c.credentialCategory ?? c.category,
    name: c.label,
    description: c.description,
  })),
  award: CREDENTIALS.filter((c) => c.field === 'award').map((c) => ({
    '@type': 'Award',
    name: c.label,
    description: c.description,
  })),
  alumniOf: {
    '@type': 'CollegeOrUniversity',
    name: 'Arizona State University',
    url: 'https://asu.edu',
  },
  memberOf: [
    {
      '@type': 'Organization',
      name: '1st Special Forces Group (Airborne)',
    },
    {
      '@type': 'ProgramMembership',
      programName: 'AWS Community Builders',
      hostingOrganization: {
        '@type': 'Organization',
        name: 'Amazon Web Services',
      },
    },
  ],
  knowsAbout: [
    'Cloud Architecture',
    'Artificial Intelligence',
    'AWS Infrastructure',
    'Defense Technology',
    'Entrepreneurship',
    'Military Leadership',
    'Veteran Transition',
    'Special Operations',
  ],
  sameAs: [
    'https://www.linkedin.com/in/thechrisgrey/',
    'https://x.com/thechrisgrey',
    'https://substack.com/@thechrisgrey',
    'https://dev.to/thechrisgrey',
    'https://www.facebook.com/thechrisgrey',
    'https://linktr.ee/thechrisgrey',
    'https://search.asu.edu/profile/3714457',
    'https://logic.altivum.ai',
  ],
});

/**
 * Enhanced Organization schema for Altivum Inc.
 */
export const buildOrganizationSchema = () => ({
  '@type': 'Corporation',
  '@id': `${ALTIVUM_URL}/#organization`,
  name: 'Altivum Inc.',
  legalName: 'Altivum Inc.',
  url: ALTIVUM_URL,
  logo: `${ALTIVUM_URL}/logo.png`,
  image: `${ALTIVUM_URL}/logo.png`,
  description:
    'A veteran-founded public benefit corporation building intelligent, cloud-native architectures that integrate AI at the core of operations.',
  slogan: 'Intelligence. Structure. Impact.',
  foundingDate: '2025-02',
  foundingLocation: {
    '@type': 'Place',
    name: 'Clarksville, Tennessee',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Clarksville',
      addressRegion: 'TN',
      addressCountry: 'US',
    },
  },
  founder: {
    '@id': `${SITE_URL}/#person`,
  },
  numberOfEmployees: {
    '@type': 'QuantitativeValue',
    value: 1,
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'info@altivum.ai',
    telephone: '+1-615-219-9425',
    contactType: 'customer service',
    availableLanguage: ['English', 'Spanish'],
  },
  areaServed: {
    '@type': 'Country',
    name: 'United States',
  },
  knowsAbout: ['Cloud Architecture', 'AI Integration', 'Veteran Services', 'Web Development', 'SEO & AEO'],
  award: {
    '@type': 'Award',
    name: 'Veteran Business of the Month',
    description: 'Recognized by Clarksville Area Chamber of Commerce, December 2025',
    url: 'https://www.clarksvilleonline.com/2025/12/12/clarksville-area-chamber-of-commerces-veteran-business-of-the-month-altivum-inc/',
  },
  sameAs: [SOCIAL_LINKS.altivumLinkedIn, SOCIAL_LINKS.github, SOCIAL_LINKS.altivumLogic],
});

/**
 * WebSite schema with search action
 */
export const buildWebSiteSchema = () => ({
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: 'Christian Perez - thechrisgrey',
  description:
    'Personal website of Christian Perez, Founder of Altivum Inc., Former Green Beret, and Host of The Vector Podcast.',
  publisher: {
    '@id': `${SITE_URL}/#person`,
  },
  inLanguage: 'en-US',
});

/**
 * FAQ Page schema for AEO optimization
 */
export const buildFAQSchema = (faqs: FAQItem[]) => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
});

/**
 * Breadcrumb schema for navigation hierarchy
 */
export const buildBreadcrumbSchema = (items: BreadcrumbItem[]) => ({
  '@type': 'BreadcrumbList',
  '@id': `${SITE_URL}/#breadcrumb`,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

/**
 * WebPage schema
 */
export const buildWebPageSchema = (options: {
  name: string;
  description: string;
  url: string;
  breadcrumbs?: BreadcrumbItem[];
}) => ({
  '@type': 'WebPage',
  '@id': `${options.url}/#webpage`,
  url: options.url,
  name: options.name,
  description: options.description,
  isPartOf: {
    '@id': `${SITE_URL}/#website`,
  },
  about: {
    '@id': `${SITE_URL}/#person`,
  },
  breadcrumb: options.breadcrumbs
    ? {
        '@id': `${SITE_URL}/#breadcrumb`,
      }
    : undefined,
  inLanguage: 'en-US',
});

/**
 * ProfilePage schema for About and Links pages
 */
export const buildProfilePageSchema = (options: { name: string; description: string; url: string }) => ({
  '@type': 'ProfilePage',
  '@id': `${options.url}/#profilepage`,
  url: options.url,
  name: options.name,
  description: options.description,
  mainEntity: {
    '@id': `${SITE_URL}/#person`,
  },
  isPartOf: {
    '@id': `${SITE_URL}/#website`,
  },
  inLanguage: 'en-US',
});

/**
 * Book schema for Beyond the Assessment
 */
export const buildBookSchema = () => ({
  '@type': 'Book',
  '@id': `${SITE_URL}/beyond-the-assessment/#book`,
  name: 'Beyond the Assessment',
  author: {
    '@id': `${SITE_URL}/#person`,
  },
  description:
    'A book exploring the intangible qualities that define true leadership and resilience. It challenges readers to look beyond metrics and assessments to understand what truly drives success in high-stakes environments.',
  genre: ['Leadership', 'Military', 'Self-Help', 'Personal Development'],
  inLanguage: 'en-US',
  publisher: {
    '@type': 'Organization',
    name: 'Altivum Press',
    url: 'https://press.altivum.ai',
  },
  offers: {
    '@type': 'Offer',
    url: 'https://a.co/d/iC9TEDW',
    availability: 'https://schema.org/InStock',
    priceCurrency: 'USD',
    seller: {
      '@type': 'Organization',
      name: 'Amazon',
    },
  },
  keywords: ['leadership', 'military', 'resilience', 'assessment', 'special forces', 'veteran'],
});

/**
 * PodcastSeries schema
 */
export const buildPodcastSeriesSchema = () => ({
  '@type': 'PodcastSeries',
  '@id': `${SITE_URL}/podcast#podcast`,
  name: 'The Vector Podcast',
  url: `${SITE_URL}/podcast`,
  description:
    'The Vector Podcast explores conversations at the intersection of veteran experience, emerging technology, and purposeful entrepreneurship. Hosted by Christian Perez, each episode features leaders navigating the transition from service to innovation.',
  webFeed: 'https://api.riverside.fm/hosting/heA0qRHh.rss',
  image: `${SITE_URL}/tvp.png`,
  author: {
    '@id': `${SITE_URL}/#person`,
  },
  publisher: {
    '@id': `${ALTIVUM_URL}/#organization`,
  },
  inLanguage: 'en-US',
  genre: ['Technology', 'Business', 'Veterans', 'Entrepreneurship', 'Leadership'],
});

/**
 * Service schema for Altivum divisions
 */
export const buildServiceSchema = (service: ServiceData) => ({
  '@type': 'Service',
  name: service.name,
  description: service.description,
  serviceType: service.serviceType,
  provider: {
    '@id': `${ALTIVUM_URL}/#organization`,
  },
  areaServed: {
    '@type': 'Country',
    name: 'United States',
  },
  url: service.url,
});

/**
 * Pre-built service schemas for Altivum divisions
 */
export const buildAltivumServicesSchemas = () => [
  buildServiceSchema({
    name: 'Altivum Vanguard',
    description:
      'AI-powered veteran career transition services. VetROI helps veterans translate their military experience into civilian career opportunities through intelligent skill mapping and job matching.',
    serviceType: ['Veteran Career Services', 'AI Career Tools', 'Skills Translation'],
    url: 'https://vanguard.altivum.ai',
  }),
  buildServiceSchema({
    name: 'Altivum Logic',
    description:
      'Cloud migration, AI integration, web development, and SEO/AEO services for small businesses. We build intelligent, scalable digital solutions.',
    serviceType: ['Web Development', 'SEO', 'AEO', 'Cloud Migration', 'AI Integration'],
    url: 'https://logic.altivum.ai',
  }),
  buildServiceSchema({
    name: 'Altivum Press',
    description:
      'Media and publishing division producing The Vector Podcast, social media content, and publications focused on veteran entrepreneurship and technology.',
    serviceType: ['Podcast Production', 'Social Media', 'Publishing', 'Content Creation'],
    url: 'https://press.altivum.ai',
  }),
];

/**
 * ContactPage schema
 */
export const buildContactPageSchema = () => ({
  '@type': 'ContactPage',
  '@id': `${SITE_URL}/contact/#contactpage`,
  name: 'Contact Christian Perez',
  description:
    'Get in touch with Christian Perez for speaking engagements, business inquiries, or collaboration opportunities.',
  url: `${SITE_URL}/contact`,
  mainEntity: {
    '@id': `${SITE_URL}/#person`,
  },
  isPartOf: {
    '@id': `${SITE_URL}/#website`,
  },
});

/**
 * VideoObject schema for YouTube embeds (enables Google video carousel)
 */
export const buildVideoObjectSchema = (options: {
  videoId: string;
  title: string;
  uploadDate: string; // Google REQUIRES uploadDate for video rich results — was optional
  description?: string;
  thumbnailUrl?: string;
}) => ({
  '@type': 'VideoObject',
  name: options.title,
  description: options.description || options.title,
  // hqdefault.jpg is generated for EVERY YouTube video (480x360, within Google's
  // thumbnail minimums); maxresdefault.jpg 404s for SD/third-party videos and the
  // thumbnailUrl is a REQUIRED VideoObject field, so the default must always resolve.
  thumbnailUrl: options.thumbnailUrl || `https://img.youtube.com/vi/${options.videoId}/hqdefault.jpg`,
  uploadDate: options.uploadDate,
  contentUrl: `https://www.youtube.com/watch?v=${options.videoId}`,
  embedUrl: `https://www.youtube.com/embed/${options.videoId}`,
  publisher: {
    '@id': `${SITE_URL}/#person`,
  },
});

/**
 * ItemList schema for blog series (structured collection of posts)
 */
export const buildItemListSchema = (options: {
  name: string;
  description?: string;
  items: { name: string; url: string }[];
}) => ({
  '@type': 'ItemList',
  name: options.name,
  ...(options.description ? { description: options.description } : {}),
  numberOfItems: options.items.length,
  itemListElement: options.items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    url: item.url,
  })),
});

// ============================================
// Pre-built FAQ content for each page
// ============================================

export const homeFAQs: FAQItem[] = [
  {
    question: 'Who is Christian Perez?',
    answer:
      'Christian Perez is the Founder & CEO of Altivum Inc., a former Green Beret and Special Forces Medic (18D), Bronze Star recipient, host of The Vector Podcast, and author of Beyond the Assessment. He combines military leadership experience with expertise in cloud architecture and AI to build technology solutions for veterans and businesses.',
  },
  {
    question: 'What is Altivum Inc.?',
    answer:
      'Altivum Inc. is a veteran-founded public benefit corporation based in Clarksville, Tennessee. Founded in February 2025 by Christian Perez, Altivum builds intelligent, cloud-native architectures that integrate AI at the core of operations. The company has three divisions: Vanguard (veteran career services), Logic (web development and AI integration), and Press (media and publishing).',
  },
  {
    question: 'What is The Vector Podcast about?',
    answer:
      'The Vector Podcast explores conversations at the intersection of veteran experience, emerging technology, and purposeful entrepreneurship. Hosted by Christian Perez, each episode features leaders navigating the transition from service to innovation, discussing topics like AI, cloud technology, and building mission-driven companies.',
  },
];

export const aboutFAQs: FAQItem[] = [
  {
    question: "What is Christian Perez's military background?",
    answer:
      'Christian Perez served as a Special Forces Medic (18D) with the U.S. Army, earning his Green Beret. He was assigned to 1st Special Forces Group (Airborne) and deployed to Afghanistan with SFOD-A 1236. His military service spans from 2012 to present, combining operational experience with advanced medical and tactical training.',
  },
  {
    question: 'What awards did Christian Perez receive?',
    answer:
      'Christian Perez was awarded the Bronze Star Medal for meritorious service during his deployment to Afghanistan with SFOD-A 1236. This decoration recognizes his exceptional performance and contributions during combat operations.',
  },
  {
    question: 'When did Christian Perez found Altivum?',
    answer:
      'Christian Perez founded Altivum Inc. in February 2025 in Clarksville, Tennessee. The company was established as a public benefit corporation to build intelligent cloud and AI solutions while serving the veteran community.',
  },
];

export const altivumFAQs: FAQItem[] = [
  {
    question: 'What does Altivum Inc. do?',
    answer:
      'Altivum Inc. is a public benefit corporation that builds intelligent, cloud-native architectures integrating AI at the core of operations. The company operates three divisions: Altivum Vanguard provides AI-powered veteran career transition services, Altivum Logic offers web development and cloud migration for businesses, and Altivum Press produces media content including The Vector Podcast.',
  },
  {
    question: 'What services does Altivum Logic offer?',
    answer:
      'Altivum Logic provides comprehensive digital services including web design and development, SEO and AEO (Answer Engine Optimization), cloud migration to AWS infrastructure, and AI integration for business operations. The division specializes in helping small businesses leverage modern technology to scale their operations.',
  },
  {
    question: 'What is VetROI?',
    answer:
      "VetROI is an AI-powered veteran career transition tool developed by Altivum Vanguard. It helps veterans translate their military experience into civilian career opportunities through intelligent skill mapping, job matching, and career guidance tailored to each veteran's unique background and goals.",
  },
];

export const podcastFAQs: FAQItem[] = [
  {
    question: 'What is The Vector Podcast about?',
    answer:
      'The Vector Podcast explores conversations at the intersection of veteran experience, emerging technology, and purposeful entrepreneurship. Each episode features leaders navigating the transition from service to innovation, discussing AI, cloud technology, leadership, and building mission-driven companies.',
  },
  {
    question: 'Who hosts The Vector Podcast?',
    answer:
      'The Vector Podcast is hosted by Christian Perez, Founder & CEO of Altivum Inc. and former Green Beret. Christian brings his unique perspective as a veteran entrepreneur to facilitate conversations with leaders in technology and business.',
  },
  {
    question: 'Where can I listen to The Vector Podcast?',
    answer:
      'The Vector Podcast is available on all major podcast platforms including Spotify, Apple Podcasts, YouTube, and directly at vector.altivum.ai. You can also subscribe via the RSS feed.',
  },
  {
    question: 'How often are new episodes released?',
    answer:
      'New episodes of The Vector Podcast are released regularly. Subscribe on your favorite platform to be notified when new episodes are available.',
  },
  {
    question: 'Can I be a guest on The Vector Podcast?',
    answer:
      "We're always looking for inspiring guests with unique perspectives on technology, entrepreneurship, and veteran experience. Contact us through thechrisgrey.com/contact to discuss guest opportunities.",
  },
];

export const bookFAQs: FAQItem[] = [
  {
    question: 'What is Beyond the Assessment about?',
    answer:
      'Beyond the Assessment is a book by Christian Perez that explores the intangible qualities that define true leadership and resilience. It challenges readers to look beyond metrics and standardized assessments to understand what truly drives success in high-stakes environments, drawing from military experience and leadership principles.',
  },
  {
    question: 'Who wrote Beyond the Assessment?',
    answer:
      'Beyond the Assessment was written by Christian Perez, a former Green Beret and Special Forces Medic (18D), Bronze Star recipient, and Founder of Altivum Inc. The book draws on his military experience and leadership journey.',
  },
  {
    question: 'Where can I buy Beyond the Assessment?',
    answer:
      'Beyond the Assessment is available for purchase on Amazon at a.co/d/iC9TEDW. The book is published by Altivum Press.',
  },
];

export const blogFAQs: FAQItem[] = [
  {
    question: 'What topics does Christian Perez write about?',
    answer:
      'Christian Perez writes about AI and cloud architecture, military-to-civilian transition, leadership and resilience, entrepreneurship, and the intersection of technology and veteran experience. His blog features insights from building Altivum Inc. and his journey from Special Forces to tech entrepreneurship.',
  },
  {
    question: 'How can I subscribe to the blog?',
    answer:
      "You can subscribe to Christian Perez's blog and newsletter at thechrisgrey.com/blog. Enter your email address to receive updates on new articles, insights on AI and cloud technology, and exclusive content about veteran entrepreneurship.",
  },
];

export const contactFAQs: FAQItem[] = [
  {
    question: 'How can I contact Christian Perez?',
    answer:
      'You can reach Christian Perez through the contact form at thechrisgrey.com/contact, by email at christian.perez@altivum.ai, or by phone at +1-615-219-9425. For general Altivum inquiries, email info@altivum.ai. For business services through Altivum Logic, email logic@altivum.ai.',
  },
  {
    question: 'Is Christian Perez available for speaking engagements?',
    answer:
      'Yes, Christian Perez is available for speaking engagements on topics including veteran entrepreneurship, AI and cloud technology, military leadership, and building mission-driven companies. Contact him through the form at thechrisgrey.com/contact or email christian.perez@altivum.ai.',
  },
];

export const foundationFAQs: FAQItem[] = [
  {
    question: 'What is The Altivum Foundation?',
    answer:
      'The Altivum Foundation is a 501(c)(3) nonprofit (EIN 41-4163272) founded by Christian Perez that funds U.S. military veterans pursuing education in cloud computing, artificial intelligence, robotics, and cybersecurity. Scholarships cover the full cost of certifications, degrees, and bootcamps, at no cost to the scholar.',
  },
  {
    question: 'Who is eligible for a scholarship?',
    answer:
      'Scholarships are for U.S. military veterans pursuing education in cloud computing, artificial intelligence, robotics, or cybersecurity. Full eligibility criteria and application details are available at altivumfoundation.org.',
  },
  {
    question: 'Is my donation tax-deductible?',
    answer:
      'Yes. The Altivum Foundation is a registered 501(c)(3) nonprofit (EIN 41-4163272), so contributions are tax-deductible to the extent allowed by law. Donations are accepted at altivumfoundation.org/give.',
  },
];

/**
 * NonprofitOrganization schema for The Altivum Foundation
 */
export const buildFoundationOrganizationSchema = () => ({
  '@type': 'NonprofitOrganization',
  '@id': 'https://altivumfoundation.org/#organization',
  name: 'The Altivum Foundation',
  url: 'https://altivumfoundation.org',
  description:
    'A 501(c)(3) nonprofit funding U.S. military veterans pursuing education in cloud computing, artificial intelligence, robotics, and cybersecurity — at no cost to the scholar.',
  taxID: '41-4163272',
  nonprofitStatus: 'Nonprofit501c3',
  founder: {
    '@id': `${SITE_URL}/#person`,
  },
  knowsAbout: ['Cloud Computing', 'Artificial Intelligence', 'Robotics', 'Cybersecurity', 'Veteran Education'],
  areaServed: {
    '@type': 'Country',
    name: 'United States',
  },
});
