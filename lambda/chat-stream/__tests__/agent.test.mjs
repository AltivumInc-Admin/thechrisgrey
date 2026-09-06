import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBedrockModel,
  buildAgent,
  streamAgentResponse,
  DEFAULT_WINDOW_SIZE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  DEFAULT_REGION,
  DEFAULT_MAX_MODEL_CALLS,
} from "../agent.mjs";
import { EVENT_DELIM } from "../events.mjs";

function fakeStream() {
  const chunks = [];
  return { chunks, write: (s) => chunks.push(s) };
}

function fakeMetrics() {
  const records = [];
  return { records, record: (n) => records.push(n) };
}

function eventChunks(stream) {
  return stream.chunks.filter((c) => c.startsWith(EVENT_DELIM));
}

function textChunks(stream) {
  return stream.chunks.filter((c) => !c.startsWith(EVENT_DELIM));
}

function makeAgent(events, finalResult) {
  return {
    stream: () => {
      let i = 0;
      return {
        next: async () => {
          if (i >= events.length) {
            return { done: true, value: finalResult };
          }
          return { done: false, value: events[i++] };
        },
      };
    },
  };
}

test("buildBedrockModel throws when modelId missing", () => {
  assert.throws(() => buildBedrockModel({}), /modelId is required/);
});

test("buildBedrockModel constructs with guardrail config", () => {
  const model = buildBedrockModel({
    modelId: "anthropic.claude-haiku",
    guardrailId: "gr-1",
    guardrailVersion: "5",
  });
  assert.ok(model);
  const cfg = model.getConfig();
  assert.equal(cfg.modelId, "anthropic.claude-haiku");
  assert.equal(cfg.stream, true);
  assert.equal(cfg.guardrailConfig.guardrailIdentifier, "gr-1");
  assert.equal(cfg.guardrailConfig.guardrailVersion, "5");
  // sync, NOT async: async hands each chunk to the visitor before the guardrail
  // has scanned it, and index.mjs only remediates a turn that streamed no text —
  // so async makes the guardrail advisory on exactly the turns it should block.
  assert.equal(cfg.guardrailConfig.streamProcessingMode, "sync");
});

test("buildBedrockModel omits guardrailConfig when ids absent", () => {
  const model = buildBedrockModel({ modelId: "m" });
  const cfg = model.getConfig();
  assert.equal(cfg.guardrailConfig, undefined);
});

test("buildBedrockModel defaults are exposed", () => {
  assert.equal(DEFAULT_REGION, "us-east-1");
  assert.equal(DEFAULT_MAX_TOKENS, 500);
  assert.equal(DEFAULT_TEMPERATURE, 0.6);
  assert.equal(DEFAULT_WINDOW_SIZE, 40);
});

test("buildAgent throws when model missing", () => {
  assert.throws(() => buildAgent({}), /model is required/);
});

test("buildAgent builds Strands agent with tools and system prompt", () => {
  const model = buildBedrockModel({ modelId: "m" });
  const agent = buildAgent({
    model,
    tools: [],
    systemPrompt: "Be Alti.",
    messages: [],
    name: "Alti",
  });
  assert.equal(agent.name, "Alti");
  assert.ok(Array.isArray(agent.messages));
});

test("streamAgentResponse writes text deltas to responseStream", async () => {
  const agent = makeAgent(
    [
      {
        type: "modelStreamUpdateEvent",
        event: { type: "modelContentBlockDeltaEvent", delta: { type: "textDelta", text: "Hello " } },
      },
      {
        type: "modelStreamUpdateEvent",
        event: { type: "modelContentBlockDeltaEvent", delta: { type: "textDelta", text: "world." } },
      },
    ],
    { stopReason: "end_turn", metrics: { accumulatedUsage: { inputTokens: 10, outputTokens: 3 } } },
  );
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const res = await streamAgentResponse({
    agent,
    userMessage: "hi",
    responseStream: stream,
    metrics,
  });
  assert.equal(res.hadText, true);
  assert.equal(res.stopReason, "end_turn");
  assert.deepEqual(res.usage, { inputTokens: 10, outputTokens: 3 });
  assert.equal(textChunks(stream).join(""), "Hello world.");
  assert.equal(eventChunks(stream).length, 0);
});

