import { createLogger } from "lambda-shared/logger";
import { runRetrieve } from "lambda-shared/bedrockRetrieve";

/**
 * prompts.mjs frames retrieved passages between the literal lines
 * "=== RETRIEVED CONTEXT ===" and "=== END CONTEXT ===". A passage carrying
 * either line verbatim would close its own quoted block, and everything after it
 * would reach Claude as system-level directive instead of quoted source. Nothing
 * else on the path inspects KB text: validation.mjs only covers visitor input and
 * the guardrail evaluates the conversation turn, not the retriever's injection.
 * Defanging the fence here keeps KB-authoring privilege from implying
 * prompt-authoring privilege, and leaves the fence itself single-sourced in
 * prompts.mjs.
 */
const CONTEXT_FENCE_LINE = /^[ \t]*={3,}[ \t]*(?:END[ \t]+|RETRIEVED[ \t]+)?CONTEXT[ \t]*={3,}[ \t]*\r?$/gim;

/** @param {string} text @returns {string} */
function defangContextFence(text) {
  return text.replace(CONTEXT_FENCE_LINE, (line) => line.replace(/=/g, "-"));
}

/**
 * Retrieve relevant context from a Bedrock Knowledge Base.
 *
 * @param {{ send: any }} agentClient - BedrockAgentRuntimeClient instance (injected).
 * @param {any} RetrieveCommand - RetrieveCommand constructor (injected).
 * @param {string} query - User query.
 * @param {object} opts
 * @param {string} opts.knowledgeBaseId
 * @param {string} opts.requestId
 * @param {{ record: any }} opts.metrics - MetricsCollector instance.
 * @param {number} [opts.timeoutMs=4000]
 * @param {number} [opts.numberOfResults=5]
 * @returns {Promise<string|null>} Joined context, or null on empty/unparseable/error.
 */
export async function retrieveContext(agentClient, RetrieveCommand, query, opts) {
  const { knowledgeBaseId, requestId, metrics, timeoutMs = 4000, numberOfResults = 5 } = opts;
  const log = createLogger(requestId, { service: "chat-stream" });

  const { results, latencyMs } = await runRetrieve(agentClient, RetrieveCommand, query, {
    knowledgeBaseId,
    requestId,
    metrics,
    metricPrefix: "KBRetrieval",
    logPrefix: "kb_retrieval",
    timeoutMs,
    numberOfResults,
  });

  // Failure/timeout already logged and counted by runRetrieve.
  if (results === null) return null;

  if (results.length === 0) {
    // An emptied vector index answers every query this way. Without a counter of
    // its own that reads as "no traffic" on the health panel rather than 0%,
    // because kbSuccessRate is successes/(successes+failures) and this path is
    // in neither term.
    metrics?.record("KBRetrievalEmpty");
    log.info("kb_retrieval_empty", { latencyMs });
    return null;
  }

  const usable = results.filter(
    (/** @type {any} */ result) => typeof result?.content?.text === "string" && result.content.text.length > 0,
  );

  if (usable.length === 0) {
    // Results came back but none carried content.text: a response-shape change,
    // not an empty KB. Recording Success here would report 100% retrieval health
    // while buildSystemPrompt quietly swapped in the un-grounded prompt.
    metrics?.record("KBRetrievalUnparseable");
    log.error("kb_retrieval_unparseable", { results: results.length, latencyMs });
    return null;
  }

  const scores = usable
    .map((/** @type {any} */ result) => result.score)
    .filter((/** @type {any} */ score) => typeof score === "number");
  const topScore = scores.length > 0 ? Math.max(...scores) : null;

  const contextChunks = usable.map((/** @type {any} */ result) => defangContextFence(result.content.text));

  metrics?.record("KBRetrievalSuccess");
  // topScore makes "retrieval returns weak matches" observable, not just
  // "retrieval returns nothing".
  log.info("kb_retrieval_success", { chunks: contextChunks.length, topScore, latencyMs });
  return contextChunks.join("\n\n---\n\n");
}
