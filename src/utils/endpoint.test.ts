import { describe, it, expect } from 'vitest';
import { joinEndpoint } from './endpoint';

describe('joinEndpoint', () => {
  const HOST = 'https://abc.lambda-url.us-east-1.on.aws';

  it('joins when the base has no trailing slash', () => {
    expect(joinEndpoint(HOST, '/vitals')).toBe(`${HOST}/vitals`);
  });

  // The migration regression: the new account's env var carried a trailing
  // slash, producing `//vitals`, which the metrics Lambda 404s because it
  // matches `rawPath === "/vitals"` exactly.
  it('collapses a trailing slash on the base instead of producing //', () => {
    expect(joinEndpoint(`${HOST}/`, '/vitals')).toBe(`${HOST}/vitals`);
    expect(joinEndpoint(`${HOST}/`, '/vitals')).not.toContain('//vitals');
  });

  it('handles multiple trailing slashes', () => {
    expect(joinEndpoint(`${HOST}///`, '/health')).toBe(`${HOST}/health`);
  });

  it('handles a path with no leading slash', () => {
    expect(joinEndpoint(`${HOST}/`, 'vitals')).toBe(`${HOST}/vitals`);
    expect(joinEndpoint(HOST, 'vitals')).toBe(`${HOST}/vitals`);
  });

  it('never emits a double slash after the origin', () => {
    for (const base of [HOST, `${HOST}/`, `${HOST}//`]) {
      for (const path of ['vitals', '/vitals', '//vitals']) {
        const joined = joinEndpoint(base, path);
        expect(joined).toBe(`${HOST}/vitals`);
        // the only `//` permitted is the one in the protocol
        expect(joined.slice('https://'.length)).not.toContain('//');
      }
    }
  });

  it('preserves a base that already includes a path segment', () => {
    expect(joinEndpoint(`${HOST}/api/`, '/health')).toBe(`${HOST}/api/health`);
  });
});
