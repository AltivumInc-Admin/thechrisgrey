/**
 * Structured JSON logger for the Lambda fleet.
 *
 * Every Lambda currently writes `console.log(JSON.stringify({ requestId, event,
 * ...extra }))` inline. This module centralises that pattern so:
 *
 *  - Log shape is consistent (level, timestamp, requestId, event, extra fields)
 *  - PII (emails, phone-shaped digit runs) is redacted before it hits CloudWatch
 *  - Log level is controlled by the LOG_LEVEL env var (debug|info|warn|error)
 *  - Request-scoped child loggers auto-attach requestId without repetition
 *
 * Zero dependencies — the module is imported at cold start in every handler, so
 * it must not pull in anything that adds to the bundle.
 *
 * Usage:
 *   import { createLogger } from "lambda-shared/logger";
 *   const log = createLogger(requestId, { service: "chat-stream" });
 *   log.info("request_start", { method, path });
 *   log.error("handler_error", { error: err.name, message: err.message });
 */

import { EMAIL_PATTERN_SOURCE, PHONE_PATTERN_SOURCE } from "./pii.mjs";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const LOG_LEVEL = process.env.LOG_LEVEL?.toLowerCase() ?? "";
/** @type {number} */
const DEFAULT_LEVEL = LEVELS[/** @type {keyof typeof LEVELS} */ (LOG_LEVEL)] || LEVELS.info;

// PII redaction. The pattern text is single-sourced in ./pii.mjs, which
// chat-stream/memory.mjs also reads for its write-time gate — the two used to
// keep hand-mirrored copies with a comment asking the next editor to tighten
// both. The /g instances are built HERE because `.replace` needs the flag and a
// shared global regex would carry lastIndex between the two call sites.
const EMAIL_RE = new RegExp(EMAIL_PATTERN_SOURCE, "g");
const PHONE_RE = new RegExp(PHONE_PATTERN_SOURCE, "g");

const REDACTED = "[REDACTED]";

/**
 * Deep-clone a value and redact PII in any string fields or values.
 * Non-serialisable values (functions, undefined) are dropped by JSON.stringify.
 * @param {unknown} value
 * @returns {unknown}
 */
function redact(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.replace(EMAIL_RE, REDACTED).replace(PHONE_RE, REDACTED);
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);

  const out = /** @type {Record<string, unknown>} */ ({});
  for (const [key, val] of Object.entries(value)) {
    // Skip keys that commonly hold secrets regardless of value content.
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === "authorization" ||
      lowerKey === "token" ||
      lowerKey === "accesstoken" ||
      lowerKey === "secret" ||
      lowerKey === "password" ||
      lowerKey === "signingkey" ||
      lowerKey === "sessiontokenkey"
    ) {
      out[key] = REDACTED;
    } else {
      out[key] = redact(val);
    }
  }
  return out;
}

/**
 * Emit a structured log line to the appropriate console method.
 * @param {number} levelNum
 * @param {string} levelName
 * @param {string|null} requestId
 * @param {object} context
 * @param {string} event
 * @param {object} [extra]
 */
function emit(levelNum, levelName, requestId, context, event, extra) {
  if (levelNum < DEFAULT_LEVEL) return;

  const payload = { ...context, requestId, level: levelName, event, ts: new Date().toISOString() };
  if (extra && typeof extra === "object" && Object.keys(extra).length > 0) {
    Object.assign(payload, redact(extra));
  }

  const line = JSON.stringify(payload);
  if (levelNum >= LEVELS.error) {
    console.error(line);
  } else if (levelNum >= LEVELS.warn) {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/**
 * Create a request-scoped logger.
 *
 * @param {string|null} requestId - Correlation ID for the current invocation,
 *   or null for module-scope / startup loggers that have no request context.
 * @param {object} [context={}] - Static fields attached to every log line
 *   (e.g. `{ service: "chat-stream" }`).
 * @returns {{ debug: (event:string, extra?:object)=>void, info: (event:string, extra?:object)=>void, warn: (event:string, extra?:object)=>void, error: (event:string, extra?:object)=>void }}
 */
export function createLogger(requestId, context = {}) {
  // Redact context once at creation time so PII in static fields is scrubbed
  // from every log line without per-call overhead.
  const sanitizedContext = /** @type {object} */ (redact(context));
  return {
    debug(event, extra) {
      emit(LEVELS.debug, "debug", requestId, sanitizedContext, event, extra);
    },
    info(event, extra) {
      emit(LEVELS.info, "info", requestId, sanitizedContext, event, extra);
    },
    warn(event, extra) {
      emit(LEVELS.warn, "warn", requestId, sanitizedContext, event, extra);
    },
    error(event, extra) {
      emit(LEVELS.error, "error", requestId, sanitizedContext, event, extra);
    },
  };
}

export { redact, LEVELS };
