import crypto from "node:crypto";
import { createClient as createSanityClient } from "@sanity/client";
import { BedrockAgentRuntimeClient, RetrieveCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { checkRateLimit } from "lambda-shared/rateLimit";
import { createLogger } from "lambda-shared/logger";
import { verifySessionToken } from "lambda-shared/sessionToken";
import { MetricsCollector } from "lambda-shared/metrics";
import { setRequestContext, captureError, addBreadcrumb, flushSentry } from "lambda-shared/errorTracking";
import { captureProductEvent, flushProductAnalytics } from "lambda-shared/productAnalytics";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { buildMcpServer } from "./server.mjs";
import { buildSearchBlogMcpTool } from "./tools/searchBlog.mjs";
import { buildGetBlogPostMcpTool } from "./tools/getBlogPost.mjs";
import { buildAskAltiMcpTool } from "./tools/askAlti.mjs";
import { createKbCache } from "./kbCache.mjs";

const REGION = process.env.AWS_REGION || "us-east-1";
const RATE_LIMIT_TABLE = process.env.CHAT_RATE_LIMIT_TABLE || "thechrisgrey-chat-ratelimit";
const RATE_LIMIT_MAX = Number(process.env.MCP_RATE_LIMIT_MAX || 60);
const RATE_LIMIT_WINDOW_SECONDS = Number(process.env.MCP_RATE_LIMIT_WINDOW || 3600);
const MODEL_ID = process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const KB_ID = process.env.KB_ID || "";
const GUARDRAIL_ID = process.env.GUARDRAIL_ID || "";
const GUARDRAIL_VERSION = process.env.GUARDRAIL_VERSION || "";
const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || "";
const SANITY_DATASET = process.env.SANITY_DATASET || "production";
const SESSION_TOKEN_KEY = process.env.SESSION_TOKEN_KEY || "";
const SESSION_TOKEN_SCOPE = process.env.MCP_SESSION_TOKEN_SCOPE || "chat";

// CORS is tightened to the production site origin. The wildcard was acceptable
// while the endpoint was unauthenticated; once a session token is required, a
// credentialed response must echo a concrete origin or the browser refuses it.
// Allow an explicit allowlist via MCP_ALLOWED_ORIGINS (comma-separated) for
// additional first-party origins; the production origin is always permitted.
const PRODUCTION_ORIGIN = "https://thechrisgrey.com";
const CORS_ORIGIN = process.env.MCP_CORS_ORIGIN || process.env.CORS_ORIGIN || PRODUCTION_ORIGIN;
const ALLOWED_ORIGINS = new Set([
  CORS_ORIGIN,
  PRODUCTION_ORIGIN,
  ...(process.env.MCP_ALLOWED_ORIGINS
    ? process.env.MCP_ALLOWED_ORIGINS.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : []),
]);

// Long-lived clients (reused across invocations within a warm Lambda container).
const ddbBase = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbBase);
const bedrockClient = new BedrockRuntimeClient({ region: REGION });
const agentClient = new BedrockAgentRuntimeClient({ region: REGION });
const cloudwatchClient = new CloudWatchClient({ region: REGION });
const sanityClient = SANITY_PROJECT_ID
  ? createSanityClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: "2024-10-01",
      useCdn: true,
      timeout: 10000,
    })
  : null;
const kbCache = createKbCache();

// CloudWatch metrics via the shared MetricsCollector (same pattern as
// chat-stream and blueprint). The namespace is dedicated so MCP alarms
// are isolated from other services.
const METRICS_NAMESPACE = "TheChrisGrey/McpServer";

/** @param {string} ip */
function hashIp(ip) {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

/** @param {any} raw */
function parseBody(raw) {
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return undefined; // explicit: malformed body
  }
}

/** @param {string} [requestOrigin] */
function corsHeaders(requestOrigin) {
  // Echo the request Origin only when it is in the allowlist; otherwise fall
  // back to the configured production origin. This keeps the response
  // credentialed-safe (no `*` with credentials) and tightens the CORS surface
  // to first-party origins.
  const allowOrigin = requestOrigin && ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : CORS_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Mcp-Protocol-Version, X-Request-Id, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

/** @param {number} status @param {any} payload @param {string} [requestOrigin] */
function jsonRpcResponse(status, payload, requestOrigin) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(requestOrigin),
    },
    body: JSON.stringify(payload),
  };
}

