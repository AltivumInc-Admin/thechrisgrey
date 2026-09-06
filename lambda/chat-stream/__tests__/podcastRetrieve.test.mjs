import { test } from "node:test";
import assert from "node:assert/strict";
import { retrievePodcastChunks } from "../podcastRetrieve.mjs";
import { recordingMetrics } from "./harness.mjs";

// Real-shaped YouTube ids; podcastRetrieve drops anything that is not id-shaped.
const EP_A = "ndX9SkIY7Mc";
const EP_B = "aB3dEfGh1Jk";

class FakeRetrieveCommand {
  constructor(input) {
    this.input = input;
  }
}

function client(handler) {
  return { send: handler };
}

const OPTS = {
  knowledgeBaseId: "PODKB-TEST",
  requestId: "req-1",
  timeoutMs: 1000,
  numberOfResults: 4,
};

function chunk(text, videoId, startSeconds, episodeTitle, score = 0.5) {
  return { content: { text }, score, metadata: { videoId, startSeconds, episodeTitle } };
}

test("returns structured chunks with citation metadata on success", async () => {
  const metrics = recordingMetrics();
  const fake = client(async (cmd) => {
    assert.equal(cmd.input.knowledgeBaseId, "PODKB-TEST");
    assert.equal(cmd.input.retrievalQuery.text, "women veterans");
    assert.equal(cmd.input.retrievalConfiguration.vectorSearchConfiguration.numberOfResults, 4);
    return { retrievalResults: [chunk("Passage.", EP_A, 725, "Ep A", 0.71)] };
  });

  const out = await retrievePodcastChunks(fake, FakeRetrieveCommand, "women veterans", { ...OPTS, metrics });

  assert.deepEqual(out, [{ text: "Passage.", score: 0.71, videoId: EP_A, startSeconds: 725, episodeTitle: "Ep A" }]);
  assert.ok(metrics.records.some((r) => r.name === "PodcastKBRetrievalSuccess"));
  assert.ok(metrics.records.some((r) => r.name === "PodcastKBRetrievalLatency"));
});

test("floors and clamps a fractional or negative startSeconds", async () => {
  const metrics = recordingMetrics();
  const fake = client(async () => ({
    retrievalResults: [chunk("A.", EP_A, 12.9, "Ep A"), chunk("B.", EP_B, -5, "Ep B")],
  }));

  const out = await retrievePodcastChunks(fake, FakeRetrieveCommand, "q", { ...OPTS, metrics });

  assert.equal(out[0].startSeconds, 12);
  assert.equal(out[1].startSeconds, 0);
});

test("passes an abort signal to the Bedrock client", async () => {
  const metrics = recordingMetrics();
  let seen = null;
  const fake = client(async (_cmd, options) => {
    seen = options?.abortSignal;
    return { retrievalResults: [chunk("Passage.", EP_A, 10, "Ep A")] };
  });

  await retrievePodcastChunks(fake, FakeRetrieveCommand, "q", { ...OPTS, metrics });

  // Deleting the abort wiring leaves the 4s retrieval bound as the agent's whole
  // 25s budget; nothing else in this suite would notice.
  assert.ok(seen instanceof AbortSignal, "retrieval must be bounded by an abort signal");
});

test("aborts the in-flight request once timeoutMs elapses", async () => {
  const metrics = recordingMetrics();
  const fake = client(
    (_cmd, options) =>
      new Promise((_resolve, reject) => {
        options.abortSignal.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      }),
  );

  const out = await retrievePodcastChunks(fake, FakeRetrieveCommand, "q", { ...OPTS, metrics, timeoutMs: 20 });

  assert.equal(out, null, "a hung retrieval must be bounded, not awaited forever");
  assert.ok(metrics.records.some((r) => r.name === "PodcastKBRetrievalTimeout"));
});

test("clears the abort timer when the retrieval fails", async () => {
  const metrics = recordingMetrics();
  let seen = null;
  const err = new Error("kb down");
  err.name = "InternalServerException";
  const fake = client(async (_cmd, options) => {
    seen = options?.abortSignal;
    throw err;
  });

  await retrievePodcastChunks(fake, FakeRetrieveCommand, "q", { ...OPTS, metrics, timeoutMs: 10 });
  await new Promise((resolve) => setTimeout(resolve, 40));

  // A clearTimeout left inside the try aborts an already-settled request.
  assert.equal(seen.aborted, false, "the abort timer must not fire after the request settled");
});

