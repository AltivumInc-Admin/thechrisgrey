/**
 * URL matcher for the site's Lambda-backed POST endpoints (chat, contact,
 * newsletter, session token).
 *
 * A spec must not assume the deployed Function URL. The app posts to whatever
 * `VITE_*_ENDPOINT` the build was given: the real `*.lambda-url.<region>.on.aws`
 * host locally and in production, but `https://placeholder.example.com` in CI,
 * which builds without secrets.
 *
 * Matching only `**lambda-url**` therefore stubbed nothing in CI. The requests
 * fell through to a real network call that went nowhere, so no success modal
 * ever rendered and the submission assertions failed — while the same specs
 * passed locally, where the endpoint really is a Lambda URL. That divergence sat
 * invisible for as long as these specs were dormant in CI.
 *
 * Matching both shapes keeps a stub working regardless of build-time config.
 */
export const BACKEND_POST_URL = /lambda-url|placeholder\.example\.com/;
