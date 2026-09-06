import { describe, it, expect } from 'vitest';
import { classifySanityError, isSanityError, sanityError, isRetryableSanityError } from './errors';

describe('classifySanityError', () => {
  it('maps AbortError to timeout', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    expect(classifySanityError(err).kind).toBe('timeout');
  });

  it('maps a 404 statusCode to not_found', () => {
    const err = Object.assign(new Error('Not Found'), { statusCode: 404 });
    expect(classifySanityError(err).kind).toBe('not_found');
  });

  it('maps a 5xx statusCode to network', () => {
    const err = Object.assign(new Error('Server Error'), { statusCode: 503 });
    expect(classifySanityError(err).kind).toBe('network');
  });

  it('maps a parse failure to malformed', () => {
    expect(classifySanityError(new TypeError('Unexpected token < in JSON')).kind).toBe('malformed');
  });

  // The fixtures below are the shapes the installed transport actually raises.
  // get-it picks its XHR adapter whenever XMLHttpRequest exists (i.e. always, in
  // a browser); the previous synthetic 'Failed to fetch' / 'Network error'
  // fixtures were messages this stack never emits, so the network branch stayed
  // green while every real outage classified as 'unknown'.
  it("maps get-it's XHR network failure to network", () => {
    const err = Object.assign(
      new Error('Request error while attempting to reach is https://k5950b3w.apicdn.sanity.io/'),
      {
        isNetworkError: true,
      },
    );
    expect(classifySanityError(err).kind).toBe('network');
  });

  it('maps an isNetworkError flag to network even when the message says nothing', () => {
    const err = Object.assign(new Error('Unknown XHR error'), { isNetworkError: true });
    expect(classifySanityError(err).kind).toBe('network');
  });

  it("maps get-it's network message to network without the flag", () => {
    // Belt-and-braces: the message alone must be enough if the flag is dropped.
    expect(classifySanityError(new Error('Request error while attempting to reach https://x')).kind).toBe('network');
    expect(classifySanityError(new Error('Unknown XHR error')).kind).toBe('network');
  });

  it('maps a socket timeout code to timeout', () => {
    const err = Object.assign(new Error('Socket timed out on request to https://k5950b3w.api.sanity.io/'), {
      code: 'ESOCKETTIMEDOUT',
    });
    expect(classifySanityError(err).kind).toBe('timeout');
  });

  it('maps a fetch-adapter TypeError to network, not malformed', () => {
    // 'malformed' is the CMS-drift signal; a transport failure must not land in it.
    expect(classifySanityError(new TypeError('Failed to fetch')).kind).toBe('network');
  });

  it('falls back to unknown for an unrecognized error', () => {
    expect(classifySanityError(new Error('something odd')).kind).toBe('unknown');
  });

  it('falls back to unknown for a non-Error thrown value', () => {
    expect(classifySanityError('a string').kind).toBe('unknown');
  });

  it('prefixes the message with the provided context', () => {
    expect(classifySanityError(new Error('x'), 'Blog listing').message).toMatch(/^Blog listing: /);
  });

  it('shows the connectivity message for a real offline failure', () => {
    // The visitor-facing payoff: this message previously never rendered.
    const err = Object.assign(new Error('Request error while attempting to reach https://x'), {
      isNetworkError: true,
    });
    expect(classifySanityError(err).message).toMatch(/check your connection/i);
  });

  it('preserves the original error in causedBy', () => {
    const err = new Error('boom');
    expect(classifySanityError(err).causedBy).toBe(err);
  });
});

describe('sanityError', () => {
  it('produces the canonical copy for a detected (not thrown) failure', () => {
    expect(sanityError('malformed')).toEqual({
      kind: 'malformed',
      message: 'We received an unexpected response. Please check back shortly.',
      causedBy: undefined,
    });
  });

  it('prefixes the message with the provided context', () => {
    expect(sanityError('malformed', 'Blog listing').message).toMatch(/^Blog listing: /);
  });

  it('does not promise a retry for a deterministic failure', () => {
    // The malformed error UI has no Try Again button; the copy must agree.
    expect(sanityError('malformed').message).not.toMatch(/try again/i);
  });

  it('is recognized by isSanityError, like a classified one', () => {
    expect(isSanityError(sanityError('malformed'))).toBe(true);
  });
});

describe('isRetryableSanityError', () => {
  it('treats the transport-level kinds as retryable', () => {
    expect(isRetryableSanityError('timeout')).toBe(true);
    expect(isRetryableSanityError('network')).toBe(true);
    expect(isRetryableSanityError('unknown')).toBe(true);
  });

  it('treats deterministic kinds as not retryable', () => {
    // Re-running the identical query returns the identical drift / absence.
    expect(isRetryableSanityError('malformed')).toBe(false);
    expect(isRetryableSanityError('not_found')).toBe(false);
  });
});

describe('isSanityError', () => {
  it('recognizes a classified error', () => {
    expect(isSanityError(classifySanityError(new Error('x')))).toBe(true);
  });

  it('rejects arbitrary objects and primitives', () => {
    expect(isSanityError({})).toBe(false);
    expect(isSanityError(null)).toBe(false);
    expect(isSanityError('err')).toBe(false);
  });
});