test("returns the empty array for a genuine no-match", async () => {
  const metrics = recordingMetrics();
  const fake = client(async () => ({ retrievalResults: [] }));

  const out = await retrievePodcastChunks(fake, FakeRetrieveCommand, "q", { ...OPTS, metrics });

  // [] and null are NOT interchangeable: [] means the archive holds nothing on
  // the topic, null means the archive could not be searched.
  assert.deepEqual(out, []);
  assert.ok(!metrics.records.some((r) => r.name === "PodcastKBRetrievalFailure"));
});

test("returns the empty array when retrievalResults is missing entirely", async () => {
  const metrics = recordingMetrics();
  const fake = client(async () => ({}));

  const out = await retrievePodcastChunks(fake, FakeRetrieveCommand, "q", { ...OPTS, metrics });

  assert.deepEqual(out, []);
});

test("records timeout AND failure on AbortError", async () => {
  const metrics = recordingMetrics();
  const err = new Error("aborted");
  err.name = "AbortError";
  const fake = client(async () => {
    throw err;
  });

  const out = await retrievePodcastChunks(fake, FakeRetrieveCommand, "q", { ...OPTS, metrics });

  assert.equal(out, null);
  assert.ok(metrics.records.some((r) => r.name === "PodcastKBRetrievalTimeout"));
  // Timeout-without-Failure made the podcast KB's hang mode invisible to every
  // failure-rate view, unlike the bio KB it was copied from.
  assert.ok(metrics.records.some((r) => r.name === "PodcastKBRetrievalFailure"));
});

test("records failure on non-abort errors", async () => {
  const metrics = recordingMetrics();
  const err = new Error("kb down");
  err.name = "InternalServerException";
  const fake = client(async () => {
    throw err;
  });

  const out = await retrievePodcastChunks(fake, FakeRetrieveCommand, "q", { ...OPTS, metrics });

  assert.equal(out, null, "an outage must be distinguishable from an empty archive");
  assert.ok(metrics.records.some((r) => r.name === "PodcastKBRetrievalFailure"));
  assert.ok(!metrics.records.some((r) => r.name === "PodcastKBRetrievalTimeout"));
});

test("returns null and records Unparseable when the metadata contract changes", async () => {
  const metrics = recordingMetrics();
  const fake = client(async () => ({
    retrievalResults: [
      { content: { text: "Passage." }, score: 0.9, metadata: { video_id: EP_A, start: 10 } },
      { content: { text: "Another." }, score: 0.8, metadata: { video_id: EP_B, start: 20 } },
    ],
  }));

  const out = await retrievePodcastChunks(fake, FakeRetrieveCommand, "q", { ...OPTS, metrics });

  // A re-ingest that renames videoId/startSeconds empties every result. Recording
  // Success there would make an ingestion regression look like a healthy KB.
  assert.equal(out, null);
  assert.ok(metrics.records.some((r) => r.name === "PodcastKBRetrievalUnparseable"));
  assert.ok(!metrics.records.some((r) => r.name === "PodcastKBRetrievalSuccess"));
});

test("drops a chunk whose videoId is not YouTube-id-shaped", async () => {
  const metrics = recordingMetrics();
  const fake = client(async () => ({
    retrievalResults: [
      chunk("Injected.", `${EP_A}&list=PLhijack`, 10, "Bad"),
      chunk("Spaced.", "not a video id", 20, "Bad"),
      chunk("Traversal.", "../../etc/passwd", 30, "Bad"),
      chunk("Valid.", EP_B, 40, "Good"),
    ],
  }));

  const out = await retrievePodcastChunks(fake, FakeRetrieveCommand, "q", { ...OPTS, metrics });

  // searchPodcast interpolates videoId into a URL that ToolDraftCard opens.
  assert.equal(out.length, 1);
  assert.equal(out[0].videoId, EP_B);
});

test("returns null rather than an empty archive when the KB id is not configured", async () => {
  const metrics = recordingMetrics();
  let called = false;
  const fake = client(async () => {
    called = true;
    return { retrievalResults: [] };
  });

  const out = await retrievePodcastChunks(fake, FakeRetrieveCommand, "q", {
    ...OPTS,
    knowledgeBaseId: "",
    metrics,
  });

  // A missing PODCAST_KB_ID is a broken dependency, not an archive with no episodes.
  assert.equal(out, null);
  assert.equal(called, false, "must not call Bedrock without a KB id");
});
