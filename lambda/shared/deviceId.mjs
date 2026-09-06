/**
 * Device identity for the visitor-scoped services.
 *
 * Three handlers have to agree on this byte-for-byte and previously kept three
 * private copies: session-token MINTS a token carrying sha256(deviceId),
 * chat-stream derives the visitor-memory partition key from the same digest and
 * compares it against the token binding, and blueprint keys its 1-per-30-days
 * rate limit on it. A drift in either direction is silent and expensive — a
 * looser pattern in the issuer mints tokens for ids chat-stream then rejects, a
 * different digest orphans every stored fact — so the pattern and the hash live
 * here once.
 *
 * DEVICE_ID_PATTERN is deliberately un-flagged (no /g): it is consumed with
 * `.test()`, which would carry `lastIndex` state across calls on a global regex
 * and start failing every other request.
 */

import { createHash } from "crypto";

/** Opaque client-generated id (src/utils/deviceId.ts): url-safe, 8-64 chars. */
export const DEVICE_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

/**
 * Return the device id only when it is well-formed, else null. Callers treat
 * null as "no visitor to attribute this to" rather than as an error.
 * @param {any} raw
 * @returns {string|null}
 */
export function validateDeviceId(raw) {
  if (typeof raw !== "string") return null;
  if (!DEVICE_ID_PATTERN.test(raw)) return null;
  return raw;
}

/**
 * Lowercase hex SHA-256 of a device id — the partition key for visitor memory,
 * the rate-limit key for blueprint, and the `deviceHash` claim in a session
 * token. Throws rather than hashing "" or undefined: a silent digest of the
 * empty string would collapse every anonymous visitor onto one partition.
 * @param {string} deviceId
 * @returns {string}
 */
export function hashDeviceId(deviceId) {
  if (!deviceId || typeof deviceId !== "string") {
    throw new Error("hashDeviceId: deviceId must be a non-empty string");
  }
  return createHash("sha256").update(deviceId).digest("hex");
}
