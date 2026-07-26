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
 *
 * @param options.image - Optional image URL override for the Person's `image`
 *   field. Defaults to the shared `/og.png`. Pass the per-route og:image so the
 *   JSON-LD primary image and the og:image meta tag resolve to the same asset
 *   (VAL-SD-010). For routes with a page-specific schema image (Article,
 *   PodcastSeries), that image is primary and already matches og:image.
 */
export const buildPersonSchema = (options?: { image?: string }) => ({
  '@type': 'Person',
  '@id': `${SITE_URL}/#person`,
  name: 'Christian Perez',
  alternateName: ['thechrisgrey', 'Chris Perez'],
  url: SITE_URL,
  image: options?.image ?? `${SITE_URL}/og.png`,
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
    // AWS Community Builder membership is derived from the shared CREDENTIALS
    // source (field === 'memberOf') so the visible Credentials & Recognition
    // section and this JSON-LD node cannot drift.
    ...CREDENTIALS.filter((c) => c.field === 'memberOf').map((c) => ({
      '@type': 'ProgramMembership',
      programName: c.label,
      hostingOrganization: {
        '@type': 'Organization',
        name: c.issuedBy ?? 'Amazon Web Services',
      },
    })),
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
  // Organization awards are derived from the shared CREDENTIALS source
  // (field === 'organizationAward') so the visible Credentials & Recognition
  // section and this JSON-LD node cannot drift. Currently one entry: Veteran
  // Business of the Month.
  award: CREDENTIALS.filter((c) => c.field === 'organizationAward').map((c) => ({
    '@type': 'Award',
    name: c.label,
    description: c.description,
    ...(c.url ? { url: c.url } : {}),
  })),
  sameAs: [SOCIAL_LINKS.altivumLinkedIn, SOCIAL_LINKS.github, SOCIAL_LINKS.altivumLogic],
});