/**
 * Validate the parsed JSON-RPC body. Returns a 400 JSON-RPC rejection response
 * for a malformed/non-object body, or `null` when the body is a valid object.
 * @param {any} body - Result of parseBody (undefined = parse error, null = empty, object = ok).
 * @param {string} requestOrigin
 * @returns {{ statusCode: number, headers: any, body: string } | null}
 */
function validateRpcBody(body, requestOrigin) {
  if (body === undefined) {
    return jsonRpcResponse(
      400,
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      requestOrigin,
    );
  }
  if (body === null || typeof body !== "object") {
    return jsonRpcResponse(
      400,
      { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } },
      requestOrigin,
    );
  }
  return null;
}

/**
 * Enforce the session-token auth lockdown on `tools/call` requests. Returns a
 * JSON-RPC rejection response (401/403) when the bearer token is missing or
 * invalid, or `null` when the request is authenticated and should proceed to
 * tool dispatch. Discovery methods (`initialize`, `tools/list`, `ping`) are
 * not gated here — only methods that invoke Bedrock / KB / Sanity.
 *
 * @param {any} body - Parsed JSON-RPC request body.
 * @param {Record<string, string>} headers - Request headers (case-insensitive lookup done upstream).
 * @param {string} requestOrigin - Origin to echo back on the CORS response.
 * @param {{ record: (name: string, value?: number, unit?: string) => void }} metrics
 * @returns {{ statusCode: number, headers: any, body: string } | null}
 */
function enforceToolsCallAuth(body, headers, requestOrigin, metrics) {
  if (body.method !== "tools/call") return null;

  const authHeader = headers?.authorization || headers?.Authorization || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!bearer) {
    metrics.record("McpAuthRejection");
    addBreadcrumb("auth", "missing_token", { method: body.method });
    return jsonRpcResponse(
      401,
      {
        jsonrpc: "2.0",
        id: body.id ?? null,
        error: {
          code: -32001,
          message: "Unauthorized: a valid Authorization: Bearer <token> is required for tools/call.",
        },
      },
      requestOrigin,
    );
  }

  const tokenResult = verifySessionToken(bearer, SESSION_TOKEN_KEY, { scope: SESSION_TOKEN_SCOPE });
  if (!tokenResult.valid) {
    metrics.record("McpAuthRejection");
    addBreadcrumb("auth", "invalid_token", { method: body.method, reason: tokenResult.error });
    return jsonRpcResponse(
      403,
      {
        jsonrpc: "2.0",
        id: body.id ?? null,
        error: {
          code: -32001,
          message: "Forbidden: the supplied session token was rejected.",
          data: { reason: tokenResult.error },
        },
      },
      requestOrigin,
    );
  }
  addBreadcrumb("auth", "request_authenticated", { method: body.method });
  metrics.record("McpAuthSessionToken");
  return null;
}

/**
 * Apply the per-source-IP rate limit. Returns a 429 JSON-RPC response when the
 * caller has exceeded the limit, or `null` when the request is allowed (or the
 * limiter itself fails — it fails open per the shared implementation).
 * @param {string} sourceIp
 * @param {string} requestOrigin
 * @param {any} log
 * @param {{ record: (name: string, value?: number, unit?: string) => void, flush: () => Promise<void> }} metrics
 * @param {string} requestId
 * @returns {Promise<{ statusCode: number, headers: any, body: string } | null>}
 */
async function applyRateLimit(sourceIp, requestOrigin, log, metrics, requestId) {
  try {
    const rlResult = await checkRateLimit(docClient, UpdateCommand, {
      table: RATE_LIMIT_TABLE,
      ip: hashIp(sourceIp),
      prefix: "mcp-",
      maxRequests: RATE_LIMIT_MAX,
      windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
      ttlBuffer: 3600,
      requestId,
    });
    if (rlResult && !rlResult.allowed) {
      metrics.record("McpRateLimitRejection");
      await metrics.flush();
      return jsonRpcResponse(
        429,
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: "Rate limit exceeded. Try again in an hour.",
            data: { retryAfterSeconds: RATE_LIMIT_WINDOW_SECONDS },
          },
        },
        requestOrigin,
      );
    }
  } catch (err) {
    // Rate limiter fails open per shared implementation; log and proceed.
    log.error("mcp_ratelimit_error", { message: err instanceof Error ? err.message : String(err) });
  }
  return null;
}

