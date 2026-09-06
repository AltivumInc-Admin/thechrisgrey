import { describe, it, expect } from 'vitest';
import { isAllowedHref, resolveInternalPath } from './href';

describe('isAllowedHref', () => {
  it.each(['https://example.com/x', 'http://example.com/x', 'mailto:someone@example.com', 'tel:+15551234567'])(
    'allows the %s scheme Studio validates to',
    (href) => {
      expect(isAllowedHref(href)).toBe(true);
    },
  );

  it.each(['/blog/foo', '?series=x', '#section'])('allows the in-app path %s', (href) => {
    expect(isAllowedHref(href)).toBe(true);
  });

  it.each([
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html;base64,PHNjcmlwdD4='],
    ['vbscript', 'vbscript:msgbox(1)'],
    ['file', 'file:///etc/passwd'],
  ])('rejects a %s href, which Studio validation alone would not stop on an API write', (_label, href) => {
    expect(isAllowedHref(href)).toBe(false);
  });

  it('rejects an empty href', () => {
    expect(isAllowedHref('')).toBe(false);
  });

  it('resolves a protocol-relative href against the site origin rather than trusting it', () => {
    // `//evil.com` parses as https here, so it is allowed as a LINK — but
    // resolveInternalPath must still class it external so it keeps target/rel.
    expect(isAllowedHref('//evil.com')).toBe(true);
    expect(resolveInternalPath('//evil.com')).toBeNull();
  });
});

describe('resolveInternalPath', () => {
  it('returns an in-app path unchanged', () => {
    expect(resolveInternalPath('/blog/foo')).toBe('/blog/foo');
    expect(resolveInternalPath('?series=x')).toBe('?series=x');
    expect(resolveInternalPath('#section')).toBe('#section');
  });

  it('keeps search and hash on a same-origin absolute URL', () => {
    expect(resolveInternalPath('https://thechrisgrey.com/blog?tag=ai#top')).toBe('/blog?tag=ai#top');
  });

  it('treats the http form of the site origin as internal', () => {
    expect(resolveInternalPath('http://thechrisgrey.com/about')).toBe('/about');
  });

  it.each([
    ['a third-party URL', 'https://example.com/x'],
    ['a mailto', 'mailto:someone@example.com'],
    ['a tel', 'tel:+15551234567'],
    ['an empty href', ''],
  ])('returns null for %s', (_label, href) => {
    expect(resolveInternalPath(href)).toBeNull();
  });
});
