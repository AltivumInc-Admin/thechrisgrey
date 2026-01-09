/**
 * Centralized social media and external link definitions
 * Use these constants throughout the app to ensure consistency and easy updates
 */

export const SOCIAL_LINKS = {
  // Personal Social Media
  linkedin: 'https://www.linkedin.com/in/christian-perez-altivum/',
  twitter: 'https://x.com/x_thechrisgrey',
  instagram: 'https://www.instagram.com/thechrisgrey/',
  github: 'https://github.com/AltivumInc-Admin',
  facebook: 'https://www.facebook.com/thechrisgrey',
  substack: 'https://substack.com/@thechrisgrey',
  linktree: 'https://linktr.ee/thechrisgrey',
  devto: 'https://dev.to/thechrisgrey',
  asu: 'https://search.asu.edu/profile/3714457',
  awsBuilder: 'https://builder.aws.com/profile',
  email: 'mailto:christian.perez@altivum.ai',
  phone: 'tel:+16152199425',

  // Company Social Media
  altivumLinkedIn: 'https://www.linkedin.com/company/altivuminc',
  altivumTwitter: 'https://x.com/AltivumAI',
  altivumFacebook: 'https://www.facebook.com/profile.php?id=61576915349985',
  altivumYouTube: 'https://www.youtube.com/@AltivumPress',
  altivumEmail: 'mailto:info@altivum.ai',
  altivumLogicEmail: 'mailto:logic@altivum.ai',

  // Websites
  altivum: 'https://altivum.ai',
  altivumLogic: 'https://logic.altivum.ai',
  vetroi: 'https://vetroi.altivum.ai',
  vectorPodcast: 'https://vector.altivum.ai',

  // External
  amazonBook: 'https://a.co/d/iC9TEDW',
  buzzsproutRSS: 'https://feeds.buzzsprout.com/2554153.rss',
} as const;

export type SocialLinkKey = keyof typeof SOCIAL_LINKS;
