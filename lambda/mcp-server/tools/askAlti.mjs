import { buildAskAltiSystemPrompt } from "../prompts.mjs";
import { createLogger } from "lambda-shared/logger";
import { runRetrieve } from "lambda-shared/bedrockRetrieve";

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    question: {
      type: "string",
      minLength: 3,
      maxLength: 1000,
      description:
        "A question for Alti about Christian Perez, his work at Altivum, The Vector Podcast, " +
        "his book Beyond the Assessment, or his military / AI / cloud engineering background.",
    },
  },
  required: ["question"],
  additionalProperties: false,
};

const MAX_OUTPUT_TOKENS = 400;
const TEMPERATURE = 0.5;
const BEDROCK_TIMEOUT_MS = 12000;
const KB_RETRIEVAL_TIMEOUT_MS = 4000;

/** @param {string} question */
function cacheKey(question) {
  // Normalize for cache hits across minor whitespace / case differences.
  return question.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Cache lookup around the shared Bedrock Retrieve transport
 * (lambda-shared/bedrockRetrieve). This used to be a third hand-written copy of
 * that routine and had drifted from the other two in the way that matters most:
 * it recorded McpKbTimeout INSTEAD of McpKbFailure, so an alarm on McpKbFailure
 * could never see a Bedrock hang — the most likely outage shape. runRetrieve
 * counts a timeout as a Failure as well as a Timeout, and owns the abort timer.
 * Only the cache and the chunk join stay here.
 *
 * @param {{ agentClient: any, RetrieveCommand: any, kbId: string, question: string, requestId: string, kbCache: any, metrics: any }} deps
 */
async function retrieveKbContext({ agentClient, RetrieveCommand, kbId, question, requestId, kbCache, metrics }) {
  if (!agentClient || !RetrieveCommand || !kbId) return null;

  const key = cacheKey(question);
  const cached = kbCache?.get(key);
  if (cached !== undefined && cached !== null) {
    metrics?.record("McpKbCacheHit");
    return cached;
  }

  const { results } = await runRetrieve(agentClient, RetrieveCommand, question, {
    knowledgeBaseId: kbId,
    requestId,
    metrics,
    metricPrefix: "McpKb",
    logPrefix: "mcp_kb",
    logService: "mcp-server",
    timeoutMs: KB_RETRIEVAL_TIMEOUT_MS,
    numberOfResults: 5,
  });
  if (results === null) return null;

  const chunks = results
    .map((/** @type {any} */ r) => r?.content?.text)
    .filter((/** @type {any} */ t) => typeof t === "string" && t.length > 0);
  const joined = chunks.length > 0 ? chunks.join("\n\n---\n\n") : null;

  metrics?.record("McpKbSuccess");
  if (joined !== null) kbCache?.set(key, joined);
  return joined;
}

/**
 * @param {{ bedrockClient: any, ConverseCommand: any, modelId: string, guardrailId: string, guardrailVersion: string, systemPrompt: string, question: string, requestId: string, metrics: any }} deps
 */
async function invokeBedrock({
  bedrockClient,
  ConverseCommand,
  modelId,
  guardrailId,
  guardrailVersion,
  systemPrompt,
  question,
  requestId,
  metrics,
}) {
  const log = createLogger(requestId, { service: "mcp-server" });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BEDROCK_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const cmd = new ConverseCommand({
      modelId,
      system: [{ text: systemPrompt }],
      // Wrap the visitor's question in guardContent so the guardrail evaluates
      // ONLY the user input (concentrating prompt-attack detection), not the
      // system prompt or retrieved KB context.
      messages: [{ role: "user", content: [{ guardContent: { text: { text: question } } }] }],
      inferenceConfig: { maxTokens: MAX_OUTPUT_TOKENS, temperature: TEMPERATURE },
      ...(guardrailId && guardrailVersion
        ? { guardrailConfig: { guardrailIdentifier: guardrailId, guardrailVersion } }
        : {}),
    });
    const resp = await bedrockClient.send(cmd, { abortSignal: controller.signal });
    const blocks = resp?.output?.message?.content ?? [];
    const text = blocks
      .filter((/** @type {any} */ c) => typeof c.text === "string")
      .map((/** @type {any} */ c) => c.text)
      .join("");

    const latencyMs = Date.now() - startedAt;
    metrics?.record("McpBedrockLatency", latencyMs, "Milliseconds");

    if (resp?.stopReason === "guardrail_intervened") {
      metrics?.record("McpGuardrailIntervention");
      return {
        blocked: true,
        text: "I can't answer that question. Ask me something about Christian's work, the podcast, or his writing.",
      };
    }

    metrics?.record("McpBedrockSuccess");
    return { text: text.trim() };
  } catch (err) {
    const errName = err instanceof Error ? err.name : String(err);
    if (errName === "AbortError") {
      metrics?.record("McpBedrockTimeout");
      return {
        error: "That question took longer than expected. Try a simpler phrasing.",
      };
    }
    metrics?.record("McpBedrockFailure");
    log.error("mcp_bedrock_error", {
      error: errName,
      message: err instanceof Error ? err.message : "",
    });
    return { error: "Alti is unavailable right now. Try again shortly." };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * @param {{ bedrockClient: any, ConverseCommand: any, agentClient: any, RetrieveCommand: any, kbId: string, modelId: string, guardrailId: string, guardrailVersion: string, kbCache: any, metrics: any, requestId: string }} deps
 */
export function buildAskAltiMcpTool({
  bedrockClient,
  ConverseCommand,
  agentClient,
  RetrieveCommand,
  kbId,
  modelId,
  guardrailId,
  guardrailVersion,
  kbCache,
  metrics,
  requestId,
}) {
  return {
    name: "ask_alti",
    description:
      "Ask Alti, Christian Perez's AI agent, a single question about Christian — his work at Altivum, " +
      "The Vector Podcast, his book 'Beyond the Assessment', his military service as a Green Beret, " +
      "or his AWS / Applied AI engineering practice. Returns a concise 2-4 sentence reply grounded in " +
      "Christian's published writing and autobiography. Does NOT answer general knowledge questions.",
    inputSchema: INPUT_SCHEMA,
    handler: async (/** @type {{ arguments: any }} */ { arguments: args }) => {
      const question = typeof args?.question === "string" ? args.question.trim() : "";
      if (question.length < 3 || question.length > 1000) {
        return {
          isError: true,
          content: [{ type: "text", text: "Question must be 3-1000 characters." }],
        };
      }
      if (!bedrockClient || !ConverseCommand || !modelId) {
        return {
          isError: true,
          content: [{ type: "text", text: "Alti is not configured on this endpoint." }],
        };
      }

      const retrievedContext = await retrieveKbContext({
        agentClient,
        RetrieveCommand,
        kbId,
        question,
        requestId,
        kbCache,
        metrics,
      });
      const systemPrompt = buildAskAltiSystemPrompt(retrievedContext);

      const outcome = await invokeBedrock({
        bedrockClient,
        ConverseCommand,
        modelId,
        guardrailId,
        guardrailVersion,
        systemPrompt,
        question,
        requestId,
        metrics,
      });

      if (outcome.error) {
        return {
          isError: true,
          content: [{ type: "text", text: outcome.error }],
        };
      }
      return {
        content: [{ type: "text", text: outcome.text || "I don't have anything useful to add on that." }],
      };
    },
  };
}
