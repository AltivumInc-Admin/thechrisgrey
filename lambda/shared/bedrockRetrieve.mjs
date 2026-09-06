import { createLogger } from "./logger.mjs";

/**
 * Transport half of every Bedrock Knowledge Base retrieval in the fleet.
 *
 * Three call sites used to carry their own copy of this block, and the copies
 * had already drifted: chat-stream's bio KB recorded its Failure metric for
 * timeouts as well as errors, the podcast KB recorded only a Timeout, and
 * mcp-server's ask_alti recorded McpKbTimeout INSTEAD of McpKbFailure — so an
 * alarm scoped to <prefix>Failure could never see the hang mode, which is the
 * most likely outage shape. Two of them also cleared the abort timer inside the
 * try, leaving a timer armed for the rest of timeoutMs after a rejected send to
 * fire abort() against a settled request. Owning the abort, the latency metric
 * and the failure-metric convention here keeps every knowledge base reporting to
 * the same CloudWatch semantics. Result SHAPING stays with each caller.
 *
 * @param {{ send: any }} agentClient - BedrockAgentRuntimeClient instance (injected).
 * @param {any} RetrieveCommand - RetrieveCommand constructor (injected).
 * @param {string} query - User query.
 * @param {object} opts
 * @param {string} opts.knowledgeBaseId
 * @param {string} opts.requestId
 * @param {{ record: any } | undefined} opts.metrics - MetricsCollector instance.
 * @param {string} opts.metricPrefix - CloudWatch metric prefix, e.g. "KBRetrieval".
 * @param {string} opts.logPrefix - Log event prefix, e.g. "kb_retrieval".
 * @param {number} opts.timeoutMs
 * @param {number} opts.numberOfResults
 * @param {string} [opts.logService="chat-stream"] - `service` field on the log line.
 * @returns {Promise<{ results: any[] | null, latencyMs: number }>}
 *          `results` is the raw retrievalResults array ([] when the KB matched
 *          nothing) or null when the call failed or timed out. Never throws.
 */
export async function runRetrieve(agentClient, RetrieveCommand, query, opts) {
  const {
    knowledgeBaseId,
    requestId,
    metrics,
    metricPrefix,
    logPrefix,
    timeoutMs,
    numberOfResults,
    logService = "chat-stream",
  } = opts;
  const log = createLogger(requestId, { service: logService });

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
  const start = Date.now();

  try {
    const command = new RetrieveCommand({
      knowledgeBaseId,
      retrievalQuery: { text: query },
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults,
        },
      },
    });

    const response = await agentClient.send(command, {
      abortSignal: abortController.signal,
    });

    const latencyMs = Date.now() - start;
    metrics?.record(`${metricPrefix}Latency`, latencyMs, "Milliseconds");
    return {
      results: Array.isArray(response?.retrievalResults) ? response.retrievalResults : [],
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const errName = error instanceof Error ? error.name : String(error);
    metrics?.record(`${metricPrefix}Latency`, latencyMs, "Milliseconds");

    if (errName === "AbortError") {
      log.error(`${logPrefix}_timeout`, { latencyMs });
      metrics?.record(`${metricPrefix}Timeout`);
    } else {
      log.error(`${logPrefix}_error`, {
        error: errName,
        message: error instanceof Error ? error.message : "",
        latencyMs,
      });
    }
    // Failure is recorded on BOTH branches. A Bedrock slowdown is the most likely
    // outage shape, and an alarm scoped to <prefix>Failure has to see it.
    metrics?.record(`${metricPrefix}Failure`);
    return { results: null, latencyMs };
  } finally {
    // finally, not the try body: a rejected send() otherwise leaves this timer
    // armed for the rest of timeoutMs and aborts an already-settled request.
    clearTimeout(timeoutId);
  }
}
