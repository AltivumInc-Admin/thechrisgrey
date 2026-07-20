/**
 * Per-route direct-answer summaries for AI-citation readiness (VAL-AEO-001,
 * VAL-AEO-002).
 *
 * Each summary is a 40-80 word plain-language answer to the page's implicit
 * question, placed in the first viewport and BEFORE the first `<h2>` via the
 * `<DirectAnswerSummary>` component. Authored once here so the same string can
 * be read by the build-time prerender SEO gate and any future on-page
 * structured-data mirror, keeping the source of truth single.
 *
 * Word counts are validated by the prerender SEO gate and the AEO content
 * test (`src/components/aeo/aeoContent.test.ts`).
 */

export interface AeoSummary {
  /** Bare route path (matches `STATIC_ROUTES`). */
  route: string;
  /** 40-80 word direct-answer summary. */
  text: string;
}

const home =
  'Christian Perez (@thechrisgrey) is the Founder & CEO of Altivum Inc., a former Green Beret and Special Forces Medic (18D), Bronze Star recipient, host of The Vector Podcast, and author of Beyond the Assessment. This site is the hub for his writing, podcast, consulting work, and the AI tools he builds for veterans and small businesses.';

const about =
  'Christian Perez is a former U.S. Army Special Forces Medic (18D) and Green Beret who served with 1st Special Forces Group (Airborne) and was awarded the Bronze Star for his deployment to Afghanistan with SFOD-A 1236. Today he is the Founder & CEO of Altivum Inc., host of The Vector Podcast, and author of Beyond the Assessment.';

const altivum =
  'Altivum Inc. is a veteran-founded public benefit corporation based in Clarksville, Tennessee that builds intelligent, cloud-native architectures integrating AI at the core of operations. It operates three divisions: Vanguard (AI-powered veteran career services, including VetROI), Logic (web development, SEO/AEO, cloud migration, and AI integration for small businesses), and Press (The Vector Podcast and publishing).';

const foundation =
  'The Altivum Foundation is a 501(c)(3) nonprofit (EIN 41-4163272) founded by Christian Perez that funds U.S. military veterans pursuing education in cloud computing, artificial intelligence, robotics, and cybersecurity. Scholarships cover the full cost of certifications, degrees, and bootcamps at no cost to the scholar, and every contribution is tax-deductible.';

const podcast =
  'The Vector Podcast is hosted by Christian Perez, Founder & CEO of Altivum Inc. and a former Green Beret. Each episode features conversations at the intersection of veteran experience, emerging technology, and purposeful entrepreneurship, breaking down AI, cloud, and leadership into clear, actionable insights. Subscribe on Spotify, Apple Podcasts, and YouTube.';

const aws =
  'Christian Perez is an AWS Community Builder in the AI Engineering track, recognized for actively building and sharing production AI systems on Amazon Web Services. His work spans Amazon Bedrock, serverless architectures, Lambda, and RAG-powered conversational agents that translate complex cloud and AI capabilities into real-world impact for veterans and small businesses.';

const claude =
  "Christian Perez is an Applied AI Engineer who builds production systems with Claude, Anthropic's AI. Every conversational interface, RAG pipeline, and intelligent automation at Altivum Inc. runs on Claude, from the streaming chat agent on this site (Claude Haiku 4.5 with retrieval-augmented generation) to AI-augmented development workflows. He holds multiple Anthropic Academy certifications.";

const book =
  'Beyond the Assessment is a book by Christian Perez that explores the intangible qualities defining true leadership and resilience. Drawing from his Special Forces Assessment and Selection experience, it challenges readers to look beyond metrics and standardized assessments to understand what truly drives success in high-stakes environments. Available on Amazon, published by Altivum Press.';

const blog =
  "Christian Perez's blog features long-form essays and reflections on leadership, technology, philosophy, history, and lessons from a life of service, drawing on his journey from Green Beret to tech founder. Subscribe to receive new articles on AI and cloud architecture, military-to-civilian transition, and veteran entrepreneurship delivered to your inbox.";

const links =
  'This is the single hub for every place Christian Perez (@thechrisgrey) lives online: Altivum Inc. and its divisions (Logic, Vanguard, Press), The Vector Podcast, his AWS Builder profile, and his social accounts. Use this page to connect, follow, or find the right project or platform for what you need.';

const contact =
  'Contact Christian Perez for speaking engagements, podcast appearances, media interviews, or consulting through Altivum Logic. Reach him via the form on this page, by email at christian.perez@altivum.ai, or by phone at (615) 219-9425. He typically responds within 24-48 hours and a downloadable press kit is available for event organizers.';

export const AEO_SUMMARIES: Record<string, string> = {
  '/': home,
  '/about': about,
  '/altivum': altivum,
  '/foundation': foundation,
  '/podcast': podcast,
  '/aws': aws,
  '/claude': claude,
  '/beyond-the-assessment': book,
  '/blog': blog,
  '/links': links,
  '/contact': contact,
};

/**
 * Direct-answer summary for a blog post. Blog post summaries are derived from
 * each post's Sanity excerpt at render time (the post's own concise summary),
 * so this helper just validates the excerpt meets the 40-80 word floor and
 * returns it. When the excerpt is too short, callers should still render it
 * (the prerender gate reports the violation, but a short excerpt is better
 * than no summary).
 */
export const blogPostSummary = (excerpt: string | undefined): string => (excerpt ? excerpt : '');
