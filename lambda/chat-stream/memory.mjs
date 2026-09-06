import { randomUUID } from "crypto";
import { withTimeout } from "./timeout.mjs";
import { hashDeviceId } from "lambda-shared/deviceId";
import { EMAIL_PATTERN_SOURCE, PHONE_PATTERN_SOURCE } from "lambda-shared/pii";

// Re-exported so callers that already reach for the memory module (index.mjs,
// memory.test.mjs) keep one import, while the digest itself stays owned by
// lambda-shared/deviceId — session-token mints tokens against it and blueprint
// keys its rate limit on it, so a second definition here could silently orphan
// every stored fact.
export { hashDeviceId };

export const MEMORY_TABLE = process.env.CHAT_MEMORY_TABLE || "thechrisgrey-chat-memory";
// Per-write timeout for the visitor-memory put. Matches the 4s budget the KB and
// podcast retrieval tools use, and stays well under the 25s agent deadline so a
// hung DynamoDB write fails fast instead of starving the rest of the turn.
export const PUT_FACT_TIMEOUT_MS = 4000;
// Read-side twin of the write bound, covering the whole paged read rather than
// each page. getFacts is awaited before the first token streams, so an unbounded
// Query stalls the turn to the 60s Lambda ceiling (long past the client's own 30s
// abort) instead of degrading to "no memory this turn" at index.mjs.
export const GET_FACTS_TIMEOUT_MS = 4000;
// Whole-erase budget for /forget. Larger than the per-turn bounds because the
// erase is its own request rather than part of a turn, but still far enough under
// the 60s Lambda ceiling to leave room for the metrics flush and the response.
export const FORGET_DEVICE_TIMEOUT_MS = 20000;
export const MEMORY_TTL_SECONDS = 90 * 24 * 60 * 60;
export const MAX_FACTS_RETURNED = 20;
export const MAX_FACT_LENGTH = 240;
// Hard page cap on the getFacts read. Expired-but-unreaped rows are skipped
// client-side without filling `collected`, so a partition full of them would
// otherwise page until the timeout and return nothing for the trouble.
const MAX_QUERY_PAGES = 5;
const BATCH_RETRY_MAX = 5;
const BATCH_RETRY_BASE_MS = 50;
const BATCH_RETRY_CAP_MS = 1000;
const SENTINEL_PATTERN = /={2,}\s*[A-Z0-9 _-]{3,}\s*={2,}/;
// PII guards — visitor memory must never persist contact identifiers
// (CLAUDE.md "PII disallowed"). Prompt instructions in rememberFact/prompts ask
// the model not to store these; these regexes make it a server-side control.
// The pattern TEXT is single-sourced in lambda-shared/pii, which the log
// redactor also reads; the instances are local and un-flagged because these are
// used with `.test()` and a shared /g regex would carry lastIndex across calls.
const EMAIL_PATTERN = new RegExp(EMAIL_PATTERN_SOURCE);
const PHONE_PATTERN = new RegExp(PHONE_PATTERN_SOURCE);

/**
 * Names the rule that rejected a fact, in the order sanitizeFactContent applies
 * them. The sanitiser keeps its checks inline — VAL-SEC-010 in
 * `scripts/validate-security-hardening.test.mjs` pins those exact lines as proof
 * the PII gate exists — so this table only labels a rejection that already
 * happened. Reorder one without the other and the label lies.
 * @type {Array<{ reason: FactRejectionReason, pattern: RegExp }>}
 */
const REJECTION_RULES = [
  { reason: "sentinel", pattern: SENTINEL_PATTERN },
  { reason: "email", pattern: EMAIL_PATTERN },
  { reason: "phone", pattern: PHONE_PATTERN },
];

/** @typedef {"empty" | "sentinel" | "email" | "phone"} FactRejectionReason */

/** @param {any} raw @returns {string} */
export function sanitizeFactContent(raw) {
  if (!raw || typeof raw !== "string") return "";
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  if (SENTINEL_PATTERN.test(collapsed)) return "";
  if (EMAIL_PATTERN.test(collapsed)) return "";
  if (PHONE_PATTERN.test(collapsed)) return "";
  return collapsed.slice(0, MAX_FACT_LENGTH);
}

/**
 * Sanitize a fact and, when it is rejected, say which rule fired. The accept /
 * reject decision is still sanitizeFactContent's alone — this only re-derives the
 * label on the rejection path — so callers can tell a policy refusal (a working
 * privacy control) from a dependency failure without a second gate to keep in
 * sync. The parameter is named `content` because VAL-SEC-010 greps this file for
 * the `sanitizeFactContent(content)` call that proves the gate runs before a write.
 * @param {any} content
 * @returns {{ ok: boolean, content: string, reason: FactRejectionReason | "" }}
 */
export function classifyFactContent(content) {
  const sanitized = sanitizeFactContent(content);
  if (sanitized) return { ok: true, content: sanitized, reason: "" };
  if (!content || typeof content !== "string") return { ok: false, content: "", reason: "empty" };
  const collapsed = content.replace(/\s+/g, " ").trim();
  for (const rule of REJECTION_RULES) {
    if (rule.pattern.test(collapsed)) return { ok: false, content: "", reason: rule.reason };
  }
  return { ok: false, content: "", reason: "empty" };
}

