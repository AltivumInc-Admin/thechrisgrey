import { createHmac, timingSafeEqual } from "crypto";

/**
 * Short-lived, server-issued session tokens.
 *
 * Replaces the prior model where a single HMAC signing key was shipped to the
 * browser (VITE_-prefixed) and used to "sign" requests — which proved nothing,
 * since any visitor could read the key from the bundle. Here the signing key
 * (SESSION_TOKEN_KEY) lives ONLY on the server: a dedicated issuer Lambda mints
 * scoped, expiring tokens after a Cloudflare Turnstile check, and the chat /
 * blueprint Lambdas verify them. The browser never holds a signing secret.
 *
 * Wire format (dot-delimited, 5 fields):
 *   v1.<exp>.<scope>.<deviceHash>.<sig>
 * where sig = HMAC-SHA256(key, "<exp>.<scope>.<deviceHash>") in hex.
 * `exp` is an absolute unix-seconds expiry; `scope` ∈ {"chat","blueprint"};
 * `deviceHash` is the sha256 hex of the visitor's device id (no dots), so the
 * fixed field count is safe to split on ".".
 */

export const SESSION_TOKEN_VERSION = "v1";

/**
 * Determine whether auth verification should fail closed when a signing key is
 * unset. In production (AWS Lambda) an empty key MUST NOT silently bypass
 * verification — that turns a misconfigured deploy into an open endpoint. In
 * local/dev the empty-key-disables convention is preserved so tests and local
 * stacks run without a server-only secret.
 *
 * Resolution order:
 *   1. Explicit `AUTH_FAIL_CLOSED` env var (`1`/`true` on, `0`/`false` off).
 *   2. Otherwise fail closed when running inside the AWS Lambda runtime
 *      (`AWS_LAMBDA_FUNCTION_NAME` is set by the platform, not by tests).
 *   3. Otherwise fail open (local/dev).
 * @returns {boolean}
 */
export function shouldFailClosedOnMissingKey() {
  const flag = process.env.AUTH_FAIL_CLOSED;
  if (flag !== undefined) {
    return flag === "1" || flag === "true";
  }
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/**
 * @param {string|number} exp
 * @param {string} scope
 * @param {string} deviceHash
 * @param {string} key
 * @returns {string}
 */
function computeSignature(exp, scope, deviceHash, key) {
  return createHmac("sha256", key).update(`${exp}.${scope}.${deviceHash}`).digest("hex");
}

/**
 * Mint a token. `ttlSeconds` may be negative in tests to produce an expired token.
 * @param {{ deviceHash: string, scope: string }} payload
 * @param {string} key - server-only signing secret
 * @param {number} ttlSeconds
 * @returns {string}
 */
export function issueSessionToken({ deviceHash, scope }, key, ttlSeconds) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = computeSignature(exp, scope, deviceHash, key);
  return `${SESSION_TOKEN_VERSION}.${exp}.${scope}.${deviceHash}.${sig}`;
}

/**
 * Verify a token for a given scope. An empty `key` disables verification
 * (parity with hmac.mjs — local/dev only).
 * @param {string} token
 * @param {string} key
 * @param {{ scope?: string }} [options] - Required scope to verify against.
 * @returns {{ valid: true, deviceHash?: string } | { valid: false, error: string }}
 */
export function verifySessionToken(token, key, { scope } = {}) {
  if (!key) {
    // Fail closed in production: an unset SESSION_TOKEN_KEY must NOT silently
    // authenticate. In local/dev the empty-key convention is preserved.
    if (shouldFailClosedOnMissingKey()) {
      return { valid: false, error: "missing_signing_key" };
    }
    return { valid: true, deviceHash: undefined };
  }
  if (!token || typeof token !== "string") {
    return { valid: false, error: "missing_token" };
  }

  const parts = token.split(".");
  if (parts.length !== 5) {
    return { valid: false, error: "malformed_token" };
  }

  const [version, expStr, tokenScope, deviceHash, signature] = parts;

  if (version !== SESSION_TOKEN_VERSION) {
    return { valid: false, error: "bad_version" };
  }

  const exp = parseInt(expStr, 10);
  if (isNaN(exp)) {
    return { valid: false, error: "malformed_token" };
  }

  // Signature first: detects any tampering of exp/scope/deviceHash. We compare
  // against the token's OWN fields, so a legitimately-signed token always passes
  // here regardless of the requested scope — scope is enforced separately below.
  const expected = computeSignature(expStr, tokenScope, deviceHash, key);
  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: "invalid_signature" };
    }
  } catch {
    return { valid: false, error: "invalid_signature" };
  }

  if (tokenScope !== scope) {
    return { valid: false, error: "scope_mismatch" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (exp <= now) {
    return { valid: false, error: "expired" };
  }

  return { valid: true, deviceHash };
}