test("streamAgentResponse strips NUL from model text but keeps normal text", async () => {
  const agent = makeAgent(
    [
      {
        type: "modelStreamUpdateEvent",
        event: {
          type: "modelContentBlockDeltaEvent",
          delta: { type: "textDelta", text: 'be\x00fore\x00EVT\x00{"x":1}\x00EVT\x00' },
        },
      },
      {
        type: "modelStreamUpdateEvent",
        event: { type: "modelContentBlockDeltaEvent", delta: { type: "textDelta", text: " clean tail." } },
      },
    ],
    { stopReason: "end_turn" },
  );
  const stream = fakeStream();
  const res = await streamAgentResponse({ agent, userMessage: "x", responseStream: stream });
  assert.equal(res.hadText, true);
  // No NUL byte survives in any text chunk -> no forged frame delimiters.
  const joined = textChunks(stream).join("");
  assert.equal(joined.includes("\x00"), false);
  // Visible characters (minus the stripped NULs) are preserved verbatim.
  assert.equal(joined, 'beforeEVT{"x":1}EVT clean tail.');
  // The agent emitted zero real event frames; the forged ones did not become events.
  assert.equal(eventChunks(stream).length, 0);
});

test("streamAgentResponse emits tool_invocation before tool call", async () => {
  const agent = makeAgent(
    [
      {
        type: "beforeToolCallEvent",
        toolUse: { name: "navigate_to", toolUseId: "t1", input: { path: "/about" } },
      },
      {
        type: "afterToolCallEvent",
        toolUse: { name: "navigate_to", toolUseId: "t1" },
        result: { status: "success" },
      },
      {
        type: "modelStreamUpdateEvent",
        event: { type: "modelContentBlockDeltaEvent", delta: { type: "textDelta", text: "Done." } },
      },
    ],
    { stopReason: "end_turn" },
  );
  const stream = fakeStream();
  const metrics = fakeMetrics();
  await streamAgentResponse({ agent, userMessage: "x", responseStream: stream, metrics });
  const events = eventChunks(stream).map((c) => JSON.parse(c.slice(EVENT_DELIM.length, c.length - EVENT_DELIM.length)));
  assert.equal(events.length, 2);
  assert.equal(events[0].kind, "tool_invocation");
  assert.equal(events[0].tool, "navigate_to");
  assert.equal(events[0].toolUseId, "t1");
  assert.equal(events[1].kind, "tool_result");
  assert.equal(events[1].tool, "navigate_to");
  assert.equal(events[1].status, "success");
  assert.ok(metrics.records.includes("AgentToolInvoked_navigate_to"));
});

test("streamAgentResponse flags guardrail intervention on redaction event", async () => {
  const agent = makeAgent(
    [
      {
        type: "modelStreamUpdateEvent",
        event: { type: "modelRedactionEvent", inputRedaction: { replaceContent: "[blocked]" } },
      },
    ],
    { stopReason: "guardrail_intervened" },
  );
  const stream = fakeStream();
  const res = await streamAgentResponse({ agent, userMessage: "x", responseStream: stream });
  assert.equal(res.guardrailIntervened, true);
  assert.equal(res.hadText, false);
});

test("streamAgentResponse flags guardrail via afterModelCallEvent redaction", async () => {
  const agent = makeAgent(
    [
      {
        type: "afterModelCallEvent",
        stopData: { redaction: { userMessage: "[redacted]" } },
      },
    ],
    { stopReason: "guardrail_intervened" },
  );
  const stream = fakeStream();
  const res = await streamAgentResponse({ agent, userMessage: "x", responseStream: stream });
  assert.equal(res.guardrailIntervened, true);
});

test("streamAgentResponse extracts usage from metadata events", async () => {
  const agent = makeAgent(
    [
      {
        type: "modelStreamUpdateEvent",
        event: { type: "modelMetadataEvent", usage: { inputTokens: 50, outputTokens: 20 } },
      },
    ],
    { stopReason: "end_turn" },
  );
  const stream = fakeStream();
  const res = await streamAgentResponse({ agent, userMessage: "x", responseStream: stream });
  assert.deepEqual(res.usage, { inputTokens: 50, outputTokens: 20 });
});