/**
 * WebSite schema with a SearchAction.
 *
 * The site renders a visible search input on /blog (`?q=` query param) that
 * filters the post listing, so the WebSite node declares a SearchAction whose
 * target points at that endpoint. VAL-SD-009 requires that any declared
 * SearchAction target a working search endpoint or a visible search box; the
 * /blog search input satisfies both.
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
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
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
  image?: string;
}) => ({
  '@type': 'WebPage',
  '@id': `${options.url}/#webpage`,
  url: options.url,
  name: options.name,
  description: options.description,
  ...(options.image ? { image: options.image } : {}),
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
export const buildProfilePageSchema = (options: {
  name: string;
  description: string;
  url: string;
  image?: string;
}) => ({
  '@type': 'ProfilePage',
  '@id': `${options.url}/#profilepage`,
  url: options.url,
  name: options.name,
  description: options.description,
  ...(options.image ? { image: options.image } : {}),
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
  image: `${SITE_URL}/og/podcast.png`,
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

// ============================================
// Page-specific FAQ content (VAL-SD-007)
// ============================================

export const awsFAQs: FAQItem[] = [
  {
    question: 'What is the AWS Community Builders program?',
    answer:
      'The AWS Community Builders program offers technical resources, mentorship, and networking opportunities to AWS enthusiasts and emerging thought leaders who are passionate about sharing knowledge and connecting with the technical community.',
  },
  {
    question: 'How did Christian join the AI Engineering track?',
    answer:
      'Christian was accepted into the program under the AI Engineering track, reflecting the work he does every day at Altivum Inc. building production AI systems on AWS, from RAG-powered conversational agents to serverless inference pipelines and intelligent document processing.',
  },
  {
    question: 'What does being a Community Builder mean?',
    answer:
      "It isn't a certification or a partnership. It's a recognition of builders, people who are actively creating, learning, and sharing in the AWS ecosystem. For Christian, it's an extension of the same mission: translating complex cloud and AI capabilities into real-world impact.",
  },
  {
    question: 'What AWS services does Christian work with?',
    answer:
      'Christian builds production AI systems on Amazon Web Services using Amazon Bedrock, serverless architectures, AWS Lambda, and retrieval-augmented generation (RAG) pipelines. His work spans conversational agents, inference pipelines, and intelligent document processing for veterans and small businesses.',
  },
];

export const claudeFAQs: FAQItem[] = [
  {
    question: 'How does Christian use Claude in production?',
    answer:
      'Claude is the foundation of the AI systems Christian builds at Altivum Inc. Every conversational interface, RAG pipeline, and intelligent automation runs on Claude, from the streaming chat agent on this site (Claude Haiku 4.5 with retrieval-augmented generation) to AI-augmented development workflows.',
  },
  {
    question: 'What AI systems run on Claude?',
    answer:
      'The AI chat on this site is powered by Claude Haiku 4.5 with retrieval-augmented generation, and the development workflows that built it use Claude Code. Claude is embedded in how Christian thinks about and delivers real-world AI systems that people use every day.',
  },
  {
    question: 'What is applied AI engineering?',
    answer:
      'Applied AI engineering is the practice of building real systems that are reliable, observable, and secure, not proofs of concept. It means shipping software that people use every day with guardrails, rate limiting, cost monitoring, and observability built in.',
  },
  {
    question: 'What Anthropic Academy certifications does Christian hold?',
    answer:
      'Christian holds multiple Anthropic Academy certifications including Claude with Amazon Bedrock, Claude with the Anthropic API, Introduction to Subagents, Claude Code in Action, Introduction to Model Context Protocol, Claude Code 101, Claude 101, Introduction to Claude Cowork, and the AI Fluency framework series. Each certification is verifiable via Skilljar.',
  },
];

export const linksFAQs: FAQItem[] = [
  {
    question: 'Where can I find Christian Perez online?',
    answer:
      'Christian Perez (@thechrisgrey) is active across LinkedIn, X (Twitter), Substack, DEV Community, GitHub, Facebook, and Linktree. This links page collects every profile and project in one place, including the AWS Builder profile and Arizona State University faculty page.',
  },
  {
    question: 'What is the AWS Builder profile?',
    answer:
      "The AWS Builder profile showcases Christian's cloud architecture projects, technical insights, and contributions to the AWS community as an AWS Community Builder in the AI Engineering track. Connect at builder.aws.com or scan the QR code on the links page.",
  },
  {
    question: 'What websites and projects does Christian Perez run?',
    answer:
      'Christian runs Altivum Inc. (the parent company), Altivum Logic (multicloud infrastructure and web development services), and VetROI (an AI-powered veteran career transition tool). Each is linked from the Websites & Projects section of the links page.',
  },
  {
    question: 'How can I contact Christian Perez?',
    answer:
      'You can email Christian at christian.perez@altivum.ai, call (615) 219-9425, or use the contact form at thechrisgrey.com/contact for speaking engagements, media inquiries, or consulting through Altivum Logic. The links page also surfaces the fastest paths to each inbox.',
  },
];

// ============================================
// New schema builders (VAL-SD-003, VAL-SD-004, VAL-SD-005, VAL-SD-006)
// ============================================

interface ArticleSchemaOptions {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  image: string;
  articleSection?: string;
  keywords?: string;
  wordCount?: number;
}

/**
 * Article schema for blog posts (VAL-SD-003).
 *
 * Replaces the prior `BlogPosting` node. Google's rich-result eligibility for
 * articles is keyed on the `Article` type, and the required fields mirror what
 * Google's documentation asks for: headline, datePublished, dateModified,
 * author (referencing the canonical Person), image, publisher (referencing the
 * canonical Organization), mainEntityOfPage matching the canonical URL, and
 * articleSection.
 */
export const buildArticleSchema = (options: ArticleSchemaOptions) => ({
  '@type': 'Article',
  '@id': `${options.url}/#article`,
  headline: options.headline,
  description: options.description,
  datePublished: options.datePublished,
  ...(options.dateModified ? { dateModified: options.dateModified } : {}),
  author: {
    '@id': `${SITE_URL}/#person`,
  },
  publisher: {
    '@id': `${ALTIVUM_URL}/#organization`,
  },
  image: options.image,
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': options.url,
  },
  ...(options.articleSection ? { articleSection: options.articleSection } : {}),
  ...(options.keywords ? { keywords: options.keywords } : {}),
  ...(options.wordCount ? { wordCount: options.wordCount } : {}),
  inLanguage: 'en-US',
});

