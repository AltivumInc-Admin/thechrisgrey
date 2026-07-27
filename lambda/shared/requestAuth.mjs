import { verifySignature } from "./hmac.mjs";
import { verifySessionToken } from "./sessionToken.mjs";

/**
 * Whether the legacy HMAC auth path is allowed to authenticate a request when a
 * session-token signing key is configured. Defaults to OFF: once session tokens
 * are rolled out, legacy HMAC alone (no bearer) is rejected. Set
 * `ALLOW_LEGACY_HMAC=1` to re-enable the transition window (e.g. during a
 * staged rollout or rollback).
 * @returns {boolean}
 */
export function isLegacyHmacAllowed() {
  const flag = process.env.ALLOW_LEGACY_HMAC;
  return flag === "1" || flag === "true";
}

/**
 * Authenticate an incoming request, accepting EITHER a server-issued session
 * token (the new model) OR, when explicitly enabled, the legacy request-body
 * HMAC signature (transition window). Encapsulates the precedence so
 * chat-stream and blueprint share one source of truth for auth.
 *
 * Precedence:
 *   1. If an `Authorization: Bearer <token>` header is present AND a session
 *      signing key is configured, the token path governs — a present-but-invalid
 *      token is REJECTED (it does not silently fall through to legacy).
 *   2. If a session signing key is configured but no bearer is present, the
 *      request is REJECTED unless the legacy path is explicitly re-enabled via
 *      `ALLOW_LEGACY_HMAC=1` (defaults to off — session tokens are required
 *      once rolled out).
 *   3. Otherwise (no session key configured), fall back to the legacy HMAC
 *      signature (verifySignature), which itself fails closed in production
 *      when `legacyKey` is empty.
 *
 * @param {{ headers?: Record<string, string> }} event - Lambda Function URL event
 * @param {object} [opts] - Auth options
 * @param {string} [opts.sessionKey] - server-only session-token signing key ("" disables the token path)
 * @param {string} [opts.scope] - required token scope ("chat" | "blueprint")
 * @param {string} [opts.legacyKey] - legacy shared HMAC key ("" disables legacy verification)
 * @param {{signatureHeader?:string,timestampHeader?:string}} [opts.legacySigOptions]
 * @returns {{valid:true, method:"token"|"legacy", deviceHash?:string} | {valid:false, method:"token"|"legacy", error:string}}
 */
export function authenticateRequest(event, { sessionKey, scope, legacyKey, legacySigOptions } = {}) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (bearer && sessionKey) {
    const r = verifySessionToken(bearer, sessionKey, { scope });
    return r.valid
      ? { valid: true, method: "token", deviceHash: r.deviceHash }
      : { valid: false, method: "token", error: r.error };
  }

  // A session signing key is configured but no bearer was supplied. Once
  // session tokens are rolled out, legacy HMAC alone is no longer accepted.
  // Re-enable the transition window with ALLOW_LEGACY_HMAC=1.
  if (sessionKey && !bearer && !isLegacyHmacAllowed()) {
    return { valid: false, method: "token", error: "missing_token" };
  }

  const sig = verifySignature(event, legacyKey, legacySigOptions);
  return sig.valid ? { valid: true, method: "legacy" } : { valid: false, method: "legacy", error: sig.error };
}
