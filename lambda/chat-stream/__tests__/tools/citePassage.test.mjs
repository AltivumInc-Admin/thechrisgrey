import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCitePassageTool } from "../../tools/citePassage.mjs";
import { EVENT_DELIM } from "../../events.mjs";

function fakeStream() {
  const chunks = [];
  return { chunks, write: (s) => chunks.push(s) };
}
function fakeMetrics() {
  const records = [];
  return { records, record: (n) => records.push(n) };
}
function fakeSanity(post) {
  const queries = [];
  return {
    queries,
    fetch: async (q, p) => {
      queries.push({ q, p });
      return post;
    },
  };
}
function rejectingSanity(error) {
  return {
    fetch: async () => {
      throw error;
    },
  };
}
function parseLastEvent(stream) {
  const chunk = stream.chunks[stream.chunks.length - 1];
  return JSON.parse(chunk.slice(EVENT_DELIM.length, chunk.length - EVENT_DELIM.length));
}

test("cite_blog_passage returns post + URL and emits citation event", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const post = {
    title: "Agentic Alti",
    excerpt: "How we turned the chatbot into a tool-using agent.",
    slug: "agentic-alti",
    publishedAt: "2026-04-01T00:00:00Z",
  };
  const sanityClient = fakeSanity(post);
  const tool = buildCitePassageTool({ sanityClient, responseStream: stream, metrics });
  const result = await tool.invoke({ slug: "agentic-alti" });
  assert.equal(result.ok, true);
  assert.equal(result.title, "Agentic Alti");
  assert.equal(result.url, "https://thechrisgrey.com/blog/agentic-alti");
  assert.equal(sanityClient.queries.length, 1);
  assert.deepEqual(sanityClient.queries[0].p, { slug: "agentic-alti" });
  const event = parseLastEvent(stream);
  assert.equal(event.action, "citation");
  assert.equal(event.slug, "agentic-alti");
  assert.equal(event.url, "https://thechrisgrey.com/blog/agentic-alti");
  assert.ok(metrics.records.includes("ToolCall_CitePassage"));
});

test("cite_blog_passage returns ok:false when no post found", async () => {
  const stream = fakeStream();
  const sanityClient = fakeSanity(null);
  const tool = buildCitePassageTool({ sanityClient, responseStream: stream, metrics: fakeMetrics() });
  const result = await tool.invoke({ slug: "missing-post" });
  assert.equal(result.ok, false);
  assert.match(result.error, /No blog post/i);
  assert.equal(stream.chunks.length, 0);
});

test("cite_blog_passage handles Sanity errors gracefully", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const sanityClient = rejectingSanity(new Error("Sanity down"));
  const tool = buildCitePassageTool({ sanityClient, responseStream: stream, metrics, requestId: "r1" });
  const result = await tool.invoke({ slug: "any-slug" });
  assert.equal(result.ok, false);
  assert.match(result.error, /Unable to fetch/i);
  assert.ok(metrics.records.includes("ToolFailure_CitePassage"));
  // ToolCall_ counts attempts, not successes: a thrown fetch must still register
  // the attempt, or ToolFailure_/ToolCall_ is not a failure rate.
  assert.ok(metrics.records.includes("ToolCall_CitePassage"));
});
