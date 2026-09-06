// Classified error handling for the Sanity data boundary.
//
// `client.fetch<T>()` types are compile-time only — a network blip, a timeout, a
// schema drift, or a malformed response all surface as a thrown value the page
// previously collapsed into a single boolean. `classifySanityError` mirrors the
// shape of `useBlueprint.classifyError`: it turns an unknown thrown value into a
// typed `{ kind, message }` so pages can log a distinct code and show the visitor
// guidance that actually matches the failure (retryable timeout vs. offline vs.
// a malformed payload).

export type SanityErrorKind = 'timeout' | 'network' | 'not_found' | 'malformed' | 'unknown';

export interface SanityError {
  kind: SanityErrorKind;
  /** Visitor-facing, already prefixed with the call context. */
  message: string;
  /** The original thrown value, when it was an Error — preserved for logging. */
  causedBy?: Error;
}

const MESSAGES: Record<SanityErrorKind, string> = {
  timeout: 'The request timed out. Please try again in a moment.',
  network: 'A network error occurred. Check your connection and try again.',
  not_found: 'The requested content could not be found.',
  // No "try again" here, unlike the retryable kinds: a payload that failed a
  // shape guard fails identically on every retry until the CMS document is
  // fixed, so the copy must not promise the visitor a remedy they control.
  malformed: 'We received an unexpected response. Please check back shortly.',
  unknown: 'Something went wrong. Please try again.',
};

function build(kind: SanityErrorKind, context?: string, causedBy?: Error): SanityError {
  return {
    kind,
    message: context ? `${context}: ${MESSAGES[kind]}` : MESSAGES[kind],
    causedBy,
  };
}

/**
 * Build a SanityError for a failure that was DETECTED rather than thrown — a
 * response that survived the transport but failed a shape guard, which is the
 * "manual signal" path this module's header describes.
 *
 * Pages used to hand-build `{ kind: 'malformed', message: '...' }` literals, so
 * /blog and /blog/:slug told the visitor two different things about the same
 * class of failure while MESSAGES.malformed — the canonical copy — was used by
 * neither.
 */
export function sanityError(kind: SanityErrorKind, context?: string): SanityError {
  return build(kind, context);
}

/**
 * Whether re-running the identical request could plausibly succeed.
 *
 * `malformed` is deterministic (only a CMS fix clears it) and `not_found` is a
 * fact about the content, so a "Try Again" button on either re-runs a query
 * that can never return anything else — an action the page offers and cannot
 * honour. Only the transport-level kinds are genuinely retryable.
 */
export function isRetryableSanityError(kind: SanityErrorKind): boolean {
  return kind === 'timeout' || kind === 'network' || kind === 'unknown';
}

/**
 * Message shapes that mean "the request never reached Sanity". `get-it` (the
 * transport under @sanity/client) picks its XHR adapter whenever XMLHttpRequest
 * exists — i.e. always, in a browser — and raises `Request error while attempting
 * to reach <url>` or `Unknown XHR error`. Neither contains any of the words the
 * original network regex looked for, so every genuinely offline visitor was
 * classified `unknown` and shown "Something went wrong" instead of "Check your
 * connection", while `unknown` — the bucket an operator triages as a NOVEL
 * failure — filled up with ordinary outages.
 */
const NETWORK_MESSAGE =
  /network|fetch|failed to fetch|enotfound|econn|dns|request error while attempting to reach|unknown xhr error/i;

/** Non-standard properties the transport sets that are more reliable than its message text. */
function errorSignal(err: Error): { isNetworkError?: unknown; code?: unknown } {
  return err as unknown as { isNetworkError?: unknown; code?: unknown };
}

/**
 * Turn an unknown thrown value (or a manual signal) into a typed SanityError.
 * Accepts AbortError (timeout), @sanity/client HTTP errors (statusCode),
 * JSON/parse failures (malformed), and network-shaped errors.
 */
export function classifySanityError(err: unknown, context?: string): SanityError {
  if (err instanceof Error) {
    if (err.name === 'AbortError') return build('timeout', context, err);

    // @sanity/client throws ClientError/ServerError carrying a numeric statusCode.
    const statusCode =
      typeof err === 'object' && err !== null && 'statusCode' in err
        ? Number((err as { statusCode?: unknown }).statusCode)
        : undefined;
    if (statusCode === 404) return build('not_found', context, err);
    if (statusCode !== undefined && statusCode >= 500) return build('network', context, err);

    // Structural signals before message sniffing: get-it sets `isNetworkError`
    // explicitly on a connectivity failure and `code` on a socket timeout, and
    // the classifier already reads the equally non-standard `statusCode` above.
    const signal = errorSignal(err);
    if (signal.isNetworkError === true) return build('network', context, err);
    if (signal.code === 'ETIMEDOUT' || signal.code === 'ESOCKETTIMEDOUT') return build('timeout', context, err);

    const msg = err.message || '';
    // Network is tested BEFORE TypeError: a fetch-adapter environment (prerender,
    // workers) throws `TypeError: Failed to fetch` for a transport failure, and
    // filing that as 'malformed' makes an outage indistinguishable from real CMS
    // schema drift — the one signal 'malformed' exists to raise.
    if (NETWORK_MESSAGE.test(msg)) return build('network', context, err);
    if (err instanceof TypeError || /json|parse|unexpected token/i.test(msg)) {
      return build('malformed', context, err);
    }
    if (/not found|404/i.test(msg)) return build('not_found', context, err);
    if (/timeout|timed out|aborted/i.test(msg)) return build('timeout', context, err);
    return build('unknown', context, err);
  }
  return build('unknown', context);
}

export function isSanityError(value: unknown): value is SanityError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'message' in value &&
    typeof (value as SanityError).message === 'string'
  );
}