/** @param {any} event */
export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || "POST";
  const path = event?.rawPath || "/";
  const requestId = event.headers?.["x-request-id"] || event?.requestContext?.requestId || crypto.randomUUID();
  const log = createLogger(requestId, { service: "mcp-server" });
  const metrics = new MetricsCollector(cloudwatchClient, METRICS_NAMESPACE);
  setRequestContext(requestId, "mcp-server", { method, path });
  // Capture the request Origin once so every response (including rejections)
  // echoes an allowlisted origin instead of a wildcard.
  const requestOrigin = event.headers?.origin || event.headers?.Origin || "";

  // CORS preflight
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(requestOrigin), body: "" };
  }

  // Health probe (handy for monitoring and Route 53 health checks).
  if (method === "GET" && path === "/health") {
    return jsonRpcResponse(200, { ok: true, server: "alti-mcp", version: "1.0.0" }, requestOrigin);
  }

  if (method !== "POST") {
    return jsonRpcResponse(
      405,
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "Only POST is accepted on this endpoint." },
      },
      requestOrigin,
    );
  }

  // Rate limit per source IP
  const sourceIp = event?.requestContext?.http?.sourceIp || "unknown";
  const rateLimitRejection = await applyRateLimit(sourceIp, requestOrigin, log, metrics, requestId);
  if (rateLimitRejection) return rateLimitRejection;

  addBreadcrumb("ratelimit", "rate_limit_checked");

  const body = parseBody(event.body);
  const bodyRejection = validateRpcBody(body, requestOrigin);
  if (bodyRejection) return bodyRejection;

  // ── Auth lockdown ──────────────────────────────────────────────────────
  // `tools/call` invokes Bedrock / Sanity / KB retrieval — server-side cost
  // and PII-adjacent retrieval — so it requires a valid server-issued session
  // token (same model as chat-stream). Discovery methods (`initialize`,
  // `tools/list`, `ping`) remain open so MCP clients can negotiate the
  // protocol and list available tools before presenting credentials. With
  // SESSION_TOKEN_KEY unset the verifier fails closed in production and open
  // in local/dev (see sessionToken.mjs), preserving the dev-loop.
  const authRejection = enforceToolsCallAuth(body, event.headers, requestOrigin, metrics);
  if (authRejection) {
    await metrics.flush();
    return authRejection;
  }

  try {
    const tools = [];
    if (sanityClient) {
      tools.push(buildSearchBlogMcpTool({ sanityClient, metrics, requestId }));
      tools.push(buildGetBlogPostMcpTool({ sanityClient, metrics, requestId }));
    }
    tools.push(
      buildAskAltiMcpTool({
        bedrockClient,
        ConverseCommand,
        agentClient,
        RetrieveCommand,
        kbId: KB_ID,
        modelId: MODEL_ID,
        guardrailId: GUARDRAIL_ID,
        guardrailVersion: GUARDRAIL_VERSION,
        kbCache,
        metrics,
        requestId,
      }),
    );

    const server = buildMcpServer({
      tools,
      serverInfo: { name: "alti-mcp", version: "1.0.0" },
    });

    const rpcResponse = await server.handle(body, { requestId, sourceIp });

    // Notifications (null response) should return 202 Accepted per MCP guidance.
    if (rpcResponse === null) {
      await metrics.flush();
      return { statusCode: 202, headers: corsHeaders(requestOrigin), body: "" };
    }

    metrics.record("McpRequestComplete");
    captureProductEvent("McpToolCalled", { method: body.method, hasResult: !("error" in rpcResponse) });
    addBreadcrumb("rpc", "request_complete", { id: body.id });
    await metrics.flush();
    return jsonRpcResponse(200, rpcResponse, requestOrigin);
  } catch (error) {
    log.error("mcp_handler_error", {
      error: error instanceof Error ? error.name : String(error),
      message: error instanceof Error ? error.message : "",
    });
    metrics.record("McpHandlerError");
    captureError(error, { handler: "mcp-server", method: body?.method });
    await metrics.flush();
    return jsonRpcResponse(
      500,
      {
        jsonrpc: "2.0",
        id: body?.id ?? null,
        error: { code: -32603, message: "Internal error" },
      },
      requestOrigin,
    );
  } finally {
    await flushSentry();
    await flushProductAnalytics();
  }
};
