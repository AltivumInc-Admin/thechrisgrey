/**
 * Blueprint handler body-size guard (VAL-SEC-008).
 *
 * Asserts the handler rejects an oversized raw body with 413 BEFORE parsing
 * the spec JSON or invoking the Bedrock engine. A within-limit body is admitted
 * past the guard (and then short-circuits at a later validation stage so the
 * engine is never actually invoked in this test).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// --- Isolate from AWS BEFORE importing the handler -------------------------
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;
delete process.env.AWS_SESSION_TOKEN;
delete process.env.AWS_PROFILE;
process.env.AWS_SHARED_CREDENTIALS_FILE = "/dev/null";
process.env.AWS_CONFIG_FILE = "/dev/null";
process.env.AWS_EC2_METADATA_DISABLED = "true";
process.env.AWS_REGION = "us-east-1";

// Both auth paths active. A valid session token is used so each request passes
// the auth front door and reaches the body-size guard.
const SESSION_KEY = "blueprint-session-key";
process.env.SESSION_TOKEN_KEY = SESSION_KEY;
// Tighten the body limit so the test doesn't have to allocate a 1 MiB payload.
process.env.BLUEPRINT_MAX_BODY_BYTES = "256";

const committed = [];
function makeStream() {
  return {
    writes: [],
    ended: false,
    write(c) {
      this.writes.push(String(c));
    },
    end() {
      this.ended = true;
    },
    get body() {
      return this.writes.join("");
    },
  };
}
globalThis.awslambda = {
  streamifyResponse: (fn) => fn,
  HttpResponseStream: {
    from: (stream, meta) => {
      committed.push(meta);
      return stream;
    },
  },
};

const { handler } = await import("../index.mjs");
const { issueSessionToken } = await import("lambda-shared/sessionToken");

function makeEvent({ headers = {}, body = "{}", method = "POST" } = {}) {
  return {
    body,
    headers,
    requestContext: { http: { method, sourceIp: "1.2.3.4" } },
  };
}

async function run(event) {
  committed.length = 0;
  const stream = makeStream();
  await handler(event, stream, {});
  return { status: committed[0]?.statusCode, body: stream.body };
}

function authHeaders() {
  const token = issueSessionToken({ deviceHash: "d".repeat(64), scope: "blueprint" }, SESSION_KEY, 300);
  return { authorization: `Bearer ${token}` };
}

test("rejects a body exceeding BLUEPRINT_MAX_BODY_BYTES with 413 before engine processing", async () => {
  // 512 bytes — double the 256-byte limit configured above.
  const oversized = "x".repeat(512);
  const { status, body } = await run(makeEvent({ headers: authHeaders(), body: oversized }));
  assert.equal(status, 413);
  assert.match(body, /request_too_large/);
});

test("admits a body within the limit (reaches a later validation stage, not 413)", async () => {
  // A small body that parses as JSON but is missing `spec` — so it short-
  // circuits at 400 missing_spec AFTER the size guard, proving the guard let it
  // through. The engine (Bedrock) is never invoked.
  const small = '{"deviceId":"validdevice123"}';
  assert.ok(Buffer.byteLength(small) <= 256, "fixture must be within the test limit");
  const { status, body } = await run(makeEvent({ headers: authHeaders(), body: small }));
  assert.notEqual(status, 413);
  assert.equal(status, 400);
  assert.match(body, /missing_spec/);
});

test("the size guard is measured in bytes, not characters (multi-byte UTF-8)", async () => {
  // Each '✓' is 3 bytes in UTF-8 but 1 character. 100 chars = 300 bytes > 256.
  const multiByte = "✓".repeat(100);
  assert.ok(multiByte.length < 256, "character count is under the limit");
  assert.ok(Buffer.byteLength(multiByte, "utf8") > 256, "byte count is over the limit");
  const { status } = await run(makeEvent({ headers: authHeaders(), body: multiByte }));
  assert.equal(status, 413);
});

test("an oversized body does NOT invoke Bedrock (auth + guard run before engine)", async () => {
  // The oversized body is also invalid JSON, but the size guard fires first —
  // returning 413, not 400 invalid_json. This proves the guard precedes parsing.
  const oversized = "x".repeat(512);
  const { status, body } = await run(makeEvent({ headers: authHeaders(), body: oversized }));
  assert.equal(status, 413);
  assert.doesNotMatch(body, /invalid_json/);
});
