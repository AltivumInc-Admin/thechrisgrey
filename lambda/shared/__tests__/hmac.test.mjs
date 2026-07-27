import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { verifySignature, SIGNATURE_MAX_AGE_SECONDS } from "../hmac.mjs";

function makeEvent({ body = "", headers = {} } = {}) {
  return { body, headers };
}

// Self-contained signer (no cross-lambda harness coupling). Signs with the given
// header names so we can exercise both the chat default and the blueprint pair.
function sign(body, key, { signatureHeader, timestampHeader, offsetSeconds = 0 }) {
  const ts = String(Math.floor(Date.now() / 1000) + offsetSeconds);
  const sig = createHmac("sha256", key).update(`${ts}.${body}`).digest("hex");
  return { [timestampHeader]: ts, [signatureHeader]: sig };
}

const KEY = "test-secret-key";

// Run the full matrix against each service's header configuration.
const CONFIGS = [
  {
    name: "chat (default headers)",
    opts: undefined, // exercises the x-chat-* defaults
    signatureHeader: "x-chat-signature",
    timestampHeader: "x-chat-timestamp",
  },
  {
    name: "blueprint (x-blueprint-* headers)",
    opts: { signatureHeader: "x-blueprint-signature", timestampHeader: "x-blueprint-timestamp" },
    signatureHeader: "x-blueprint-signature",
    timestampHeader: "x-blueprint-timestamp",
  },
];

for (const cfg of CONFIGS) {
  const verify = (event, key) => verifySignature(event, key, cfg.opts);
  const signWith = (body, key, extra = {}) =>
    sign(body, key, { signatureHeader: cfg.signatureHeader, timestampHeader: cfg.timestampHeader, ...extra });

  test(`[${cfg.name}] empty signing key bypasses verification (local/dev)`, () => {
    assert.deepEqual(verify(makeEvent({ body: "{}" }), ""), { valid: true });
  });

  test(`[${cfg.name}] empty signing key fails closed when AUTH_FAIL_CLOSED=1`, () => {
    process.env.AUTH_FAIL_CLOSED = "1";
    try {
      assert.deepEqual(verify(makeEvent({ body: "{}" }), ""), {
        valid: false,
        error: "missing_signing_key",
      });
    } finally {
      delete process.env.AUTH_FAIL_CLOSED;
    }
  });

  test(`[${cfg.name}] empty signing key fails closed on the AWS Lambda runtime`, () => {
    process.env.AWS_LAMBDA_FUNCTION_NAME = "thechrisgrey-test";
    try {
      assert.deepEqual(verify(makeEvent({ body: "{}" }), ""), {
        valid: false,
        error: "missing_signing_key",
      });
    } finally {
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    }
  });

  test(`[${cfg.name}] valid signature passes`, () => {
    const body = '{"messages":[{"role":"user","content":"hi"}]}';
    const event = makeEvent({ body, headers: signWith(body, KEY) });
    assert.deepEqual(verify(event, KEY), { valid: true });
  });

  test(`[${cfg.name}] missing timestamp header fails`, () => {
    const body = "{}";
    const headers = signWith(body, KEY);
    delete headers[cfg.timestampHeader];
    assert.deepEqual(verify(makeEvent({ body, headers }), KEY), { valid: false, error: "missing_headers" });
  });

  test(`[${cfg.name}] missing signature header fails`, () => {
    const body = "{}";
    const headers = signWith(body, KEY);
    delete headers[cfg.signatureHeader];
    assert.deepEqual(verify(makeEvent({ body, headers }), KEY), { valid: false, error: "missing_headers" });
  });

  test(`[${cfg.name}] non-numeric timestamp fails`, () => {
    const event = makeEvent({
      body: "{}",
      headers: { [cfg.timestampHeader]: "not-a-number", [cfg.signatureHeader]: "deadbeef" },
    });
    assert.deepEqual(verify(event, KEY), { valid: false, error: "invalid_timestamp" });
  });

  test(`[${cfg.name}] expired timestamp fails`, () => {
    const body = "{}";
    const event = makeEvent({
      body,
      headers: signWith(body, KEY, { offsetSeconds: -(SIGNATURE_MAX_AGE_SECONDS + 10) }),
    });
    assert.deepEqual(verify(event, KEY), { valid: false, error: "expired_timestamp" });
  });

  test(`[${cfg.name}] future timestamp outside the window fails`, () => {
    const body = "{}";
    const event = makeEvent({ body, headers: signWith(body, KEY, { offsetSeconds: SIGNATURE_MAX_AGE_SECONDS + 10 }) });
    assert.deepEqual(verify(event, KEY), { valid: false, error: "expired_timestamp" });
  });

  test(`[${cfg.name}] tampered body fails`, () => {
    const body = '{"messages":[{"role":"user","content":"hi"}]}';
    const headers = signWith(body, KEY);
    assert.deepEqual(verify(makeEvent({ body: body + "tampered", headers }), KEY), {
      valid: false,
      error: "invalid_signature",
    });
  });

  test(`[${cfg.name}] wrong-length signature fails without throwing`, () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const event = makeEvent({ body: "{}", headers: { [cfg.timestampHeader]: ts, [cfg.signatureHeader]: "deadbeef" } });
    assert.deepEqual(verify(event, KEY), { valid: false, error: "invalid_signature" });
  });

  test(`[${cfg.name}] right-length-but-wrong-bytes signature fails`, () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const event = makeEvent({
      body: "{}",
      headers: { [cfg.timestampHeader]: ts, [cfg.signatureHeader]: "0".repeat(64) },
    });
    assert.deepEqual(verify(event, KEY), { valid: false, error: "invalid_signature" });
  });

  test(`[${cfg.name}] signature from wrong key fails`, () => {
    const body = "{}";
    const event = makeEvent({ body, headers: signWith(body, "different-key") });
    assert.deepEqual(verify(event, KEY), { valid: false, error: "invalid_signature" });
  });
}

// Cross-config guard: a chat-signed event must NOT validate when blueprint headers are expected.
test("a chat-signed event is rejected under blueprint header config", () => {
  const body = "{}";
  const headers = sign(body, KEY, { signatureHeader: "x-chat-signature", timestampHeader: "x-chat-timestamp" });
  const res = verifySignature(makeEvent({ body, headers }), KEY, {
    signatureHeader: "x-blueprint-signature",
    timestampHeader: "x-blueprint-timestamp",
  });
  assert.deepEqual(res, { valid: false, error: "missing_headers" });
});
