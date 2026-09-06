import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSearchPodcastTool, formatTimestamp } from "../../tools/searchPodcast.mjs";
import { EVENT_DELIM } from "../../events.mjs";

// Real-shaped YouTube ids (11 chars). podcastRetrieve drops anything that is not
// id-shaped, so "vid1"-style placeholders would silently empty every fixture.
const EP_A = "ndX9SkIY7Mc";
const EP_B = "aB3dEfGh1Jk";
const EP_C = "Zx9YwVu7Ts2";
const EP_D = "Qq1Ww2Ee3Rr";

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

class FakeRetrieveCommand {
  constructor(input) {
    this.input = input;
  }
}

function fakeAgentClient(retrievalResults) {
  const calls = [];
  const options = [];
  return {
    calls,
    options,
    send: async (command, opts) => {
      calls.push(command);
      options.push(opts);
      return { retrievalResults };
    },
  };
}

function throwingAgentClient(error) {
  return {
    send: async () => {
      throw error;
    },
  };
}

function result(text, videoId, startSeconds, episodeTitle, score = 0.5) {
  return {
    content: { text },
    score,
    metadata: { videoId, startSeconds, episodeTitle },
  };
}

function parseEvents(stream) {
  return stream.chunks.map((chunk) => JSON.parse(chunk.slice(EVENT_DELIM.length, chunk.length - EVENT_DELIM.length)));
}

function buildTool(agentClient, stream, metrics, requestId = "req-1") {
  return buildSearchPodcastTool({
    agentClient,
    RetrieveCommand: FakeRetrieveCommand,
    podcastKbId: "PODKB123",
    responseStream: stream,
    metrics,
    requestId,
  });
}

test("formatTimestamp renders MM:SS and H:MM:SS", () => {
  assert.equal(formatTimestamp(0), "0:00");
  assert.equal(formatTimestamp(65), "1:05");
  assert.equal(formatTimestamp(725), "12:05");
  assert.equal(formatTimestamp(3725), "1:02:05");
});

test("search_podcast emits podcast_citation events with timestamp deep-links", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const agentClient = fakeAgentClient([
    result("Women veterans are too often invisible after service.", EP_A, 725, "Brittinie Wick on Women Veterans"),
    result("AI in defense changes the human domain.", EP_B, 60, "Daniel Gaina on AI"),
  ]);
  const tool = buildTool(agentClient, stream, metrics);

  const res = await tool.invoke({ query: "women veterans" });

  assert.equal(res.ok, true);
  assert.equal(res.query, "women veterans");
  assert.equal(res.results.length, 2);

  const events = parseEvents(stream);
  assert.equal(events.length, 2);
  assert.equal(events[0].kind, "draft_action");
  assert.equal(events[0].action, "podcast_citation");
  assert.equal(events[0].videoId, EP_A);
  assert.equal(events[0].startSeconds, 725);
  assert.equal(events[0].timestampLabel, "12:05");
  assert.equal(events[0].url, `https://www.youtube.com/watch?v=${EP_A}&t=725s`);
  assert.equal(events[0].episodeTitle, "Brittinie Wick on Women Veterans");
  assert.ok(events[0].quote.length > 0);

  const names = metrics.records.map((r) => r.name);
  assert.ok(names.includes("ToolCall_SearchPodcast"));
  assert.ok(names.includes("ToolLatency_SearchPodcast"));
});

test("search_podcast retrieves wider than it cites, so same-episode clusters cannot crowd out other episodes", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const agentClient = fakeAgentClient([result("Passage.", EP_A, 10, "Ep A")]);
  const tool = buildTool(agentClient, stream, metrics);

  await tool.invoke({ query: "women veterans" });

  const sent = agentClient.calls[0].input;
  // At 4 results feeding 3 citations there is effectively no headroom: the live
  // KB regularly returns the top three hits from one episode. Two per citation
  // slot is the margin that lets a second and third episode surface at all.
  assert.ok(
    sent.retrievalConfiguration.vectorSearchConfiguration.numberOfResults >= 8,
    `expected at least 8 retrieved results, got ${sent.retrievalConfiguration.vectorSearchConfiguration.numberOfResults}`,
  );
});

test("search_podcast returns empty results without events when KB has no matches", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const tool = buildTool(fakeAgentClient([]), stream, metrics);

  const res = await tool.invoke({ query: "obscure topic" });

  // A genuine no-match stays ok: the archive was searched and holds nothing.
  assert.equal(res.ok, true);
  assert.equal(res.results.length, 0);
  assert.equal(stream.chunks.length, 0, "no events emitted for zero results");
  const names = metrics.records.map((r) => r.name);
  assert.ok(names.includes("ToolCall_SearchPodcast"));
  assert.ok(names.includes("ToolEmpty_SearchPodcast"));
  assert.ok(!names.includes("ToolFailure_SearchPodcast"), "an honest miss is not a failure");
});

test("search_podcast rejects stop-word-only queries before calling the KB", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const agentClient = fakeAgentClient([]);
  const tool = buildTool(agentClient, stream, metrics);

  const res = await tool.invoke({ query: "the and or" });

  assert.equal(res.ok, false);
  assert.match(res.error, /meaningful keyword/i);
  assert.equal(agentClient.calls.length, 0, "should not query the KB for a stop-word query");
  assert.ok(metrics.records.map((r) => r.name).includes("ToolRejection_SearchPodcast"));
});