/**
 * PodcastEpisode schema (VAL-SD-005).
 *
 * Each episode emits a PodcastEpisode node with name, datePublished, duration
 * (ISO 8601 format), and partOfSeries referencing the canonical PodcastSeries.
 */
export const buildPodcastEpisodeSchema = (options: {
  name: string;
  description: string;
  url: string;
  datePublished: string;
  duration: string; // "HH:MM:SS" or "MM:SS"
  episodeNumber?: number;
  seasonNumber?: number;
  partOfSeriesId?: string;
}) => ({
  '@type': 'PodcastEpisode',
  '@id': `${options.url}/#episode`,
  name: options.name,
  description: options.description,
  url: options.url,
  datePublished: options.datePublished,
  // Google expects ISO 8601 duration (e.g. "PT40M21S"). Convert "MM:SS" or
  // "HH:MM:SS" into that form so the value is schema-valid.
  duration: iso8601Duration(options.duration),
  ...(options.episodeNumber ? { episodeNumber: options.episodeNumber } : {}),
  ...(options.seasonNumber ? { partOfSeason: { '@type': 'PodcastSeason', seasonNumber: options.seasonNumber } } : {}),
  partOfSeries: {
    '@id': options.partOfSeriesId ?? `${SITE_URL}/podcast#podcast`,
  },
});

/**
 * Convert a "HH:MM:SS" or "MM:SS" duration string into an ISO 8601 duration
 * ("PT#H#M#S"). Used by buildPodcastEpisodeSchema so the emitted duration is
 * schema-valid regardless of the source format.
 */
function iso8601Duration(input: string): string {
  const parts = input.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return input;
  let hours: number;
  let minutes: number;
  let seconds: number;
  if (parts.length === 3) {
    [hours, minutes, seconds] = parts as [number, number, number];
  } else if (parts.length === 2) {
    hours = 0;
    [minutes, seconds] = parts as [number, number];
  } else {
    return input;
  }
  let out = 'PT';
  if (hours > 0) out += `${hours}H`;
  if (minutes > 0) out += `${minutes}M`;
  if (seconds > 0 || out === 'PT') out += `${seconds}S`;
  return out;
}

/**
 * EducationalOccupationalCredential schema for page-specific credentials
 * (VAL-SD-006).
 *
 * /aws and /claude each emit at least one of these nodes for the visible
 * credentials on the page, outside the global `Person.hasCredential` array.
 * `recognizedBy` references the issuing body (AWS or Anthropic).
 */
export const buildCredentialSchema = (options: {
  name: string;
  description: string;
  url?: string;
  credentialCategory: string;
  recognizedBy: { name: string; url?: string };
}) => ({
  '@type': 'EducationalOccupationalCredential',
  name: options.name,
  description: options.description,
  credentialCategory: options.credentialCategory,
  recognizedBy: {
    '@type': 'Organization',
    name: options.recognizedBy.name,
    ...(options.recognizedBy.url ? { url: options.recognizedBy.url } : {}),
  },
  ...(options.url ? { url: options.url } : {}),
});

/**
 * CollectionPage schema for the /blog listing (VAL-SD-004).
 *
 * Describes the page as a collection of blog posts. When the post list is
 * available (client-side after the Sanity fetch), pass it via `posts` so the
 * schema references each post's Article URL via `hasPart`. The prerendered
 * HTML emits the base CollectionPage without post references (posts are
 * dynamic); the client-rendered page enriches it once posts load.
 */
export const buildBlogCollectionPageSchema = (options: {
  url: string;
  name: string;
  description: string;
  posts?: { title: string; url: string }[];
  image?: string;
}) => ({
  '@type': 'CollectionPage',
  '@id': `${options.url}/#collectionpage`,
  url: options.url,
  name: options.name,
  description: options.description,
  ...(options.image ? { image: options.image } : {}),
  isPartOf: {
    '@id': `${SITE_URL}/#website`,
  },
  about: {
    '@id': `${SITE_URL}/#person`,
  },
  inLanguage: 'en-US',
  ...(options.posts && options.posts.length > 0
    ? {
        hasPart: options.posts.map((p) => ({
          '@type': 'Article',
          '@id': `${p.url}/#article`,
          headline: p.title,
          url: p.url,
        })),
      }
    : {}),
});
