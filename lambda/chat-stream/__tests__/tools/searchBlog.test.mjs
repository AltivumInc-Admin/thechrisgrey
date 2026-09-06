import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSearchBlogTool } from "../../tools/searchBlog.mjs";
import { EVENT_DELIM } from "../../events.mjs";

function fakeStream() {
  const chunks = [];
  return { chunks, write: (s) => chunks.push(s) };
}

function fakeMetrics() {
  const records = [];
  return {
    records,
    record: (name, value, unit) => records.push({ name, value, unit }),
  };
}

function fakeSanity(results) {
  const calls = [];
  return {
    calls,
    fetch: async (q, p) => {
      calls.push({ q, p });
      return results;
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

test("search_blog returns normalized results and emits blog_search_results event", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const posts = [
    {
      title: "Going Agentic",
      slug: "going-agentic",
      excerpt: "How Alti became a tool-user.",
      publishedAt: "2026-04-01T00:00:00Z",
    },
    {
      title: "Strands, A Tour",
      slug: "strands-a-tour",
      excerpt: "Strands Agents SDK walkthrough.",
      publishedAt: "2026-03-15T00:00:00Z",
    },
  ];
  const sanityClient = fakeSanity(posts);
  const searchTool = buildSearchBlogTool({ sanityClient, responseStream: stream, metrics });

  const result = await searchTool.invoke({ query: "strands", limit: 3 });

  assert.equal(result.ok, true);
  assert.equal(result.query, "strands");
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].slug, "going-agentic");
  assert.equal(sanityClient.calls.length, 1);
  assert.deepEqual(sanityClient.calls[0].p, { q: "strands", limit: 3 });

  const event = parseLastEvent(stream);
  assert.equal(event.action, "blog_search_results");
  assert.equal(event.query, "strands");
  assert.equal(event.results.length, 2);
  assert.equal(event.results[0].url, "https://thechrisgrey.com/blog/going-agentic");
  assert.equal(event.results[0].title, "Going Agentic");

  const names = metrics.records.map((r) => r.name);
  assert.ok(names.includes("ToolCall_SearchBlog"));
  assert.ok(names.includes("ToolLatency_SearchBlog"));
  const latency = metrics.records.find((r) => r.name === "ToolLatency_SearchBlog");
  assert.equal(latency.unit, "Milliseconds");
});

test("search_blog returns empty results array without emitting an event when nothing matches", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const sanityClient = fakeSanity([]);
  const searchTool = buildSearchBlogTool({ sanityClient, responseStream: stream, metrics });

  const result = await searchTool.invoke({ query: "obscure topic", limit: 3 });

  assert.equal(result.ok, true);
  assert.equal(result.results.length, 0);
  assert.equal(stream.chunks.length, 0, "should not emit an event for zero results");
  assert.ok(metrics.records.map((r) => r.name).includes("ToolCall_SearchBlog"));
});

test("search_blog rejects stop-word-only queries with ToolRejection metric", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const sanityClient = fakeSanity([]);
  const searchTool = buildSearchBlogTool({ sanityClient, responseStream: stream, metrics });

  const result = await searchTool.invoke({ query: "the and or", limit: 3 });

  assert.equal(result.ok, false);
  assert.match(result.error, /meaningful keyword/i);
  assert.equal(sanityClient.calls.length, 0, "should not call Sanity for stop-word query");
  const rejectedNames = metrics.records.map((r) => r.name);
  assert.ok(rejectedNames.includes("ToolRejection_SearchBlog"));
  // A query rejected before any I/O is a rejection, not an attempt — same shape
  // as navigate_to, which records ToolRejection_ and returns without ToolCall_.
  assert.ok(!rejectedNames.includes("ToolCall_SearchBlog"));
});

test("search_blog handles Sanity errors gracefully", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const sanityClient = rejectingSanity(new Error("Sanity down"));
  const searchTool = buildSearchBlogTool({
    sanityClient,
    responseStream: stream,
    metrics,
    requestId: "req-1",
  });

  const result = await searchTool.invoke({ query: "strands", limit: 3 });

  assert.equal(result.ok, false);
  assert.match(result.error, /Unable to search/i);
  const failedNames = metrics.records.map((r) => r.name);
  assert.ok(failedNames.includes("ToolFailure_SearchBlog"));
  // ToolCall_ counts attempts, not successes: a thrown fetch must still register
  // the attempt, or ToolFailure_/ToolCall_ is not a failure rate.
  assert.ok(failedNames.includes("ToolCall_SearchBlog"));
});

test("search_blog filters malformed rows defensively", async () => {
  const stream = fakeStream();
  const sanityClient = fakeSanity([
    { title: "Good", slug: "good", excerpt: "" },
    { title: "Missing slug" },
    null,
    { slug: "no-title" },
    { title: "Valid Two", slug: "valid-two", excerpt: "Text here", publishedAt: "2026-04-10T00:00:00Z" },
  ]);
  const searchTool = buildSearchBlogTool({
    sanityClient,
    responseStream: stream,
    metrics: fakeMetrics(),
  });

  const result = await searchTool.invoke({ query: "alti", limit: 5 });
  assert.equal(result.ok, true);
  assert.equal(result.results.length, 2);
  assert.deepEqual(
    result.results.map((r) => r.slug),
    ["good", "valid-two"],
  );
});

test("search_blog trims and collapses whitespace before querying", async () => {
  const stream = fakeStream();
  const sanityClient = fakeSanity([]);
  const searchTool = buildSearchBlogTool({
    sanityClient,
    responseStream: stream,
    metrics: fakeMetrics(),
  });

  await searchTool.invoke({ query: "  strands    agents  ", limit: 3 });

  assert.equal(sanityClient.calls[0].p.q, "strands agents");
});

test("search_blog applies default limit when omitted", async () => {
  const sanityClient = fakeSanity([]);
  const searchTool = buildSearchBlogTool({
    sanityClient,
    responseStream: fakeStream(),
    metrics: fakeMetrics(),
  });

  await searchTool.invoke({ query: "strands" });

  assert.equal(sanityClient.calls[0].p.limit, 3);
});
