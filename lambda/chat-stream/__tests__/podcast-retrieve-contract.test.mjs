/**
 * Podcast KB retrieval CONTRACT test — opt-in, against the LIVE Bedrock KB.
 *
 * podcastRetrieve.test.mjs proves the retrieval LOGIC with a fake Bedrock client.
 * The load-bearing part of this feature is the per-chunk metadata contract:
 * retrievePodcastChunks drops every chunk lacking `videoId`/`startSeconds`, so if
 * a re-ingest stops surfacing those custom keys, search_podcast returns nothing
 * forever and every mocked test stays green. Only a real Retrieve can catch that.
 *
 * Mirrors kb-retrieve-contract.test.mjs, including its rule that no assertion may
 * be satisfiable by the failure path: retrievePodcastChunks swallows errors into
 * null, so "null or an array" would pass with no credentials or a deleted KB.
 *
 * GATING: skips cleanly (exit 0) unless PODCAST_KB_CONTRACT_TESTS is set. Enable:
 *
 *   PODCAST_KB_CONTRACT_TESTS=1 PODCAST_KB_ID=<id> \
 *     node --test lambda/chat-stream/__tests__/podcast-retrieve-contract.test.mjs
 *
 * PODCAST_KB_ID is REQUIRED (index.mjs defaults it to "" and the id changed in the
 * account migration, so a hardcoded default here would silently test the wrong KB).
 * Optional env: AWS_REGION (default us-east-1). Needs bedrock:Retrieve on the KB.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { retrievePodcastChunks } from "../podcastRetrieve.mjs";
import { recordingMetrics } from "./harness.mjs";

if (!process.env.PODCAST_KB_CONTRACT_TESTS) {
  test(
    "podcast retrieve contract (skipped: set PODCAST_KB_CONTRACT_TESTS=1 to run against live Bedrock KB)",
    { skip: true },
    () => {},
  );
} else {
  const { BedrockAgentRuntimeClient, RetrieveCommand } = await import("@aws-sdk/client-bedrock-agent-runtime");

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const knowledgeBaseId = process.env.PODCAST_KB_ID;
  const agentClient = new BedrockAgentRuntimeClient({ region });
  const LIVE_TIMEOUT_MS = 30_000;

  test("PODCAST_KB_ID must be set for the contract test to mean anything", () => {
    // Failing loudly beats skipping: a contract test that quietly passes with no
    // KB id is exactly the tautology this file exists to avoid.
    assert.ok(knowledgeBaseId, "set PODCAST_KB_ID to the live podcast knowledge base id");
  });

  test(
    "LIVE Retrieve against the podcast KB returns chunks carrying the citation metadata",
    { timeout: LIVE_TIMEOUT_MS },
    async () => {
      const metrics = recordingMetrics();
      const chunks = await retrievePodcastChunks(agentClient, RetrieveCommand, "women veterans after service", {
        knowledgeBaseId,
        requestId: "podcast-contract-1",
        metrics,
        timeoutMs: 8000,
        numberOfResults: 4,
      });

      const names = metrics.records.map((r) => r.name);

      // null is what a bad KB id, a wrong region or missing credentials produce.
      assert.notEqual(chunks, null, "the podcast KB must be reachable with the configured id");
      assert.ok(chunks.length > 0, "the archive demonstrably covers this topic; zero chunks is a regression");
      assert.ok(names.includes("PodcastKBRetrievalSuccess"), `expected Success, got: ${names.join(", ")}`);
      assert.ok(!names.includes("PodcastKBRetrievalFailure"), `unexpected Failure: ${names.join(", ")}`);
      assert.ok(
        !names.includes("PodcastKBRetrievalUnparseable"),
        "retrieval returned passages whose videoId/startSeconds metadata no longer parses",
      );

      // The metadata contract itself, which is what an ingestion change breaks.
      for (const c of chunks) {
        assert.match(c.videoId, /^[A-Za-z0-9_-]{6,20}$/, "each chunk must carry a YouTube-id-shaped videoId");
        assert.equal(typeof c.startSeconds, "number", "each chunk must carry a numeric startSeconds");
        assert.ok(Number.isFinite(c.startSeconds) && c.startSeconds >= 0);
        assert.equal(typeof c.episodeTitle, "string", "each chunk must carry an episodeTitle for the card label");
        assert.ok(c.text.length > 0, "each chunk must carry quotable text");
      }
    },
  );

  test(
    "LIVE Retrieve degrades to null on an aggressive timeout (AbortError is caught, not thrown)",
    { timeout: LIVE_TIMEOUT_MS },
    async () => {
      const metrics = recordingMetrics();
      // 1ms ceiling forces the AbortController path.
      const chunks = await retrievePodcastChunks(agentClient, RetrieveCommand, "anything", {
        knowledgeBaseId,
        requestId: "podcast-contract-timeout",
        metrics,
        timeoutMs: 1,
        numberOfResults: 1,
      });
      assert.equal(chunks, null, "an aborted retrieval must return null, never an empty archive");
      const names = metrics.records.map((r) => r.name);
      // Timeout, not just Failure: Failure is recorded for every error name, so
      // asserting it alone would pass even if the abort classification never fired.
      assert.ok(names.includes("PodcastKBRetrievalTimeout"), `expected Timeout, got: ${names.join(", ")}`);
      assert.ok(names.includes("PodcastKBRetrievalFailure"), "a timed-out retrieval must also record Failure");
    },
  );
}
