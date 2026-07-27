import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { issueSessionToken, verifySessionToken, SESSION_TOKEN_VERSION } from "../sessionToken.mjs";

const KEY = "server-only-secret";
const DEVICE_HASH = "a".repeat(64); // sha256 hex shape

test("round-trips: a freshly issued token verifies and returns its deviceHash", () => {
  const token = issueSessionToken({ deviceHash: DEVICE_HASH, scope: "chat" }, KEY, 300);
  const result = verifySessionToken(token, KEY, { scope: "chat" });
  assert.equal(result.valid, true);
  assert.equal(result.deviceHash, DEVICE_HASH);
});

test("issued token carries the current version prefix", () => {
  const token = issueSessionToken({ deviceHash: DEVICE_HASH, scope: "blueprint" }, KEY, 300);
  assert.ok(token.startsWith(`${SESSION_TOKEN_VERSION}.`));
});

test("an expired token is rejected", () => {
  const token = issueSessionToken({ deviceHash: DEVICE_HASH, scope: "chat" }, KEY, -10);
  const result = verifySessionToken(token, KEY, { scope: "chat" });
  assert.equal(result.valid, false);
  assert.equal(result.error, "expired");
});

test("a token minted for a different scope is rejected", () => {
  const token = issueSessionToken({ deviceHash: DEVICE_HASH, scope: "chat" }, KEY, 300);
  const result = verifySessionToken(token, KEY, { scope: "blueprint" });
  assert.equal(result.valid, false);
  assert.equal(result.error, "scope_mismatch");
});

test("a token signed with a different key is rejected", () => {
  const token = issueSessionToken({ deviceHash: DEVICE_HASH, scope: "chat" }, KEY, 300);
  const result = verifySessionToken(token, "other-key", { scope: "chat" });
  assert.equal(result.valid, false);
  assert.equal(result.error, "invalid_signature");
});

test("a tampered deviceHash invalidates the signature", () => {
  const token = issueSessionToken({ deviceHash: DEVICE_HASH, scope: "chat" }, KEY, 300);
  const parts = token.split(".");
  parts[3] = "b".repeat(64); // swap the deviceHash field
  const tampered = parts.join(".");
  const result = verifySessionToken(tampered, KEY, { scope: "chat" });
  assert.equal(result.valid, false);
  assert.equal(result.error, "invalid_signature");
});

test("a tampered exp (extending lifetime) invalidates the signature", () => {
  const token = issueSessionToken({ deviceHash: DEVICE_HASH, scope: "chat" }, KEY, -10);
  const parts = token.split(".");
  parts[1] = String(Math.floor(Date.now() / 1000) + 10_000); // push exp far into the future
  const tampered = parts.join(".");
  const result = verifySessionToken(tampered, KEY, { scope: "chat" });
  assert.equal(result.valid, false);
  assert.equal(result.error, "invalid_signature");
});

test("empty / missing token is rejected", () => {
  assert.equal(verifySessionToken("", KEY, { scope: "chat" }).error, "missing_token");
  assert.equal(verifySessionToken(undefined, KEY, { scope: "chat" }).error, "missing_token");
});

test("a malformed token (wrong field count) is rejected", () => {
  const result = verifySessionToken("v1.123.chat", KEY, { scope: "chat" });
  assert.equal(result.valid, false);
  assert.equal(result.error, "malformed_token");
});

test("a token with an unknown version is rejected", () => {
  const token = issueSessionToken({ deviceHash: DEVICE_HASH, scope: "chat" }, KEY, 300);
  const parts = token.split(".");
  parts[0] = "v2";
  // Re-sign so it's only the version that's 'wrong' (signature still matches v2 payload
  // would require the real key; here we assert version is checked before/independently).
  const result = verifySessionToken(parts.join("."), KEY, { scope: "chat" });
  assert.equal(result.valid, false);
  assert.equal(result.error, "bad_version");
});

test("missing signing key disables verification (parity with hmac.mjs)", () => {
  // An empty server key means verification is intentionally disabled (local/dev).
  const result = verifySessionToken("anything", "", { scope: "chat" });
  assert.equal(result.valid, true);
});

test("empty key fails closed when AUTH_FAIL_CLOSED is explicitly enabled", () => {
  process.env.AUTH_FAIL_CLOSED = "1";
  try {
    const result = verifySessionToken("anything", "", { scope: "chat" });
    assert.equal(result.valid, false);
    assert.equal(result.error, "missing_signing_key");
  } finally {
    delete process.env.AUTH_FAIL_CLOSED;
  }
});

test("empty key fails closed on the AWS Lambda runtime (AWS_LAMBDA_FUNCTION_NAME set)", () => {
  process.env.AWS_LAMBDA_FUNCTION_NAME = "thechrisgrey-chat-stream";
  try {
    const result = verifySessionToken("anything", "", { scope: "chat" });
    assert.equal(result.valid, false);
    assert.equal(result.error, "missing_signing_key");
  } finally {
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  }
});

test("AUTH_FAIL_CLOSED=0 explicitly preserves the empty-key bypass (local/dev)", () => {
  process.env.AUTH_FAIL_CLOSED = "0";
  process.env.AWS_LAMBDA_FUNCTION_NAME = "thechrisgrey-chat-stream";
  try {
    const result = verifySessionToken("anything", "", { scope: "chat" });
    assert.equal(result.valid, true);
  } finally {
    delete process.env.AUTH_FAIL_CLOSED;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  }
});

test("the bare HMAC matches the documented payload shape", () => {
  // Lock the wire format so the client and any re-implementation stay compatible.
  const exp = Math.floor(Date.now() / 1000) + 300;
  const expectedSig = createHmac("sha256", KEY).update(`${exp}.chat.${DEVICE_HASH}`).digest("hex");
  // issueSessionToken uses ttlSeconds, so reconstruct with a fixed exp via a tiny helper path:
  const token = `${SESSION_TOKEN_VERSION}.${exp}.chat.${DEVICE_HASH}.${expectedSig}`;
  const result = verifySessionToken(token, KEY, { scope: "chat" });
  assert.equal(result.valid, true);
});
