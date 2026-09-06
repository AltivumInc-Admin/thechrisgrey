import { createLogger } from "lambda-shared/logger";
import { runRetrieve } from "lambda-shared/bedrockRetrieve";

/**
 * videoId is the one KB-derived value that reaches a navigation sink: the
 * search_podcast tool interpolates it into a YouTube watch URL that
 * ToolDraftCard hands to window.open. An "&", "#" or space in that metadata
 * would silently rewrite the query string and break the timestamp deep link, so
 * a chunk whose id is not id-shaped is dropped rather than turned into a card.
 */
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;

/**
 * @typedef {{ text: string, score: number|null, videoId: string, startSeconds: number, episodeTitle: string|null }} PodcastChunk
 */

/**
 * Retrieve relevant passages from the dedicated Vector Podcast Knowledge Base,
 * preserving the per-chunk metadata (videoId, startSeconds, episodeTitle) that
 * powers timestamp-deep-linked citations.
 *
 * Unlike kbRetrieve.retrieveContext (which joins chunk text into a single string
 * for the bio KB), this returns structured results so the search_podcast tool can
 * build "Play at MM:SS" citation cards.
 *
 * The empty array and null are NOT interchangeable: [] means the archive was
 * searched and genuinely matched nothing, null means the archive could not be
 * searched. Collapsing them makes the model tell a visitor that no episode covers
 * a topic while the KB is down — an authoritative claim about content, produced
 * by a broken dependency.
 *
 * @param {{ send: any }} agentClient - BedrockAgentRuntimeClient instance (injected).
 * @param {any} RetrieveCommand - RetrieveCommand constructor (injected).
 * @param {string} query - User query.
 * @param {object} opts
 * @param {string} opts.knowledgeBaseId - The podcast KB id (PODCAST_KB_ID).
 * @param {string} opts.requestId
 * @param {{ record: any }} [opts.metrics] - MetricsCollector instance.
 * @param {number} [opts.timeoutMs=4000]
 * @param {number} [opts.numberOfResults=4]
 * @returns {Promise<PodcastChunk[]|null>} Structured chunks, [] on a genuine
 *          no-match, or null when the KB is unreachable/misconfigured. Never throws.
 */
export async function retrievePodcastChunks(agentClient, RetrieveCommand, query, opts) {
  const { knowledgeBaseId, requestId, metrics, timeoutMs = 4000, numberOfResults = 4 } = opts;
  const log = createLogger(requestId, { service: "chat-stream" });

  if (!knowledgeBaseId) {
    // Unreachable while tools/index.mjs only registers search_podcast for a
    // truthy podcastKbId, but a missing env var is a broken dependency, not an
    // empty archive — null keeps the caller from claiming there are no episodes.
    log.error("podcast_kb_not_configured", {});
    return null;
  }

  const { results, latencyMs } = await runRetrieve(agentClient, RetrieveCommand, query, {
    knowledgeBaseId,
    requestId,
    metrics,
    metricPrefix: "PodcastKBRetrieval",
    logPrefix: "podcast_kb_retrieval",
    timeoutMs,
    numberOfResults,
  });

  // Failure/timeout already logged and counted by runRetrieve.
  if (results === null) return null;

  if (results.length === 0) {
    log.info("podcast_kb_retrieval_empty", { latencyMs });
    return [];
  }

  const chunks = results
    .map((/** @type {any} */ result) => {
      const meta = result.metadata || {};
      const startSecondsRaw = Number(meta.startSeconds);
      const videoId = typeof meta.videoId === "string" && YOUTUBE_ID_PATTERN.test(meta.videoId) ? meta.videoId : null;
      return {
        text: result.content?.text || "",
        score: typeof result.score === "number" ? result.score : null,
        videoId,
        startSeconds: Number.isFinite(startSecondsRaw) ? Math.max(0, Math.floor(startSecondsRaw)) : null,
        episodeTitle: typeof meta.episodeTitle === "string" ? meta.episodeTitle : null,
      };
    })
    .filter((/** @type {any} */ c) => c.text && c.videoId && c.startSeconds !== null);

  if (chunks.length === 0) {
    // Bedrock returned passages but the metadata contract no longer parses (a
    // re-ingest that drops videoId/startSeconds does exactly this). Recording
    // Success would make an ingestion regression look like a healthy KB, and
    // returning [] would make it look like an archive with no episodes.
    metrics?.record("PodcastKBRetrievalUnparseable");
    log.error("podcast_kb_retrieval_unparseable", { results: results.length, latencyMs });
    return null;
  }

  metrics?.record("PodcastKBRetrievalSuccess");
  log.info("podcast_kb_retrieval_success", { chunks: chunks.length, latencyMs });
  return /** @type {PodcastChunk[]} */ (chunks);
}
