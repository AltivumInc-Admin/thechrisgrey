import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { issueSessionToken } from "../sessionToken.mjs";
import { authenticateRequest } from "../requestAuth.mjs";

const SESSION_KEY = "server-session-key";
const LEGACY_KEY = "legacy-shared-hmac-key";
const DEVICE_HASH = "c".repeat(64);

function legacySign(body, key, { signatureHeader = "x-chat-signature", timestampHeader = "x-chat-timestamp" } = {}) {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", key).update(`${ts}.${body}`).digest("hex");
  return { [timestampHeader]: ts, [signatureHeader]: sig };
}

function evt({ headers = {}, body = "{}" } = {}) {
  return { headers, body };
}

test("a valid bearer session token authenticates via the token path", () => {
  const token = issueSessionToken({ deviceHash: DEVICE_HASH, scope: "chat" }, SESSION_KEY, 300);
  const r = authenticateRequest(evt({ headers: { authorization: `Bearer ${token}` } }), {
    sessionKey: SESSION_KEY,
    scope: "chat",
    legacyKey: LEGACY_KEY,
  });
  assert.equal(r.valid, true);
  assert.equal(r.method, "token");
  assert.equal(r.deviceHash, DEVICE_HASH);
});

test("an invalid bearer token is rejected (does NOT silently fall back to legacy)", () => {
  const r = authenticateRequest(evt({ headers: { authorization: "Bearer v1.0.chat.x.deadbeef" } }), {
    sessionKey: SESSION_KEY,
    scope: "chat",
    legacyKey: LEGACY_KEY,
  });
  assert.equal(r.valid, false);
  assert.equal(r.method, "token");
});

test("a bearer token minted for another scope is rejected", () => {
  const token = issueSessionToken({ deviceHash: DEVICE_HASH, scope: "chat" }, SESSION_KEY, 300);
  const r = authenticateRequest(evt({ headers: { authorization: `Bearer ${token}` } }), {
    sessionKey: SESSION_KEY,
    scope: "blueprint",
    legacyKey: LEGACY_KEY,
  });
  assert.equal(r.valid, false);
  assert.equal(r.error, "scope_mismatch");
});

test("with no bearer header, a valid legacy HMAC signature authenticates ONLY when ALLOW_LEGACY_HMAC=1", () => {
  // The legacy transition window is now gated behind ALLOW_LEGACY_HMAC.
  process.env.ALLOW_LEGACY_HMAC = "1";
  try {
    const body = JSON.stringify({ messages: [] });
    const headers = legacySign(body, LEGACY_KEY);
    const r = authenticateRequest(evt({ headers, body }), {
      sessionKey: SESSION_KEY,
      scope: "chat",
      legacyKey: LEGACY_KEY,
    });
    assert.equal(r.valid, true);
    assert.equal(r.method, "legacy");
  } finally {
    delete process.env.ALLOW_LEGACY_HMAC;
  }
});

test("with no bearer and ALLOW_LEGACY_HMAC unset, the request is rejected as missing_token (token path)", () => {
  // sessionKey configured + no bearer → token path rejects before legacy runs.
  const r = authenticateRequest(
    evt({ headers: { "x-chat-timestamp": "123", "x-chat-signature": "bad" }, body: "{}" }),
    {
      sessionKey: SESSION_KEY,
      scope: "chat",
      legacyKey: LEGACY_KEY,
    },
  );
  assert.equal(r.valid, false);
  assert.equal(r.method, "token");
  assert.equal(r.error, "missing_token");
});

test("honors custom legacy signature header names (blueprint) when ALLOW_LEGACY_HMAC=1", () => {
  process.env.ALLOW_LEGACY_HMAC = "1";
  try {
    const body = JSON.stringify({ spec: {} });
    const opts = { signatureHeader: "x-blueprint-signature", timestampHeader: "x-blueprint-timestamp" };
    const headers = legacySign(body, LEGACY_KEY, opts);
    const r = authenticateRequest(evt({ headers, body }), {
      sessionKey: SESSION_KEY,
      scope: "blueprint",
      legacyKey: LEGACY_KEY,
      legacySigOptions: opts,
    });
    assert.equal(r.valid, true);
    assert.equal(r.method, "legacy");
  } finally {
    delete process.env.ALLOW_LEGACY_HMAC;
  }
});

test("a bearer present but sessionKey unset falls through to legacy (deploy-ordering safety)", () => {
  // If the Lambda hasn't been given SESSION_TOKEN_KEY yet, a stray bearer must
  // not hard-fail; legacy auth governs until the key is configured.
  const body = "{}";
  const headers = { authorization: "Bearer something", ...legacySign(body, LEGACY_KEY) };
  const r = authenticateRequest(evt({ headers, body }), {
    sessionKey: "",
    scope: "chat",
    legacyKey: LEGACY_KEY,
  });
  assert.equal(r.valid, true);
  assert.equal(r.method, "legacy");
});

test("when SESSION_TOKEN_KEY is set, a request with NO bearer is rejected (legacy HMAC no longer accepted)", () => {
  // Even with a valid legacy signature, the presence of a configured session
  // signing key means tokens are now required — legacy HMAC alone is rejected.
  const body = "{}";
  const headers = legacySign(body, LEGACY_KEY);
  const r = authenticateRequest(evt({ headers, body }), {
    sessionKey: SESSION_KEY,
    scope: "chat",
    legacyKey: LEGACY_KEY,
  });
  assert.equal(r.valid, false);
  assert.equal(r.method, "token");
  assert.equal(r.error, "missing_token");
});

test("ALLOW_LEGACY_HMAC=1 re-enables the legacy transition window when sessionKey is set", () => {
  process.env.ALLOW_LEGACY_HMAC = "1";
  try {
    const body = "{}";
    const headers = legacySign(body, LEGACY_KEY);
    const r = authenticateRequest(evt({ headers, body }), {
      sessionKey: SESSION_KEY,
      scope: "chat",
      legacyKey: LEGACY_KEY,
    });
    assert.equal(r.valid, true);
    assert.equal(r.method, "legacy");
  } finally {
    delete process.env.ALLOW_LEGACY_HMAC;
  }
});

test("ALLOW_LEGACY_HMAC=1 does NOT rescue an invalid legacy signature", () => {
  process.env.ALLOW_LEGACY_HMAC = "1";
  try {
    const r = authenticateRequest(
      evt({ headers: { "x-chat-timestamp": "123", "x-chat-signature": "bad" }, body: "{}" }),
      {
        sessionKey: SESSION_KEY,
        scope: "chat",
        legacyKey: LEGACY_KEY,
      },
    );
    assert.equal(r.valid, false);
    assert.equal(r.method, "legacy");
  } finally {
    delete process.env.ALLOW_LEGACY_HMAC;
  }
});

test("a valid bearer token still authenticates via the token path even when ALLOW_LEGACY_HMAC=1", () => {
  process.env.ALLOW_LEGACY_HMAC = "1";
  try {
    const token = issueSessionToken({ deviceHash: DEVICE_HASH, scope: "chat" }, SESSION_KEY, 300);
    const r = authenticateRequest(evt({ headers: { authorization: `Bearer ${token}` } }), {
      sessionKey: SESSION_KEY,
      scope: "chat",
      legacyKey: LEGACY_KEY,
    });
    assert.equal(r.valid, true);
    assert.equal(r.method, "token");
  } finally {
    delete process.env.ALLOW_LEGACY_HMAC;
  }
});
