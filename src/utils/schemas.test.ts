import { describe, it, expect } from 'vitest';
import {
  buildPersonSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildFAQSchema,
  buildBreadcrumbSchema,
  buildWebPageSchema,
  buildProfilePageSchema,
  buildBookSchema,
  buildPodcastSeriesSchema,
  buildServiceSchema,
  buildAltivumServicesSchemas,
  buildContactPageSchema,
  buildVideoObjectSchema,
  buildItemListSchema,
  buildFoundationOrganizationSchema,
  homeFAQs,
  aboutFAQs,
  altivumFAQs,
  podcastFAQs,
  bookFAQs,
  blogFAQs,
  contactFAQs,
} from './schemas';

describe('schemas', () => {
  describe('buildPersonSchema', () => {
    it('should return a Person schema with correct type and id', () => {
      const schema = buildPersonSchema();
      expect(schema['@type']).toBe('Person');
      expect(schema['@id']).toBe('https://thechrisgrey.com/#person');
    });

    it('should include name and alternate names', () => {
      const schema = buildPersonSchema();
      expect(schema.name).toBe('Christian Perez');
      expect(schema.alternateName).toContain('thechrisgrey');
      expect(schema.alternateName).toContain('Chris Perez');
    });

    it('should include job title and employer', () => {
      const schema = buildPersonSchema();
      expect(schema.jobTitle).toBe('Founder & CEO');
      expect(schema.worksFor).toEqual(expect.objectContaining({ '@type': 'Organization', name: 'Altivum Inc.' }));
    });

    it('should include credentials and awards', () => {
      const schema = buildPersonSchema();
      // Green Beret, Special Forces Medic (18D), and Anthropic Academy certs.
      expect(schema.hasCredential).toHaveLength(3);
      expect(schema.award).toHaveLength(1);
      expect(schema.award[0].name).toBe('Bronze Star Medal');
    });

    it('mirrors the Anthropic Academy certifications in hasCredential', () => {
      const schema = buildPersonSchema();
      const credentialNames = schema.hasCredential.map((c: { name: string }) => c.name);
      expect(credentialNames).toContain('Anthropic Academy Certifications');
      expect(credentialNames).toContain('Green Beret');
      expect(credentialNames).toContain('Special Forces Medic (18D)');
    });

    it('should include alumni, membership, and sameAs links', () => {
      const schema = buildPersonSchema();
      expect(schema.alumniOf.name).toBe('Arizona State University');
      expect(schema.memberOf).toHaveLength(2);
      expect(schema.sameAs.length).toBeGreaterThan(0);
    });

    it('should include knowsAbout array', () => {
      const schema = buildPersonSchema();
      expect(schema.knowsAbout).toContain('Cloud Architecture');
      expect(schema.knowsAbout).toContain('Artificial Intelligence');
    });
  });

  describe('buildOrganizationSchema', () => {
    it('should return a Corporation schema with correct type and id', () => {
      const schema = buildOrganizationSchema();
      expect(schema['@type']).toBe('Corporation');
      expect(schema['@id']).toBe('https://altivum.ai/#organization');
    });

    it('should include legal name and founding info', () => {
      const schema = buildOrganizationSchema();
      expect(schema.legalName).toBe('Altivum Inc.');
      expect(schema.foundingDate).toBe('2025-02');
      expect(schema.foundingLocation.name).toBe('Clarksville, Tennessee');
    });

    it('should include contact point with available languages', () => {
      const schema = buildOrganizationSchema();
      expect(schema.contactPoint.contactType).toBe('customer service');
      expect(schema.contactPoint.availableLanguage).toContain('English');
      expect(schema.contactPoint.availableLanguage).toContain('Spanish');
    });

    it('should include award info', () => {
      const schema = buildOrganizationSchema();
      expect(schema.award.name).toBe('Veteran Business of the Month');
    });

    it('should use the live (no-hyphen) LinkedIn company URL from SOCIAL_LINKS', () => {
      const schema = buildOrganizationSchema();
      // The hyphenated /company/altivum-inc 404s; the canonical profile is /altivuminc.
      expect(schema.sameAs).toContain('https://www.linkedin.com/company/altivuminc');
      expect(schema.sameAs).not.toContain('https://www.linkedin.com/company/altivum-inc');
    });

    it('claims the AltivumInc-Admin GitHub on the Organization, not the Person (no entity ambiguity)', () => {
      // github.com/AltivumInc-Admin is Altivum's account (the site's GitHub everywhere);
      // the same sameAs URL on both Person and Org is an ambiguous entity signal.
      const GH = 'https://github.com/AltivumInc-Admin';
      expect(buildOrganizationSchema().sameAs).toContain(GH);
      expect(buildPersonSchema().sameAs).not.toContain(GH);
    });
  });

  describe('buildWebSiteSchema', () => {
    it('should return a WebSite schema with correct properties', () => {
      const schema = buildWebSiteSchema();
      expect(schema['@type']).toBe('WebSite');
      expect(schema['@id']).toBe('https://thechrisgrey.com/#website');
      expect(schema.url).toBe('https://thechrisgrey.com');
      expect(schema.inLanguage).toBe('en-US');
    });

    it('should reference the person as publisher', () => {
      const schema = buildWebSiteSchema();
      expect(schema.publisher['@id']).toBe('https://thechrisgrey.com/#person');
    });
  });

  describe('buildFAQSchema', () => {
    it('should return a FAQPage schema with mapped questions', () => {
      const faqs = [
        { question: 'Q1?', answer: 'A1' },
        { question: 'Q2?', answer: 'A2' },
      ];
      const schema = buildFAQSchema(faqs);
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(2);
    });

    it('should map each FAQ to Question/Answer types', () => {
      const faqs = [{ question: 'Test question?', answer: 'Test answer' }];
      const schema = buildFAQSchema(faqs);
      const entity = schema.mainEntity[0];
      expect(entity['@type']).toBe('Question');
      expect(entity.name).toBe('Test question?');
      expect(entity.acceptedAnswer['@type']).toBe('Answer');
      expect(entity.acceptedAnswer.text).toBe('Test answer');
    });

    it('should handle an empty FAQ array', () => {
      const schema = buildFAQSchema([]);
      expect(schema.mainEntity).toHaveLength(0);
    });
  });

  describe('buildBreadcrumbSchema', () => {
    it('should return a BreadcrumbList with position indices starting at 1', () => {
      const items = [
        { name: 'Home', url: 'https://thechrisgrey.com' },
        { name: 'Blog', url: 'https://thechrisgrey.com/blog' },
      ];
      const schema = buildBreadcrumbSchema(items);
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[1].position).toBe(2);
      expect(schema.itemListElement[0].name).toBe('Home');
    });

    it('should handle empty breadcrumbs', () => {
      const schema = buildBreadcrumbSchema([]);
      expect(schema.itemListElement).toHaveLength(0);
    });
  });

  describe('buildWebPageSchema', () => {
    it('should return a WebPage schema with provided options', () => {
      const schema = buildWebPageSchema({
        name: 'Test Page',
        description: 'A test page',
        url: 'https://thechrisgrey.com/test',
      });
      expect(schema['@type']).toBe('WebPage');
      expect(schema.name).toBe('Test Page');
      expect(schema.description).toBe('A test page');
      expect(schema.url).toBe('https://thechrisgrey.com/test');
    });

    it('should include breadcrumb reference when breadcrumbs provided', () => {
      const schema = buildWebPageSchema({
        name: 'Test',
        description: 'Test',
        url: 'https://thechrisgrey.com/test',
        breadcrumbs: [{ name: 'Home', url: '/' }],
      });
      expect(schema.breadcrumb).toEqual({ '@id': 'https://thechrisgrey.com/#breadcrumb' });
    });

    it('should have undefined breadcrumb when none provided', () => {
      const schema = buildWebPageSchema({
        name: 'Test',
        description: 'Test',
        url: 'https://thechrisgrey.com/test',
      });
      expect(schema.breadcrumb).toBeUndefined();
    });
  });

  describe('buildProfilePageSchema', () => {
    it('should return a ProfilePage schema', () => {
      const schema = buildProfilePageSchema({
        name: 'About',
        description: 'About page',
        url: 'https://thechrisgrey.com/about',
      });
      expect(schema['@type']).toBe('ProfilePage');
      expect(schema.mainEntity['@id']).toBe('https://thechrisgrey.com/#person');
      expect(schema.isPartOf['@id']).toBe('https://thechrisgrey.com/#website');
    });
  });

  describe('buildBookSchema', () => {
    it('should return a Book schema for Beyond the Assessment', () => {
      const schema = buildBookSchema();
      expect(schema['@type']).toBe('Book');
      expect(schema.name).toBe('Beyond the Assessment');
      expect(schema.author['@id']).toBe('https://thechrisgrey.com/#person');
      expect(schema.genre).toContain('Leadership');
    });

    it('should include an offer with Amazon URL', () => {
      const schema = buildBookSchema();
      expect(schema.offers.url).toBe('https://a.co/d/iC9TEDW');
      expect(schema.offers.priceCurrency).toBe('USD');
    });
  });

  describe('buildPodcastSeriesSchema', () => {
    it('should return a PodcastSeries schema', () => {
      const schema = buildPodcastSeriesSchema();
      expect(schema['@type']).toBe('PodcastSeries');
      expect(schema.name).toBe('The Vector Podcast');
      expect(schema.image).toBe('https://thechrisgrey.com/tvp.png');
    });
  });

  describe('buildServiceSchema', () => {
    it('should return a Service schema with provided data', () => {
      const schema = buildServiceSchema({
        name: 'Test Service',
        description: 'A service',
        serviceType: 'Consulting',
        url: 'https://example.com',
      });
      expect(schema['@type']).toBe('Service');
      expect(schema.name).toBe('Test Service');
      expect(schema.provider['@id']).toBe('https://altivum.ai/#organization');
      expect(schema.url).toBe('https://example.com');
    });

    it('should handle serviceType as an array', () => {
      const schema = buildServiceSchema({
        name: 'Multi',
        description: 'Multiple types',
        serviceType: ['Type A', 'Type B'],
      });
      expect(schema.serviceType).toEqual(['Type A', 'Type B']);
    });
  });

  describe('buildAltivumServicesSchemas', () => {
    it('should return exactly 3 service schemas', () => {
      const schemas = buildAltivumServicesSchemas();
      expect(schemas).toHaveLength(3);
    });

    it('should include Vanguard, Logic, and Press', () => {
      const schemas = buildAltivumServicesSchemas();
      const names = schemas.map((s) => s.name);
      expect(names).toContain('Altivum Vanguard');
      expect(names).toContain('Altivum Logic');
      expect(names).toContain('Altivum Press');
    });
  });

  describe('buildContactPageSchema', () => {
    it('should return a ContactPage schema', () => {
      const schema = buildContactPageSchema();
      expect(schema['@type']).toBe('ContactPage');
      expect(schema.url).toBe('https://thechrisgrey.com/contact');
      expect(schema.mainEntity['@id']).toBe('https://thechrisgrey.com/#person');
    });
  });

  describe('buildVideoObjectSchema', () => {
    it('emits the Google-required uploadDate, name, and thumbnailUrl', () => {
      const schema = buildVideoObjectSchema({ videoId: 'abc123', title: 'Episode 1', uploadDate: '2026-02-20' });
      expect(schema['@type']).toBe('VideoObject');
      expect(schema.name).toBe('Episode 1');
      expect(schema.uploadDate).toBe('2026-02-20');
      expect(schema.thumbnailUrl).toBe('https://img.youtube.com/vi/abc123/hqdefault.jpg');
      expect(schema.contentUrl).toBe('https://www.youtube.com/watch?v=abc123');
    });

    it('defaults the thumbnail to the always-generated hqdefault, never maxresdefault', () => {
      const schema = buildVideoObjectSchema({ videoId: 'xyz', title: 't', uploadDate: '2026-01-01' });
      expect(schema.thumbnailUrl).toContain('/hqdefault.jpg');
      expect(schema.thumbnailUrl).not.toContain('maxresdefault');
    });

    it('honors an explicit thumbnailUrl override', () => {
      const schema = buildVideoObjectSchema({
        videoId: 'xyz',
        title: 't',
        uploadDate: '2026-01-01',
        thumbnailUrl: 'https://example.com/custom.jpg',
      });
      expect(schema.thumbnailUrl).toBe('https://example.com/custom.jpg');
    });
  });

  describe('pre-built FAQ arrays', () => {
    it('should have non-empty FAQ arrays for all pages', () => {
      expect(homeFAQs.length).toBeGreaterThan(0);
      expect(aboutFAQs.length).toBeGreaterThan(0);
      expect(altivumFAQs.length).toBeGreaterThan(0);
      expect(podcastFAQs.length).toBeGreaterThan(0);
      expect(bookFAQs.length).toBeGreaterThan(0);
      expect(blogFAQs.length).toBeGreaterThan(0);
      expect(contactFAQs.length).toBeGreaterThan(0);
    });

    it('should have question and answer fields for every FAQ item', () => {
      const allFaqs = [
        ...homeFAQs,
        ...aboutFAQs,
        ...altivumFAQs,
        ...podcastFAQs,
        ...bookFAQs,
        ...blogFAQs,
        ...contactFAQs,
      ];
      allFaqs.forEach((faq) => {
        expect(faq.question).toBeTruthy();
        expect(faq.answer).toBeTruthy();
      });
    });
  });

  // Per-@type required-field contracts. Substring (toContain) tests cannot catch a
  // builder that silently drops a schema.org / Google REQUIRED property (the project's
  // own documented "green tests over broken behavior" failure mode). This harness
  // asserts every builder emits the fields its rich-result eligibility depends on.
  describe('JSON-LD required-field contracts', () => {
    const REQUIRED_FIELDS_BY_TYPE: Record<string, string[]> = {
      Person: ['@type', '@id', 'name', 'url'],
      Corporation: ['@type', '@id', 'name', 'url'],
      WebSite: ['@type', '@id', 'url', 'name'],
      WebPage: ['@type', '@id', 'url', 'name'],
      ProfilePage: ['@type', '@id', 'url', 'name', 'mainEntity'],
      Book: ['@type', 'name', 'author'],
      PodcastSeries: ['@type', 'name', 'url'],
      FAQPage: ['@type', 'mainEntity'],
      BreadcrumbList: ['@type', 'itemListElement'],
      VideoObject: ['@type', 'name', 'thumbnailUrl', 'uploadDate', 'contentUrl'],
      ItemList: ['@type', 'itemListElement', 'numberOfItems'],
      NonprofitOrganization: ['@type', '@id', 'name', 'url'],
      Service: ['@type', 'name', 'provider'],
      ContactPage: ['@type', '@id', 'name', 'url'],
    };

    const assertRequiredFields = (node: Record<string, unknown>) => {
      const type = node['@type'] as string;
      const required = REQUIRED_FIELDS_BY_TYPE[type];
      expect(required, `no required-field contract registered for @type "${type}"`).toBeDefined();
      for (const field of required) {
        expect(node[field], `${type} is missing required field "${field}"`).toBeDefined();
      }
    };

    it('every builder emits its schema.org / Google-required fields', () => {
      assertRequiredFields(buildPersonSchema());
      assertRequiredFields(buildOrganizationSchema());
      assertRequiredFields(buildWebSiteSchema());
      assertRequiredFields(buildBookSchema());
      assertRequiredFields(buildPodcastSeriesSchema());
      assertRequiredFields(buildVideoObjectSchema({ videoId: 'x', title: 't', uploadDate: '2026-02-20' }));
      assertRequiredFields(buildFoundationOrganizationSchema());
      assertRequiredFields(buildContactPageSchema());
      assertRequiredFields(buildWebPageSchema({ name: 'n', description: 'd', url: 'https://thechrisgrey.com/x' }));
      assertRequiredFields(
        buildProfilePageSchema({ name: 'n', description: 'd', url: 'https://thechrisgrey.com/about' }),
      );
      assertRequiredFields(buildFAQSchema([{ question: 'q', answer: 'a' }]));
      assertRequiredFields(buildBreadcrumbSchema([{ name: 'Home', url: 'https://thechrisgrey.com' }]));
      assertRequiredFields(buildItemListSchema({ name: 'l', items: [{ name: 'a', url: 'https://x' }] }));
      buildAltivumServicesSchemas().forEach((s) => assertRequiredFields(s));
    });
  });
});
