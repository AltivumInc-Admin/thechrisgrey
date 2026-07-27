import { describe, it, expect, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { SEO } from './SEO';

// react-helmet-async with HelmetProvider context works in server mode.
// In jsdom, we check the document.head directly after render.
//
// SEO resolves per-route preconnects via useLocation(), so it must render
// inside a Router. The initial route is a neutral path with no route-specific
// preconnects (/about) so existing assertions are not affected by preconnect
// <link> tags, and a dedicated test below covers the per-route injection.

const renderSEO = (props: Parameters<typeof SEO>[0]) => {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/about']}>
        <SEO {...props} />
      </MemoryRouter>
    </HelmetProvider>,
  );
};

describe('SEO', () => {
  it('should render without crashing', () => {
    renderSEO({ title: 'Test', description: 'Test description' });
  });

  it('should set the page title with suffix', async () => {
    renderSEO({ title: 'About', description: 'About page' });
    await waitFor(() => {
      expect(document.title).toBe('About | Christian Perez');
    });
  });

  it('should not duplicate the site title when title matches the site name', async () => {
    renderSEO({ title: 'Christian Perez | thechrisgrey', description: 'Home' });
    await waitFor(() => {
      expect(document.title).toBe('Christian Perez | thechrisgrey');
    });
  });

  it('should set meta description', async () => {
    renderSEO({ title: 'Test', description: 'A test page description' });
    await waitFor(() => {
      const meta = document.querySelector('meta[name="description"]');
      expect(meta).toHaveAttribute('content', 'A test page description');
    });
  });

  it('should set OG type meta tag', async () => {
    renderSEO({ title: 'Test', description: 'desc', type: 'article' });
    await waitFor(() => {
      const meta = document.querySelector('meta[property="og:type"]');
      expect(meta).toHaveAttribute('content', 'article');
    });
  });

  it('should include keywords when provided', async () => {
    renderSEO({ title: 'Test', description: 'desc', keywords: 'react, testing' });
    await waitFor(() => {
      const meta = document.querySelector('meta[name="keywords"]');
      expect(meta).toHaveAttribute('content', 'react, testing');
    });
  });

  it('should not render keywords meta when keywords not provided', async () => {
    renderSEO({ title: 'Test', description: 'desc' });
    await waitFor(() => {
      expect(document.title).toBe('Test | Christian Perez');
    });
    // Verify no keywords meta is rendered for this component
    expect(document.querySelector('meta[name="keywords"]')).toBeNull();
  });

  it('should add noindex meta when noindex is true', async () => {
    renderSEO({ title: '404', description: 'Not found', noindex: true });
    await waitFor(() => {
      const meta = document.querySelector('meta[name="robots"]');
      expect(meta).toHaveAttribute('content', 'noindex, nofollow');
    });
  });

  it('emits an index, follow robots meta on indexable routes (VAL-SEO-010)', async () => {
    renderSEO({ title: 'About', description: 'desc', url: 'https://thechrisgrey.com/about' });
    await waitFor(() => {
      const meta = document.querySelector('meta[name="robots"]');
      expect(meta).toBeTruthy();
      const content = meta?.getAttribute('content') || '';
      expect(content).toContain('index');
      expect(content).toContain('follow');
      expect(content).not.toContain('noindex');
    });
  });

  it('aligns Person.image with the per-route og:image (VAL-SD-010)', async () => {
    renderSEO({ title: 'About', description: 'desc', url: 'https://thechrisgrey.com/about' });
    await waitFor(() => {
      const og = document.querySelector('meta[property="og:image"]');
      expect(og).toBeTruthy();
      const ogImage = og?.getAttribute('content');
      const script = document.querySelector('script[type="application/ld+json"]');
      expect(script).toBeTruthy();
      const graph = JSON.parse(script!.textContent!);
      const person = graph['@graph'].find((n: Record<string, unknown>) => n['@type'] === 'Person');
      expect(person.image).toBe(ogImage);
    });
  });

  it('should set canonical link', async () => {
    renderSEO({ title: 'Test', description: 'desc', url: 'https://thechrisgrey.com/test' });
    await waitFor(() => {
      const link = document.querySelector('link[rel="canonical"]');
      expect(link).toHaveAttribute('href', 'https://thechrisgrey.com/test');
    });
  });

  it('should include JSON-LD structured data script', async () => {
    renderSEO({ title: 'Test', description: 'desc' });
    await waitFor(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      expect(script).toBeTruthy();
      const content = script?.textContent || '';
      expect(content).toContain('@context');
      expect(content).toContain('schema.org');
    });
  });

  it('should include custom structured data in the graph', async () => {
    const customData = [{ '@type': 'Article', name: 'Test Article' }];
    renderSEO({ title: 'Test', description: 'desc', structuredData: customData });
    await waitFor(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      const content = script?.textContent || '';
      expect(content).toContain('Test Article');
    });
  });

  it('should include FAQ schema when faq prop is provided', async () => {
    const faqs = [{ question: 'What is this?', answer: 'A test.' }];
    renderSEO({ title: 'Test', description: 'desc', faq: faqs });
    await waitFor(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      const content = script?.textContent || '';
      expect(content).toContain('FAQPage');
      expect(content).toContain('What is this?');
    });
  });

  it('should include breadcrumb schema when breadcrumbs are provided', async () => {
    const breadcrumbs = [
      { name: 'Home', url: 'https://thechrisgrey.com' },
      { name: 'Blog', url: 'https://thechrisgrey.com/blog' },
    ];
    renderSEO({ title: 'Blog', description: 'desc', breadcrumbs });
    await waitFor(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      const content = script?.textContent || '';
      expect(content).toContain('BreadcrumbList');
    });
  });

  it('should include article meta tags when type is article', async () => {
    renderSEO({
      title: 'Blog Post',
      description: 'desc',
      type: 'article',
      datePublished: '2026-01-01',
      dateModified: '2026-01-02',
    });
    await waitFor(() => {
      const pubMeta = document.querySelector('meta[property="article:published_time"]');
      expect(pubMeta).toHaveAttribute('content', '2026-01-01');
      const modMeta = document.querySelector('meta[property="article:modified_time"]');
      expect(modMeta).toHaveAttribute('content', '2026-01-02');
    });
  });

  it('should set Twitter card meta tags', async () => {
    renderSEO({ title: 'Test', description: 'desc' });
    await waitFor(() => {
      const card = document.querySelector('meta[name="twitter:card"]');
      expect(card).toHaveAttribute('content', 'summary_large_image');
      const creator = document.querySelector('meta[name="twitter:creator"]');
      expect(creator).toHaveAttribute('content', '@thechrisgrey');
    });
  });

  it('derives the per-route OG card from the url when no image is provided', async () => {
    renderSEO({ title: 'AWS', description: 'desc', url: 'https://thechrisgrey.com/aws' });
    await waitFor(() => {
      const og = document.querySelector('meta[property="og:image"]');
      expect(og).toHaveAttribute('content', 'https://thechrisgrey.com/og/aws.png');
      const tw = document.querySelector('meta[name="twitter:image"]');
      expect(tw).toHaveAttribute('content', 'https://thechrisgrey.com/og/aws.png');
    });
  });

  it('falls back to /og.png when the url has no generated card (e.g. a blog post)', async () => {
    renderSEO({ title: 'Post', description: 'desc', url: 'https://thechrisgrey.com/blog/some-post' });
    await waitFor(() => {
      const meta = document.querySelector('meta[property="og:image"]');
      expect(meta).toHaveAttribute('content', 'https://thechrisgrey.com/og.png');
    });
  });

  it('should use custom OG image when provided', async () => {
    renderSEO({ title: 'Test', description: 'desc', image: 'https://example.com/custom.jpg' });
    await waitFor(() => {
      const meta = document.querySelector('meta[property="og:image"]');
      expect(meta).toHaveAttribute('content', 'https://example.com/custom.jpg');
    });
  });

  it('should set window.__PRERENDER_READY__ after the route head commits', async () => {
    // The build-time prerender crawl polls this flag. It is set by a useEffect in
    // SEO.tsx, which runs after React commits this component (and the title/meta/
    // JSON-LD it hoists into <head>) — NOT via onChangeClientState, which is a
    // no-op under react-helmet-async@3 on React 19. So the per-route <head> tags
    // are guaranteed present when the crawl reads the flag.
    delete (window as unknown as { __PRERENDER_READY__?: boolean }).__PRERENDER_READY__;
    renderSEO({ title: 'Test', description: 'desc' });
    await waitFor(() => {
      expect((window as unknown as { __PRERENDER_READY__?: boolean }).__PRERENDER_READY__).toBe(true);
    });
  });

  it('emits a parseable @graph containing the default Person, Organization, and WebSite nodes', async () => {
    renderSEO({ title: 'Test', description: 'desc' });
    await waitFor(() => {
      expect(document.querySelector('script[type="application/ld+json"]')).toBeTruthy();
    });
    const json = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(json['@context']).toBe('https://schema.org');
    expect(Array.isArray(json['@graph'])).toBe(true);
    const types = json['@graph'].map((n: Record<string, unknown>) => n['@type']);
    expect(types).toContain('Person');
    expect(types).toContain('Corporation');
    expect(types).toContain('WebSite');
  });

  it('emits no duplicate @id among top-level @graph nodes (guards @id node collisions)', async () => {
    // The finding this guards: two NODES sharing one @id within a single @graph
    // (e.g. /altivum re-declaring the Organization, or a blog post re-declaring the
    // Person as a partial author). The invariant is on top-level @graph MEMBERS —
    // nested { "@id": ... } references (worksFor, author, publisher) legitimately
    // repeat an @id and are not graph members, so we only inspect the array members.
    const customData = [
      {
        '@type': 'BlogPosting',
        '@id': 'https://thechrisgrey.com/blog/x/#article',
        headline: 'X',
        author: { '@id': 'https://thechrisgrey.com/#person' },
        publisher: { '@id': 'https://altivum.ai/#organization' },
      },
    ];
    renderSEO({
      title: 'Post',
      description: 'desc',
      url: 'https://thechrisgrey.com/blog/x',
      structuredData: customData,
    });
    await waitFor(() => {
      expect(document.querySelector('script[type="application/ld+json"]')).toBeTruthy();
    });
    const graph = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);

    const memberIds = (graph['@graph'] as Array<Record<string, unknown>>)
      .map((node) => node['@id'])
      .filter((id): id is string => typeof id === 'string');

    expect(new Set(memberIds).size).toBe(memberIds.length);
  });

  it('emits og:image:alt and twitter:image:alt from an explicit imageAlt prop (VAL-SEO-007)', async () => {
    renderSEO({ title: 'AWS', description: 'desc', url: 'https://thechrisgrey.com/aws', imageAlt: 'AWS hero' });
    await waitFor(() => {
      const og = document.querySelector('meta[property="og:image:alt"]');
      expect(og).toHaveAttribute('content', 'AWS hero');
      const tw = document.querySelector('meta[name="twitter:image:alt"]');
      expect(tw).toHaveAttribute('content', 'AWS hero');
    });
  });

  it('emits a non-empty default og:image:alt when imageAlt is not provided (VAL-SEO-007)', async () => {
    renderSEO({ title: 'About', description: 'desc', url: 'https://thechrisgrey.com/about' });
    await waitFor(() => {
      const og = document.querySelector('meta[property="og:image:alt"]');
      expect(og).toBeTruthy();
      expect((og?.getAttribute('content') || '').length).toBeGreaterThan(0);
      const tw = document.querySelector('meta[name="twitter:image:alt"]');
      expect(tw).toBeTruthy();
      expect((tw?.getAttribute('content') || '').length).toBeGreaterThan(0);
    });
  });

  it('falls back to the default imageAlt when an empty string is provided', async () => {
    renderSEO({ title: 'About', description: 'desc', url: 'https://thechrisgrey.com/about', imageAlt: '   ' });
    await waitFor(() => {
      const og = document.querySelector('meta[property="og:image:alt"]');
      expect((og?.getAttribute('content') || '').length).toBeGreaterThan(0);
    });
  });

  it('does not emit hreflang link tags (single-language site — VAL-SEO-004)', async () => {
    renderSEO({ title: 'About', description: 'desc', url: 'https://thechrisgrey.com/about' });
    await waitFor(() => {
      expect(document.title).toBe('About | Christian Perez');
    });
    const hreflangLinks = document.querySelectorAll('link[rel="alternate"][hreflang]');
    expect(hreflangLinks).toHaveLength(0);
  });

  it('emits exactly one canonical link and no hreflang alternates', async () => {
    renderSEO({ title: 'Test', description: 'desc', url: 'https://thechrisgrey.com/test' });
    await waitFor(() => {
      const canonical = document.querySelectorAll('link[rel="canonical"]');
      expect(canonical).toHaveLength(1);
      expect(canonical[0]).toHaveAttribute('href', 'https://thechrisgrey.com/test');
    });
    const alternates = document.querySelectorAll('link[rel="alternate"]');
    // No alternate links should be emitted by the SEO component (RSS is in the shell)
    expect(alternates).toHaveLength(0);
  });

  describe('per-route preconnect injection (VAL-PERF-008)', () => {
    const renderSEOAt = (route: string, props: Parameters<typeof SEO>[0]) =>
      render(
        <HelmetProvider>
          <MemoryRouter initialEntries={[route]}>
            <SEO {...props} />
          </MemoryRouter>
        </HelmetProvider>,
      );

    afterEach(() => {
      // React 19 + react-helmet-async + jsdom: Helmet's head-tag teardown
      // during unmount can throw removeChild on already-detached nodes. Match
      // the SEO integration test pattern: clear the tags Helmet injected, then
      // run cleanup() in try/catch so the unmount race never fails the test.
      document.head.querySelectorAll('link[rel="preconnect"]').forEach((el) => el.remove());
      try {
        cleanup();
      } catch {
        // ignore removeChild errors from Helmet + React 19 unmount race
      }
    });

    it('injects a preconnect to cdn.sanity.io when the route is /blog', async () => {
      renderSEOAt('/blog', { title: 'Blog', description: 'desc', url: 'https://thechrisgrey.com/blog' });
      await waitFor(() => {
        expect(document.title).toBe('Blog | Christian Perez');
      });
      const preconnect = document.head.querySelector('link[rel="preconnect"][href="https://cdn.sanity.io"]');
      expect(preconnect, '/blog should preconnect to cdn.sanity.io').not.toBeNull();
    });

    it('injects a preconnect to cdn.sanity.io for a /blog/:slug post', async () => {
      renderSEOAt('/blog/some-post', {
        title: 'Post',
        description: 'desc',
        url: 'https://thechrisgrey.com/blog/some-post',
      });
      await waitFor(() => {
        expect(document.title).toBe('Post | Christian Perez');
      });
      const preconnect = document.head.querySelector('link[rel="preconnect"][href="https://cdn.sanity.io"]');
      expect(preconnect, '/blog/:slug should preconnect to cdn.sanity.io').not.toBeNull();
    });

    it('does NOT inject cdn.sanity.io or CloudFront preconnects on /about', async () => {
      renderSEOAt('/about', { title: 'About', description: 'desc', url: 'https://thechrisgrey.com/about' });
      await waitFor(() => {
        expect(document.title).toBe('About | Christian Perez');
      });
      expect(
        document.head.querySelector('link[rel="preconnect"][href="https://cdn.sanity.io"]'),
        '/about must not preconnect to cdn.sanity.io',
      ).toBeNull();
      expect(
        document.head.querySelector('link[rel="preconnect"][href="https://d1x8296f4gso9u.cloudfront.net"]'),
        '/about must not preconnect to the CloudFront video origin',
      ).toBeNull();
    });
  });
});