test("streamAgentResponse records the terminal stop reason as a metric", async () => {
  const agent = makeAgent(
    [
      {
        type: "modelStreamUpdateEvent",
        event: { type: "modelContentBlockDeltaEvent", delta: { type: "textDelta", text: "Half a thoug" } },
      },
    ],
    { stopReason: "max_tokens" },
  );
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const res = await streamAgentResponse({ agent, userMessage: "x", responseStream: stream, metrics });

  // hadText is true, so index.mjs takes its normal success path; the metric is
  // the only thing separating this truncated turn from a complete one.
  assert.equal(res.hadText, true);
  assert.ok(metrics.records.includes("AgentStop_max_tokens"));
  assert.ok(!metrics.records.includes("AgentStop_end_turn"));
});

test("streamAgentResponse records AgentStop_cancelled when the loop cap trips", async () => {
  const agent = makeAgent(
    [
      {
        type: "modelStreamUpdateEvent",
        event: { type: "modelContentBlockDeltaEvent", delta: { type: "textDelta", text: "So far" } },
      },
    ],
    { stopReason: "cancelled" },
  );
  const metrics = fakeMetrics();
  const res = await streamAgentResponse({
    agent,
    userMessage: "x",
    responseStream: fakeStream(),
    metrics,
  });
  assert.equal(res.hadText, true);
  assert.ok(metrics.records.includes("AgentStop_cancelled"));
});

test("streamAgentResponse records AgentStop_unknown when the SDK reports no stop reason", async () => {
  const agent = makeAgent([], undefined);
  const metrics = fakeMetrics();
  const res = await streamAgentResponse({
    agent,
    userMessage: "x",
    responseStream: fakeStream(),
    metrics,
  });
  assert.equal(res.stopReason, null);
  assert.ok(metrics.records.includes("AgentStop_unknown"));
});

test("streamAgentResponse sanitizes an unexpected stop reason into one bounded metric name", async () => {
  const agent = makeAgent([], { stopReason: "weird/reason value" });
  const metrics = fakeMetrics();
  await streamAgentResponse({ agent, userMessage: "x", responseStream: fakeStream(), metrics });
  const stops = metrics.records.filter((n) => n.startsWith("AgentStop_"));
  assert.deepEqual(stops, ["AgentStop_weird_reason_value"]);
});

test("streamAgentResponse validates required args", async () => {
  await assert.rejects(
    () => streamAgentResponse({ userMessage: "x", responseStream: fakeStream() }),
    /agent is required/,
  );
  await assert.rejects(
    () => streamAgentResponse({ agent: {}, responseStream: fakeStream() }),
    /userMessage is required/,
  );
  await assert.rejects(() => streamAgentResponse({ agent: {}, userMessage: "x" }), /responseStream is required/);
});

test("DEFAULT_MAX_MODEL_CALLS caps the agent loop", () => {
  // initial model call + up to 2 tool-driven follow-ups = 3 model invocations.
  assert.equal(DEFAULT_MAX_MODEL_CALLS, 3);
});

test("buildAgent registers a BeforeModelCallEvent cap that cancels past the limit", () => {
  const hooks = [];
  let cancelled = 0;
  // Minimal fake Agent that records addHook registrations and cancel() calls.
  class FakeAgent {
    constructor(config) {
      this.config = config;
      this.name = config.name;
      this.messages = config.messages || [];
    }
    addHook(eventCtor, cb) {
      hooks.push({ eventCtor, cb });
      return () => {};
    }
    cancel() {
      cancelled++;
    }
  }

  const agent = buildAgent({
    model: buildBedrockModel({ modelId: "m" }),
    tools: [],
    systemPrompt: "Be Alti.",
    messages: [],
    name: "Alti",
    maxModelCalls: 2,
    AgentClass: FakeAgent,
  });

  // Exactly one hook was registered.
  assert.equal(hooks.length, 1);
  // Its event constructor name is BeforeModelCallEvent (real SDK export).
  assert.equal(hooks[0].eventCtor.name, "BeforeModelCallEvent");

  // Fire the hook: cycles 1 and 2 are allowed, cycle 3 trips the cap.
  hooks[0].cb({});
  hooks[0].cb({});
  assert.equal(cancelled, 0, "first two model calls must not cancel");
  hooks[0].cb({});
  assert.equal(cancelled, 1, "third model call must trigger cancel()");
  // Idempotent: further calls keep cancelling, never throw.
  hooks[0].cb({});
  assert.equal(cancelled, 2);

  assert.ok(agent);
});