test("search_podcast reports an outage as a failure, not as an empty archive", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const tool = buildTool(throwingAgentClient(new Error("Bedrock down")), stream, metrics);

  const res = await tool.invoke({ query: "veteran transition" });

  // ok:true with zero results would have the model tell the visitor the podcast
  // covers nothing on the topic — a factual claim sourced from a broken dependency.
  assert.equal(res.ok, false);
  assert.match(res.error, /unable to search/i);
  assert.equal(res.results, undefined);
  assert.equal(stream.chunks.length, 0);
  const names = metrics.records.map((r) => r.name);
  assert.ok(names.includes("PodcastKBRetrievalFailure"));
  assert.ok(names.includes("ToolFailure_SearchPodcast"));
  assert.ok(!names.includes("ToolEmpty_SearchPodcast"), "an outage must not be counted as an honest miss");
});

test("search_podcast reports a timeout as a failure too", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const aborted = new Error("aborted");
  aborted.name = "AbortError";
  const tool = buildTool(throwingAgentClient(aborted), stream, metrics);

  const res = await tool.invoke({ query: "veteran transition" });

  assert.equal(res.ok, false);
  const names = metrics.records.map((r) => r.name);
  assert.ok(names.includes("PodcastKBRetrievalTimeout"));
  // A hang is the likeliest outage shape; an alarm scoped to Failure has to see it.
  assert.ok(names.includes("PodcastKBRetrievalFailure"));
});

test("search_podcast spreads citations across episodes instead of one episode's cluster", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  // The shape live retrieval actually returns: several moments from one episode.
  const agentClient = fakeAgentClient([
    result("First moment in A.", EP_A, 10, "Ep A"),
    result("Second moment in A.", EP_A, 120, "Ep A"),
    result("Third moment in A.", EP_A, 300, "Ep A"),
    result("Duplicate of the first moment.", EP_A, 10, "Ep A"),
    result("A moment in B.", EP_B, 50, "Ep B"),
    result("A moment in C.", EP_C, 77, "Ep C"),
    result("A moment in D.", EP_D, 90, "Ep D"),
  ]);
  const tool = buildTool(agentClient, stream, metrics);

  const res = await tool.invoke({ query: "purpose after service" });

  const events = parseEvents(stream);
  assert.equal(events.length, 3, "capped at three citations");
  const episodes = events.map((e) => e.videoId);
  assert.deepEqual(
    episodes,
    [EP_A, EP_B, EP_C],
    "three cards must be three different episodes, not three timestamps in one",
  );
  assert.equal(new Set(episodes).size, 3, "citations must span distinct episodes");
  assert.equal(res.results.length, 3);
});

test("search_podcast falls back to extra moments when only one episode matched", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const agentClient = fakeAgentClient([
    result("First moment.", EP_A, 10, "Ep A"),
    result("Second moment.", EP_A, 120, "Ep A"),
    result("Duplicate first moment.", EP_A, 10, "Ep A"),
    result("Third moment.", EP_A, 300, "Ep A"),
  ]);
  const tool = buildTool(agentClient, stream, metrics);

  await tool.invoke({ query: "single episode topic" });

  const events = parseEvents(stream);
  const keys = events.map((e) => `${e.videoId}-${e.startSeconds}`);
  // Preferring distinct episodes must not starve a topic the archive covers once.
  assert.deepEqual(keys, [`${EP_A}-10`, `${EP_A}-120`, `${EP_A}-300`]);
});

test("search_podcast drops results missing videoId or startSeconds", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const agentClient = fakeAgentClient([
    { content: { text: "No metadata at all." }, score: 0.9 },
    { content: { text: "Missing start." }, score: 0.8, metadata: { videoId: EP_B, episodeTitle: "X" } },
    result("Valid one.", EP_C, 42, "Y"),
  ]);
  const tool = buildTool(agentClient, stream, metrics);

  const res = await tool.invoke({ query: "leadership" });

  const events = parseEvents(stream);
  assert.equal(events.length, 1);
  assert.equal(events[0].videoId, EP_C);
  assert.equal(res.results.length, 1);
});

test("search_podcast drops a videoId that would rewrite the YouTube query string", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const agentClient = fakeAgentClient([
    result("Injected id.", `${EP_A}&list=PLhijack`, 30, "Bad"),
    result("Spaced id.", "not a video id", 40, "Bad"),
    result("Valid one.", EP_C, 42, "Good"),
  ]);
  const tool = buildTool(agentClient, stream, metrics);

  const res = await tool.invoke({ query: "leadership" });

  const events = parseEvents(stream);
  // ToolDraftCard hands this url straight to window.open, so a malformed id must
  // never reach a card.
  assert.equal(events.length, 1);
  assert.equal(events[0].videoId, EP_C);
  assert.equal(events[0].url, `https://www.youtube.com/watch?v=${EP_C}&t=42s`);
  assert.equal(res.results.length, 1);
});

test("search_podcast treats an all-malformed result set as unavailable, not empty", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const agentClient = fakeAgentClient([
    { content: { text: "Passage with renamed metadata." }, score: 0.9, metadata: { video_id: EP_A, start: 10 } },
    { content: { text: "Another one." }, score: 0.8, metadata: { video_id: EP_B, start: 20 } },
  ]);
  const tool = buildTool(agentClient, stream, metrics);

  const res = await tool.invoke({ query: "leadership" });

  // An ingestion regression that drops the metadata keys is a broken dependency,
  // not an archive with no episodes.
  assert.equal(res.ok, false);
  const names = metrics.records.map((r) => r.name);
  assert.ok(names.includes("PodcastKBRetrievalUnparseable"));
  assert.ok(!names.includes("PodcastKBRetrievalSuccess"));
  assert.ok(names.includes("ToolFailure_SearchPodcast"));
});
