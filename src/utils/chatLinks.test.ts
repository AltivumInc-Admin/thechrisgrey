import { describe, it, expect } from 'vitest';
import { isInternalPath, isSafeBlogSlug, isTrustedVideoUrl } from './chatLinks';

/**
 * These guards are the client-side trust boundary for model-authored navigation
 * targets, so the cases that matter are the ones an attacker would reach for,
 * not the happy path.
 */
describe('chatLinks', () => {
  describe('isInternalPath', () => {
    it('admits real same-origin routes', () => {
      for (const path of ['/', '/blog', '/blog/some-post', '/contact?ref=chat', '/aws#topology']) {
        expect(isInternalPath(path)).toBe(true);
      }
    });

    // Each of these resolves cross-origin in a real browser. The backslash forms
    // are the ones a leading-`//` blocklist admits: the WHATWG parser treats `\`
    // as `/` in special schemes, so they escape the origin anyway.
    it.each([
      ['protocol-relative', '//evil.example'],
      ['backslash-escaped', '/\\evil.example'],
      ['mixed slash and backslash', '/\\/evil.example'],
      ['double backslash', '\\\\evil.example'],
      ['absolute https', 'https://evil.example'],
      ['javascript scheme', 'javascript:alert(1)'],
      ['relative, not rooted', 'blog/post'],
    ])('rejects %s', (_label, path) => {
      expect(isInternalPath(path)).toBe(false);
    });

    it('rejects non-strings rather than throwing', () => {
      for (const value of [undefined, null, 42, {}, ['/blog']]) {
        expect(isInternalPath(value)).toBe(false);
      }
    });

    it('keeps every rejected candidate off the router', () => {
      // The guard is a type predicate, so a regression here silently widens what
      // ToolDraftCard and GenerativeBlocks are willing to navigate to.
      const hostile = ['//evil.example', '/\\evil.example'];
      expect(hostile.filter(isInternalPath)).toEqual([]);
    });
  });

  describe('isSafeBlogSlug', () => {
    it('admits ordinary slugs and rejects route-escaping ones', () => {
      expect(isSafeBlogSlug('a-real-post')).toBe(true);
      for (const slug of ['../admin', 'has/slash', '-leading-dash', 'Upper', '', 'sp ace']) {
        expect(isSafeBlogSlug(slug)).toBe(false);
      }
    });
  });

  describe('isTrustedVideoUrl', () => {
    it('admits https YouTube hosts only', () => {
      expect(isTrustedVideoUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
      expect(isTrustedVideoUrl('https://youtu.be/abc')).toBe(true);
    });

    it('rejects http, lookalike hosts and non-URLs', () => {
      for (const url of [
        'http://www.youtube.com/watch?v=abc',
        'https://youtube.com.evil.example/watch?v=abc',
        'https://evil.example/watch?v=abc',
        'not a url',
      ]) {
        expect(isTrustedVideoUrl(url)).toBe(false);
      }
    });
  });
});
