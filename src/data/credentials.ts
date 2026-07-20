/**
 * Credentials & Recognition — the single typed source for the visible trust
 * signals on /about and the JSON-LD they mirror.
 *
 * Each entry maps to a field on the Person (or Organization) JSON-LD node so the
 * visible "Credentials & Recognition" section and the structured data stay in
 * lockstep. The `field` discriminator tells `buildPersonSchema` where to emit
 * the entry (hasCredential / award); `memberOf` and `organizationAward` entries
 * are rendered visibly and mirrored by the hand-written memberOf / Organization
 * award nodes in schemas.ts.
 *
 * Replace or extend these entries as new credentials are earned; the About page
 * section and the Person JSON-LD update from this single source.
 */
export type CredentialField = 'hasCredential' | 'award' | 'memberOf' | 'organizationAward';

export interface Credential {
  /** Stable id used for React keys. */
  id: string;
  /** Display label shown in the visible Credentials & Recognition section. */
  label: string;
  /** High-level grouping shown as an eyebrow above the credential. */
  category: string;
  /** Short description shown under the label. */
  description: string;
  /** Issuing or recognizing body (e.g., "U.S. Army", "Anthropic"). */
  issuedBy?: string;
  /** Optional verification / reference URL. */
  url?: string;
  /** Icon name (Material Icons) rendered alongside the credential. */
  icon?: string;
  /** Which JSON-LD field this credential mirrors on the Person node. */
  field: CredentialField;
  /**
   * For `field === 'hasCredential'`, the schema.org credentialCategory value
   * emitted on the EducationalOccupationalCredential node.
   */
  credentialCategory?: string;
}

export const CREDENTIALS: Credential[] = [
  {
    id: 'bronze-star',
    label: 'Bronze Star Medal',
    category: 'Military Award',
    description: 'Awarded for meritorious service in Afghanistan with SFOD-A 1236.',
    issuedBy: 'U.S. Army',
    icon: 'military_tech',
    field: 'award',
  },
  {
    id: 'green-beret',
    label: 'Green Beret',
    category: 'Military Qualification',
    description: 'Member of U.S. Army Special Forces (1st Special Forces Group, Airborne).',
    issuedBy: 'U.S. Army',
    icon: 'shield',
    field: 'hasCredential',
    credentialCategory: 'Military Qualification',
  },
  {
    id: 'special-forces-medic-18d',
    label: 'Special Forces Medic (18D)',
    category: 'Military Qualification',
    description: 'U.S. Army Special Forces Medical Sergeant qualification.',
    issuedBy: 'U.S. Army',
    icon: 'medical_services',
    field: 'hasCredential',
    credentialCategory: 'Military Qualification',
  },
  {
    id: 'aws-community-builder',
    label: 'AWS Community Builder',
    category: 'Community Program',
    description: 'Recognized builder in the AI Engineering track of the AWS Community Builders program.',
    issuedBy: 'Amazon Web Services',
    icon: 'cloud',
    field: 'memberOf',
  },
  {
    id: 'anthropic-academy',
    label: 'Anthropic Academy Certifications',
    category: 'Professional Certification',
    description:
      'Multiple certifications completed through Anthropic Academy, including Claude with Amazon Bedrock, the Claude API, Claude Code, Model Context Protocol, and AI Fluency.',
    issuedBy: 'Anthropic',
    icon: 'school',
    field: 'hasCredential',
    credentialCategory: 'Professional Certification',
  },
  {
    id: 'veteran-business-of-the-month',
    label: 'Veteran Business of the Month',
    category: 'Business Recognition',
    description: 'Altivum Inc. recognized by the Clarksville Area Chamber of Commerce, December 2025.',
    issuedBy: 'Clarksville Area Chamber of Commerce',
    url: 'https://www.clarksvilleonline.com/2025/12/12/clarksville-area-chamber-of-commerces-veteran-business-of-the-month-altivum-inc/',
    icon: 'business_center',
    field: 'organizationAward',
  },
];