/**
 * @param {FactRejectionReason} reason
 * @returns {Error & { reason: FactRejectionReason }}
 */
function factRejectedError(reason) {
  const err = /** @type {Error & { reason: FactRejectionReason }} */ (
    new Error(`putFact: content is empty or rejected after sanitization (${reason})`)
  );
  // Named so the tool layer can count a refusal as a refusal. Left as a bare
  // Error, every PII rejection lands in rememberFact's generic branch and
  // inflates ToolFailure_RememberFact, the metric operators would alarm on.
  err.name = "FactRejectedError";
  err.reason = reason;
  return err;
}

/**
 * Attach the confirmed-deletion count to an error escaping forgetDevice, so a
 * partial erase of a privacy control stays countable instead of being discarded
 * with the stack.
 * @param {unknown} error
 * @param {number} deleted
 * @returns {unknown}
 */
function withDeletedCount(error, deleted) {
  if (error instanceof Error) {
    /** @type {Error & { deleted?: number }} */ (error).deleted = deleted;
  }
  return error;
}

/** @param {number} timestampSeconds @returns {string} */
function buildFactId(timestampSeconds) {
  const ts = String(timestampSeconds).padStart(12, "0");
  return `${ts}#${randomUUID()}`;
}

/**
 * Issue one DynamoDB call bounded by an absolute deadline. The SDK gets an
 * abortSignal so the request is torn down instead of running on unnoticed (a
 * write DynamoDB has already accepted still commits — the signal only stops us
 * waiting on it), and withTimeout races it as well so a transport that ignores
 * the signal cannot hold the handler open either. Both paths surface as
 * TimeoutError, which is the name the remember_fact tool branches on.
 * @param {{ send: any }} docClient
 * @param {any} command
 * @param {number} deadline epoch ms after which the call is abandoned
 * @param {string} label
 * @returns {Promise<any>}
 */
async function sendBounded(docClient, command, deadline, label) {
  const remaining = Math.max(0, deadline - Date.now());
  try {
    return await withTimeout(
      docClient.send(command, { abortSignal: AbortSignal.timeout(remaining) }),
      remaining,
      label,
    );
  } catch (error) {
    const name = /** @type {{ name?: string } | null | undefined} */ (error)?.name;
    if (name === "AbortError" || name === "TimeoutError") {
      const timeoutError = new Error(`${label} timed out after ${remaining}ms`);
      timeoutError.name = "TimeoutError";
      throw timeoutError;
    }
    throw error;
  }
}

/**
 * @param {{ send: any }} docClient
 * @param {any} QueryCommand
 * @param {string} deviceId
 * @param {{ limit?: number, timeoutMs?: number }} [opts]
 * @returns {Promise<Array<{ factId: string, content: string, createdAt: number }>>}
 */
export async function getFacts(
  docClient,
  QueryCommand,
  deviceId,
  { limit = MAX_FACTS_RETURNED, timeoutMs = GET_FACTS_TIMEOUT_MS } = {},
) {
  if (!deviceId) return [];
  const deviceHash = hashDeviceId(deviceId);
  const now = Math.floor(Date.now() / 1000);
  const deadline = Date.now() + timeoutMs;
  const collected = [];
  /** @type {any} */
  let lastKey;
  let pages = 0;

  while (collected.length < limit && pages < MAX_QUERY_PAGES) {
    pages += 1;
    const result = await sendBounded(
      docClient,
      new QueryCommand({
        TableName: MEMORY_TABLE,
        KeyConditionExpression: "deviceHash = :d",
        ExpressionAttributeValues: { ":d": deviceHash },
        ScanIndexForward: false,
        Limit: Math.min(limit * 2, 100),
        ExclusiveStartKey: lastKey,
      }),
      deadline,
      "getFacts",
    );

    const items = result.Items || [];
    for (const item of items) {
      if (typeof item.ttl === "number" && item.ttl <= now) continue;
      // Re-run the write-time gate on read. A row keeps whatever rule was in
      // force the day it was written for the whole 90-day TTL, so without this a
      // tightened PII rule would not reach live rows until they aged out — and
      // getFacts' output is interpolated straight into the system prompt.
      const content = sanitizeFactContent(item.content);
      if (!content) continue;
      collected.push({
        factId: /** @type {string} */ (item.factId),
        content,
        createdAt: /** @type {number} */ (item.createdAt),
      });
      if (collected.length >= limit) break;
    }

    if (!result.LastEvaluatedKey) break;
    lastKey = result.LastEvaluatedKey;
  }

  return collected;
}

/**
 * @param {{ send: any }} docClient
 * @param {any} PutCommand
 * @param {string} deviceId
 * @param {string} content
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<{ factId: string, content: string, createdAt: number }>}
 */
