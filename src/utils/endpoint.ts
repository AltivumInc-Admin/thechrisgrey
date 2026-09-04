/**
 * Join a configured service endpoint with a sub-path.
 *
 * Endpoint values come from per-environment `VITE_*_ENDPOINT` variables that are
 * entered by hand, so some carry a trailing slash and some do not. Naive
 * template concatenation turns a trailing slash into a double slash
 * (`https://host//vitals`), and the Lambda handlers that match `rawPath ===
 * "/vitals"` answer 404 for it.
 *
 * That is not a theoretical concern: during the 2026-09 account migration the
 * new account's `VITE_METRICS_ENDPOINT` was set WITH a trailing slash while the
 * old one had none, which silently took Web Vitals telemetry and the admin
 * health check offline. Nothing surfaced the failure — `sendBeacon` is
 * fire-and-forget, so the 404s were invisible, and the CLS alarm simply never
 * had data to fire on. Normalizing here makes the join independent of how the
 * value happened to be typed.
 *
 * @param base - Service origin, with or without a trailing slash.
 * @param path - Sub-path, with or without a leading slash.
 * @returns The two joined by exactly one slash.
 */
export const joinEndpoint = (base: string, path: string): string =>
  `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
