import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import { normalizeQuery, isMeaningful } from "lambda-shared/sanityQueries";
import { emitEvent, EVENT_KINDS } from "../events.mjs";
import { retrievePodcastChunks } from "../podcastRetrieve.mjs";
import { createLogger } from "lambda-shared/logger";
import { recordToolFailure } from "./toolMetrics.mjs";

const _tool = /** @type {any} */ (tool);

const MAX_CITATIONS = 3;

/**
 * Retrieve wider than we cite. Live retrieval commonly returns several moments
 * from the SAME episode (the top three hits for "women veterans" were all one
 * video), so at numberOfResults 4 there is almost no headroom to find a second
 * episode for a question like "which episodes cover X". Eight is still one
 * Retrieve call.
 */
const RETRIEVAL_RESULTS = 8;

/**
 * Format a second-offset as a YouTube-style timestamp label (MM:SS or H:MM:SS).
 */
/** @param {number} totalSeconds @returns {string} */
export function formatTimestamp(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  /** @param {number} n */
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** @param {any} text @param {number} [max] @returns {string} */
function trimQuote(text, max = 240) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Pick up to MAX_CITATIONS chunks, preferring one per EPISODE.
 *
 * De-duping on `videoId-startSeconds` alone only removes the identical moment,
 * so a same-episode cluster (which is what the KB actually returns) would answer
 * "which episodes talk about X" with three cards carrying one episode title and
 * three timestamps. Chunks arrive in relevance order, so the first hit per
 * episode is also its best one. Extra moments from an already-shown episode fill
 * the remaining slots, which is all there is when the archive genuinely covers a
 * topic once.
 *
 * @param {Array<{ videoId: string, startSeconds: number }>} chunks
 * @returns {any[]}
 */
function selectCitations(chunks) {
  const seenMoments = new Set();
  const seenEpisodes = new Set();
  /** @type {any[]} */
  const primary = [];
  /** @type {any[]} */
  const overflow = [];

  for (const c of chunks) {
    const moment = `${c.videoId}-${c.startSeconds}`;
    if (seenMoments.has(moment)) continue;
    seenMoments.add(moment);

    if (seenEpisodes.has(c.videoId)) {
      overflow.push(c);
      continue;
    }
    seenEpisodes.add(c.videoId);
    primary.push(c);
  }

  return [...primary, ...overflow].slice(0, MAX_CITATIONS);
}

/**
 * search_podcast — Strands tool that searches the Vector Podcast KB and emits one
 * `podcast_citation` draft action per top result, each deep-linking to the exact
 * YouTube timestamp. Mirrors the searchBlog tool's structure and metrics.
 */
/**
 * @param {{ agentClient: any, RetrieveCommand: any, podcastKbId: string, responseStream: any, metrics: any, requestId: string }} deps
 */
export function buildSearchPodcastTool({
  agentClient,
  RetrieveCommand,
  podcastKbId,
  responseStream,
  metrics,
  requestId,
}) {
  const log = createLogger(requestId, { service: "chat-stream" });
  return _tool({
    name: "search_podcast",
    description:
      "Search The Vector Podcast for what a guest or Christian actually said about a topic. " +
      "Use when the visitor asks what was discussed or said on the podcast, or which episode covers a topic. " +
      "Returns short quoted passages, each tied to its episode and a timestamp. " +
      "After it runs, summarize the answer in one or two sentences and let the citation cards carry the links. " +
      "Call at most twice per turn.",
    inputSchema: z.object({
      query: z
        .string()
        .min(2, "Query must be at least 2 characters")
        .max(120, "Query too long")
        .describe("Topic, phrase, or question to search the podcast for, e.g. 'women veterans' or 'AI in defense'"),
    }),
    callback: async (/** @type {{ query: string }} */ { query }) => {
      const normalized = normalizeQuery(query);
      if (!isMeaningful(normalized)) {
        metrics?.record("ToolRejection_SearchPodcast");
        return { ok: false, error: "Query must contain a meaningful keyword." };
      }

      // Counted for the ATTEMPT, before the awaited retrieval. Recorded after it,
      // a failed search emitted ToolFailure_SearchPodcast with no matching
      // ToolCall_SearchPodcast, so failures/calls was not a failure rate — it
      // could exceed 1. citePassage and searchBlog count the same way.
      metrics?.record("ToolCall_SearchPodcast");
      const startedAt = Date.now();
      try {
        const chunks = await retrievePodcastChunks(agentClient, RetrieveCommand, normalized, {
          knowledgeBaseId: podcastKbId,
          requestId,
          metrics,
          numberOfResults: RETRIEVAL_RESULTS,
          timeoutMs: 4000,
        });

        metrics?.record("ToolLatency_SearchPodcast", Date.now() - startedAt, "Milliseconds");

        if (chunks === null) {
          // The archive could not be searched. Returning the no-match shape here
          // would have the model tell the visitor the podcast contains nothing on
          // the topic — a factual claim about content, sourced from an outage.
          recordToolFailure(metrics, "SearchPodcast");
          log.error("tool_error", {
            tool: "search_podcast",
            error: "podcast_kb_unavailable",
            message: "retrieval failed, timed out, or returned unparseable metadata",
          });
          return { ok: false, error: "Unable to search the podcast right now." };
        }

        if (chunks.length === 0) {
          // Genuine no-match, distinct from the branch above. Counted so the
          // empty-answer rate is graphable next to ToolCall_SearchPodcast.
          metrics?.record("ToolEmpty_SearchPodcast");
          return { ok: true, query: normalized, results: [] };
        }

        const top = selectCitations(chunks);

        for (const c of top) {
          emitEvent(responseStream, {
            kind: EVENT_KINDS.DRAFT_ACTION,
            action: "podcast_citation",
            videoId: c.videoId,
            startSeconds: c.startSeconds,
            episodeTitle: c.episodeTitle || "The Vector Podcast",
            quote: trimQuote(c.text),
            timestampLabel: formatTimestamp(c.startSeconds),
            url: `https://www.youtube.com/watch?v=${c.videoId}&t=${c.startSeconds}s`,
          });
        }

        return {
          ok: true,
          query: normalized,
          results: top.map((/** @type {any} */ c) => ({
            episodeTitle: c.episodeTitle || "The Vector Podcast",
            timestampLabel: formatTimestamp(c.startSeconds),
            quote: trimQuote(c.text, 320),
          })),
        };
      } catch (error) {
        recordToolFailure(metrics, "SearchPodcast");
        log.error("tool_error", {
          tool: "search_podcast",
          error: error instanceof Error ? error.name : String(error),
          message: error instanceof Error ? error.message : "",
        });
        return { ok: false, error: "Unable to search the podcast right now." };
      }
    },
  });
}