export async function putFact(docClient, PutCommand, deviceId, content, { timeoutMs = PUT_FACT_TIMEOUT_MS } = {}) {
  if (!deviceId) throw new Error("putFact: deviceId is required");
  if (!content || typeof content !== "string") {
    throw new Error("putFact: content must be a non-empty string");
  }
  const { ok, content: sanitized, reason } = classifyFactContent(content);
  if (!ok) throw factRejectedError(/** @type {FactRejectionReason} */ (reason || "empty"));

  const deviceHash = hashDeviceId(deviceId);
  const now = Math.floor(Date.now() / 1000);
  const factId = buildFactId(now);
  const ttl = now + MEMORY_TTL_SECONDS;

  // Bound the DynamoDB write so a hung dependency can't block the agent turn.
  await sendBounded(
    docClient,
    new PutCommand({
      TableName: MEMORY_TABLE,
      Item: {
        deviceHash,
        factId,
        content: sanitized,
        createdAt: now,
        ttl,
      },
    }),
    Date.now() + timeoutMs,
    "putFact",
  );

  return { factId, content: sanitized, createdAt: now };
}

/**
 * @param {{ send: any }} docClient
 * @param {any} BatchWriteCommand
 * @param {any[]} batch
 * @param {number} deadline epoch ms after which no further retry is attempted
 * @returns {Promise<{ processed: number, complete: boolean }>}
 */
async function flushBatch(docClient, BatchWriteCommand, batch, deadline) {
  /** @type {Record<string, any>} */
  let requestItems = { [MEMORY_TABLE]: batch };
  let attempt = 0;
  let processed = 0;

  while (requestItems[MEMORY_TABLE] && requestItems[MEMORY_TABLE].length > 0) {
    const pending = requestItems[MEMORY_TABLE].length;
    const res = await sendBounded(
      docClient,
      new BatchWriteCommand({ RequestItems: requestItems }),
      deadline,
      "forgetDevice",
    );
    const unprocessed = (res.UnprocessedItems && res.UnprocessedItems[MEMORY_TABLE]) || [];
    processed += pending - unprocessed.length;
    if (unprocessed.length === 0) return { processed, complete: true };
    // Give up on this batch rather than throwing: the deletions already confirmed
    // above are real, and forgetDevice reports them even when the erase is partial.
    if (attempt >= BATCH_RETRY_MAX) return { processed, complete: false };
    const delay = Math.min(BATCH_RETRY_BASE_MS * 2 ** attempt, BATCH_RETRY_CAP_MS);
    if (Date.now() + delay >= deadline) return { processed, complete: false };
    await new Promise((resolve) => setTimeout(resolve, delay));
    requestItems = { [MEMORY_TABLE]: unprocessed };
    attempt += 1;
  }

  return { processed, complete: true };
}

/**
 * @param {{ send: any }} docClient
 * @param {any} QueryCommand
 * @param {any} BatchWriteCommand
 * @param {string} deviceId
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<{ deleted: number }>}
 */
export async function forgetDevice(
  docClient,
  QueryCommand,
  BatchWriteCommand,
  deviceId,
  { timeoutMs = FORGET_DEVICE_TIMEOUT_MS } = {},
) {
  if (!deviceId) throw new Error("forgetDevice: deviceId is required");
  const deviceHash = hashDeviceId(deviceId);
  const deadline = Date.now() + timeoutMs;

  let deleted = 0;
  let incomplete = false;
  /** @type {any} */
  let lastKey;
  try {
    do {
      if (Date.now() >= deadline) {
        incomplete = true;
        break;
      }
      const page = await sendBounded(
        docClient,
        new QueryCommand({
          TableName: MEMORY_TABLE,
          KeyConditionExpression: "deviceHash = :d",
          ExpressionAttributeValues: { ":d": deviceHash },
          ProjectionExpression: "deviceHash, factId",
          ExclusiveStartKey: lastKey,
          Limit: 100,
        }),
        deadline,
        "forgetDevice",
      );

      const items = page.Items || [];
      if (items.length === 0) break;

      for (let i = 0; i < items.length; i += 25) {
        if (Date.now() >= deadline) {
          incomplete = true;
          break;
        }
        const batch = items.slice(i, i + 25).map((/** @type {any} */ item) => ({
          DeleteRequest: { Key: { deviceHash: item.deviceHash, factId: item.factId } },
        }));
        // Keep erasing past a batch that gave up: this is a privacy control, so
        // every row still deletable is worth the attempt, and the confirmed count
        // survives either way.
        const { processed, complete } = await flushBatch(docClient, BatchWriteCommand, batch, deadline);
        deleted += processed;
        if (!complete) incomplete = true;
      }

      lastKey = page.LastEvaluatedKey;
      // Stop paging once a batch has given up. Every row for a device shares one
      // partition key, so UnprocessedItems surviving five backed-off retries means
      // that partition is throttled — further pages would hammer it for nothing.
      // The visitor's next /forget resumes from the top with the rows that remain.
    } while (lastKey && !incomplete);
  } catch (error) {
    throw withDeletedCount(error, deleted);
  }

  if (incomplete) {
    const err = new Error(`forgetDevice: erase incomplete after ${deleted} confirmed deletions`);
    err.name = "PartialForgetError";
    throw withDeletedCount(err, deleted);
  }

  return { deleted };
}
