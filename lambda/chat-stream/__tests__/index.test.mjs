import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";

// --- Isolate from AWS BEFORE importing the handler -------------------------
// The handler constructs module-level SDK clients and, on the signature-reject
// path, records a metric and calls metrics.flush(). We force AWS credential and
// IMDS resolution to fail FAST (no network) so flush() rejects-and-swallows
// instead of calling CloudWatch for real. This keeps the test hermetic.
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;
delete process.env.AWS_SESSION_TOKEN;
delete process.env.AWS_PROFILE;
process.env.AWS_SHARED_CREDENTIALS_FILE = "/dev/null";
process.env.AWS_CONFIG_FILE = "/dev/null";
process.env.AWS_EC2_METADATA_DISABLED = "true";
process.env.AWS_REGION = "us-east-1";

// Both auth paths must be ACTIVE for these assertions: legacy HMAC (CHAT_SIGNING_KEY)
// and server-issued session tokens (SESSION_TOKEN_KEY).
const KEY = "test-secret-key";
process.env.CHAT_SIGNING_KEY = KEY;
const SESSION_KEY = "test-session-key";
process.env.SESSION_TOKEN_KEY = SESSION_KEY;

// Stub the Lambda streaming runtime global so `awslambda.streamifyResponse`
// (evaluated at module load, line ~128) returns the bare handler function.
globalThis.awslambda = {
  streamifyResponse: (fn) => fn,
  HttpResponseStream: { from: (s) => s },
};

const { handler } = await import("../index.mjs");
const { issueSessionToken } = await import("lambda-shared/sessionToken");

const SYS = "\x00SYS\x00";

function makeStream() {
  return {
    chunks: [],
    ended: false,
    write(c) {
      this.chunks.push(String(c));
    },
    end() {
      this.ended = true;
    },
    get output() {
      return this.chunks.join("");
    },
  };
}

function makeEvent({ method = "POST", headers = {}, body = "{}", path = "/" } = {}) {
  return {
    body,
    headers,
    rawPath: path,
    requestContext: { http: { method, sourceIp: "1.2.3.4", path } },
  };
}

function signHeaders(body, key, { offsetSeconds = 0 } = {}) {
  const ts = String(Math.floor(Date.now() / 1000) + offsetSeconds);
  const sig = createHmac("sha256", key).update(`${ts}.${body}`).digest("hex");
  return { "x-chat-timestamp": ts, "x-chat-signature": sig };
}

test("OPTIONS preflight short-circuits with an empty body and no further processing", async () => {
  const stream = makeStream();
  await handler(makeEvent({ method: "OPTIONS" }), stream, {});
  assert.equal(stream.output, "");
  assert.equal(stream.ended, true);
});

test(
  "rejects a request with MISSING signature headers (verify runs before rate limiting)",
  { timeout: 10000 },
  async () => {
    const stream = makeStream();
    await handler(makeEvent({ headers: {} }), stream, {});
    // The ONLY output is the signature-rejection system message — proving the
    // request never advanced to the rate-limit / processing stage that follows it.
    assert.equal(stream.output, SYS + "Unable to process request.");
    assert.equal(stream.ended, true);
  },
);

test("rejects a request with an INVALID signature", { timeout: 10000 }, async () => {
  const stream = makeStream();
  const headers = {
    "x-chat-timestamp": String(Math.floor(Date.now() / 1000)),
    "x-chat-signature": "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  };
  await handler(makeEvent({ headers }), stream, {});
  assert.equal(stream.output, SYS + "Unable to process request.");
  assert.equal(stream.ended, true);
});

test("rejects an EXPIRED signature timestamp", { timeout: 10000 }, async () => {
  const stream = makeStream();
  const body = "{}";
  const headers = signHeaders(body, KEY, { offsetSeconds: -600 });
  await handler(makeEvent({ headers, body }), stream, {});
  assert.equal(stream.output, SYS + "Unable to process request.");
});

test("a VALID signature passes verification and does NOT emit the rejection message", { timeout: 10000 }, async () => {
  // The legacy HMAC transition window is now gated behind ALLOW_LEGACY_HMAC.
  // Re-enable it here to assert a correctly-signed legacy request is still
  // admitted when the flag is on (rollback / staged-rollout safety).
  process.env.ALLOW_LEGACY_HMAC = "1";
  try {
    const stream = makeStream();
    const body = '{"messages":[{"role":"user","content":"hi"}]}';
    const headers = signHeaders(body, KEY);
    await handler(makeEvent({ headers, body }), stream, {});
    assert.ok(
      !stream.output.includes("Unable to process request."),
      `a valid signature must not be rejected; got: ${JSON.stringify(stream.output)}`,
    );
  } finally {
    delete process.env.ALLOW_LEGACY_HMAC;
  }
});

test(
  "a VALID legacy signature is REJECTED once session tokens are rolled out (ALLOW_LEGACY_HMAC unset)",
  { timeout: 10000 },
  async () => {
    const stream = makeStream();
    const body = '{"messages":[{"role":"user","content":"hi"}]}';
    const headers = signHeaders(body, KEY);
    await handler(makeEvent({ headers, body }), stream, {});
    assert.equal(stream.output, SYS + "Unable to process request.");
  },
);

test("a VALID chat-scoped bearer session token is admitted past the auth front door", { timeout: 10000 }, async () => {
  const stream = makeStream();
  const body = '{"messages":[{"role":"user","content":"hi"}]}';
  const token = issueSessionToken({ deviceHash: "a".repeat(64), scope: "chat" }, SESSION_KEY, 300);
  await handler(makeEvent({ headers: { authorization: `Bearer ${token}` }, body }), stream, {});
  assert.ok(
    !stream.output.includes("Unable to process request."),
    `a valid session token must not be rejected; got: ${JSON.stringify(stream.output)}`,
  );
});

test(
  "a bearer token minted for the WRONG scope (blueprint) is rejected on the chat endpoint",
  { timeout: 10000 },
  async () => {
    const stream = makeStream();
    const body = '{"messages":[{"role":"user","content":"hi"}]}';
    const token = issueSessionToken({ deviceHash: "a".repeat(64), scope: "blueprint" }, SESSION_KEY, 300);
    await handler(makeEvent({ headers: { authorization: `Bearer ${token}` }, body }), stream, {});
    assert.equal(stream.output, SYS + "Unable to process request.");
  },
);
