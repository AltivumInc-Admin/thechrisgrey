/**
 * Knowledge Base retrieval CONTRACT test — opt-in, against the LIVE Bedrock KB.
 *
 * kbRetrieve.test.mjs proves the retrieval LOGIC with a fake Bedrock client that
 * returns hardcoded passages — it never calls the real Retrieve API. So nothing
 * proves the live KB (ARFYABW8HP) is reachable, that the configured KB id is
 * valid, or that `RetrieveResponse.retrievalResults[].content.text` still has the
 * shape `retrieveContext()` parses. A wrong KB id, a region mismatch, or an API
 * shape change would ship green and leave Alti silently un-grounded.
 *
 * This runs the REAL retrieveContext() (lambda/chat-stream/kbRetrieve.mjs) with a
 * real BedrockAgentRuntimeClient + RetrieveCommand.
 *
 * Every assertion below must be UNSATISFIABLE by the failure path. retrieveContext
 * swallows every error into null and records latency on both branches, so
 * "null or a string" and "latency OR failure" would pass with no credentials, a
 * deleted KB, or the wrong region — a green run proving nothing. Assert the
 * success metric and the absence of the failure metric instead.
 *
 * GATING: skips cleanly (exit 0) unless KB_RETRIEVE_CONTRACT_TESTS is set. Enable:
 *
 *   KB_RETRIEVE_CONTRACT_TESTS=1 node --test lambda/chat-stream/__tests__/kb-retrieve-contract.test.mjs
 *
 * Optional env: KB_ID (default ARFYABW8HP, matching index.mjs), AWS_REGION
 * (default us-east-1). Requires AWS credentials with bedrock:Retrieve on the KB.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { retrieveContext } from "../kbRetrieve.mjs";
import { recordingMetrics } from "./harness.mjs";

if (!process.env.KB_RETRIEVE_CONTRACT_TESTS) {
  test(
    "kb retrieve contract (skipped: set KB_RETRIEVE_CONTRACT_TESTS=1 to run against live Bedrock KB)",
    { skip: true },
    () => {},
  );
} else {
  const { BedrockAgentRuntimeClient, RetrieveCommand } = await import("@aws-sdk/client-bedrock-agent-runtime");

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const knowledgeBaseId = process.env.KB_ID || "ARFYABW8HP";
  const agentClient = new BedrockAgentRuntimeClient({ region });
  const LIVE_TIMEOUT_MS = 30_000;

  test(
    "LIVE Retrieve against the KB returns grounded passages for a topic the KB demonstrably covers",
    { timeout: LIVE_TIMEOUT_MS },
    async () => {
      const metrics = recordingMetrics();
      const result = await retrieveContext(
        agentClient,
        RetrieveCommand,
        "Christian Perez Green Beret 18D special forces background",
        { knowledgeBaseId, requestId: "contract-1", metrics, timeoutMs: 8000, numberOfResults: 5 },
      );

      const names = metrics.records.map((r) => r.name);

      // null is what retrieveContext returns for a bad KB id, a wrong region, or
      // missing credentials. For a KB that holds Christian's biography, null is a
      // FAILURE, not an acceptable contract outcome.
      assert.equal(typeof result, "string", `expected passages, got ${result === null ? "null" : typeof result}`);
      assert.ok(result.length > 0, "a live retrieval must return non-empty passages");

      // Named metrics, not a disjunction that both branches satisfy.
      assert.ok(names.includes("KBRetrievalSuccess"), `expected KBRetrievalSuccess, got: ${names.join(", ")}`);
      assert.ok(!names.includes("KBRetrievalFailure"), `unexpected KBRetrievalFailure: ${names.join(", ")}`);
      assert.ok(!names.includes("KBRetrievalEmpty"), "the KB returned zero hits for a topic it holds");
      assert.ok(!names.includes("KBRetrievalUnparseable"), "retrievalResults[].content.text no longer parses");

      // A shape change that keeps content.text but empties the corpus would still
      // satisfy everything above; this pins that the KB is the right one.
      assert.match(result, /Christian/i, "retrieved passages must come from Christian's knowledge base");
    },
  );

  test(
    "LIVE Retrieve degrades to null on an aggressive timeout (AbortError is caught, not thrown)",
    { timeout: LIVE_TIMEOUT_MS },
    async () => {
      const metrics = recordingMetrics();
      // 1ms ceiling forces the AbortController path; retrieveContext must swallow
      // the AbortError and return null rather than throwing into the agent loop.
      const result = await retrieveContext(agentClient, RetrieveCommand, "anything", {
        knowledgeBaseId,
        requestId: "contract-timeout",
        metrics,
        timeoutMs: 1,
        numberOfResults: 1,
      });
      assert.equal(result, null, "an aborted retrieval must return null");
      const names = metrics.records.map((r) => r.name);
      // KBRetrievalFailure alone is recorded for EVERY error name, so asserting it
      // would pass even if the abort classification never fired. Timeout is the
      // only metric that proves the SDK's abort error is still named AbortError.
      assert.ok(names.includes("KBRetrievalTimeout"), `expected KBRetrievalTimeout, got: ${names.join(", ")}`);
      assert.ok(names.includes("KBRetrievalFailure"), "a timed-out retrieval must also record KBRetrievalFailure");
    },
  );
}
