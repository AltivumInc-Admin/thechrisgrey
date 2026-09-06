/**
 * Lambda function triggered by S3 events (PUT/DELETE) on thechrisgrey-kb-source bucket.
 * Automatically syncs the Bedrock Knowledge Base when content changes.
 * Publishes CloudWatch metrics for observability.
 */

import { BedrockAgentClient, StartIngestionJobCommand, GetIngestionJobCommand } from "@aws-sdk/client-bedrock-agent";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { createLogger } from "lambda-shared/logger";
import { MetricsCollector } from "lambda-shared/metrics";
import { setRequestContext, captureError, addBreadcrumb, flushSentry } from "lambda-shared/errorTracking";
import { captureProductEvent, flushProductAnalytics } from "lambda-shared/productAnalytics";

const KNOWLEDGE_BASE_ID = process.env.KB_ID || "ARFYABW8HP";
// KB_DATA_SOURCE_ID is the namespaced name the rest of the repo uses (CLAUDE.md,
// scripts/transcribe-podcast.mjs). The bare DATA_SOURCE_ID is still honoured so
// a migration shell that already exported the old name keeps pointing this
// handler at the same data source instead of silently falling back to the
// original account's id.
const DATA_SOURCE_ID = process.env.KB_DATA_SOURCE_ID || process.env.DATA_SOURCE_ID || "TXQTRAJOSD";
const NAMESPACE = "TheChrisGrey/SiteMetrics";

// StartIngestionJob is a control-plane call that normally answers in well under
// a second, so 8s is a hang rather than latency. Every Bedrock call below is
// bounded with a real AbortController instead of withTimeout: a Promise.race
// leaves the request in flight (lambda/shared/timeout.mjs says exactly this for
// SDK calls that accept an abortSignal), so a "timeout" could record
// KBSyncFailure for an ingestion that in fact started — and the
// thechrisgrey-kb-sync-failure alarm has a threshold of 0.
const START_TIMEOUT_MS = 8000;
const POLL_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 1500;
// Floor so a nearly-exhausted budget never aborts a call before it can even be
// dispatched; such an invocation is doomed anyway, but it aborts cleanly.
const MIN_ATTEMPT_TIMEOUT_MS = 1000;

// One extra in-handler attempt absorbs a momentary blip. The real recovery for
// "a job is already running" (ConflictException) or the 0.1 rps StartIngestionJob
// rate limit (ThrottlingException) is the re-throw in the handler: an S3
// notification is an ASYNC invoke, so Lambda re-invokes twice more, minutes
// apart, which is the only wait long enough for an in-flight ingestion to finish.
const MAX_START_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 2000;

// Reserved after the last Bedrock call for metrics.flush + Sentry + PostHog. If
// the Lambda hard-timeout cuts those off, the invocation reports nothing at all,
// which is strictly worse than reporting an unknown outcome.
const FLUSH_RESERVE_MS = 5000;
// Budget used when there is no Lambda context (direct invoke, local run, tests).
// Deliberately under the deployed 30s function timeout.
const DEFAULT_BUDGET_MS = 25000;

const TERMINAL_STATUSES = new Set(["COMPLETE", "FAILED", "STOPPED"]);

// Errors that mean the ingestion has not started YET, so a later attempt can
// still succeed. Bedrock allows one ingestion job per data source and rate-limits
// StartIngestionJob to 0.1 rps, which makes ConflictException and
// ThrottlingException the two likeliest failures on this path — swallowing them
// is what leaves the KB serving the previous knowledge-base.txt after a publish.
const RETRYABLE_ERROR_NAMES = new Set([
  "ConflictException",
  "ThrottlingException",
  "TooManyRequestsException",
  "InternalServerException",
  "ServiceUnavailableException",
  // Our own AbortController fired: the request was cancelled client-side, so
  // treat the start as not-landed. A retry that collides with a job the service
  // did accept comes back as ConflictException, which is handled the same way.
  "AbortError",
  "TimeoutError",
]);

const log = createLogger(null, { service: "kb-sync" });

const client = new BedrockAgentClient({ region: "us-east-1" });
const cloudwatch = new CloudWatchClient({ region: "us-east-1" });

/** @param {unknown} error */
const errorName = (error) => (error instanceof Error ? error.name : "Unknown");
/** @param {unknown} error */
const errorMessage = (error) => (error instanceof Error ? error.message : String(error));

/** @param {number} ms */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {unknown} error
 * @returns {boolean} true when the ingestion has not started yet and a later
 *   attempt can still succeed. Terminal errors (ValidationException,
 *   AccessDeniedException, ResourceNotFoundException) return false: re-running
 *   them only burns invocations.
 */
function isRetryable(error) {
  if (RETRYABLE_ERROR_NAMES.has(errorName(error))) return true;
  const status = /** @type {any} */ (error)?.$metadata?.httpStatusCode;
  return status === 429 || (typeof status === "number" && status >= 500);
}

/**
 * Send one Bedrock command under a real AbortController so a hung request is
 * actually cancelled rather than merely stopped being awaited.
 *
 * @param {any} command
 * @param {number} timeoutMs
 * @returns {Promise<any>} the command's output (the SDK types `send` as a union
 *   over every command in the client, which erases the per-command shape).
 */
async function sendAborting(command, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await client.send(command, { abortSignal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Start the ingestion job, retrying once in-handler on a not-yet error while the
 * budget allows. Always throws the last error; the caller decides whether a
 * retryable failure propagates (so Lambda re-invokes) or is swallowed.
 *
 * @param {number} deadlineMs absolute epoch-ms by which all Bedrock work must stop
 * @returns {Promise<any>} the StartIngestionJob response
 */
async function startIngestion(deadlineMs) {
  /** @type {unknown} */
  let lastError;

  for (let attempt = 1; attempt <= MAX_START_ATTEMPTS; attempt += 1) {
    const timeoutMs = Math.max(MIN_ATTEMPT_TIMEOUT_MS, Math.min(START_TIMEOUT_MS, deadlineMs - Date.now()));
    try {
      return await sendAborting(
        new StartIngestionJobCommand({
          knowledgeBaseId: KNOWLEDGE_BASE_ID,
          dataSourceId: DATA_SOURCE_ID,
        }),
        timeoutMs,
      );
    } catch (error) {
      lastError = error;
      if (attempt === MAX_START_ATTEMPTS || !isRetryable(error)) break;

      // Jitter so a burst of S3 notifications retried in the same second does
      // not re-collide on the one-job-per-data-source limit in lockstep.
      const delayMs = Math.round(RETRY_BASE_DELAY_MS * (0.75 + Math.random() * 0.5));
      if (deadlineMs - Date.now() < delayMs + MIN_ATTEMPT_TIMEOUT_MS) break;

      log.warn("kb_sync_retry", { attempt, error: errorName(error), delayMs });
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * @typedef {object} IngestionOutcome
 * @property {"complete"|"failed"|"unknown"} outcome
 * @property {string|null} status
 * @property {any} [statistics]
 * @property {string[]} [failureReasons]
 * @property {string} [reason] why the outcome is unknown
 */

/**
 * Poll the ingestion job to its terminal state.
 *
 * StartIngestionJob only reports that the job was ACCEPTED — its status is
 * always STARTING at that point — so without this the handler cannot tell a
 * healthy sync from one that ends FAILED, or from a COMPLETE job with
 * numberOfDocumentsFailed > 0 (which has happened in production: a document
 * dropped out of the KB with no metric, alarm or log recording it).
 *
 * @param {string} ingestionJobId
 * @param {number} deadlineMs absolute epoch-ms by which all Bedrock work must stop
 * @returns {Promise<IngestionOutcome>}
 */
async function awaitIngestionOutcome(ingestionJobId, deadlineMs) {
  for (;;) {
    if (deadlineMs - Date.now() < POLL_TIMEOUT_MS) {
      return { outcome: "unknown", status: null, reason: "budget_exhausted" };
    }

    /** @type {any} */
    let job;
    try {
      const response = await sendAborting(
        new GetIngestionJobCommand({
          knowledgeBaseId: KNOWLEDGE_BASE_ID,
          dataSourceId: DATA_SOURCE_ID,
          ingestionJobId,
        }),
        POLL_TIMEOUT_MS,
      );
      job = response.ingestionJob;
    } catch (error) {
      // A poll that cannot run says nothing about the job itself. Degrading to
      // "unknown" rather than "failed" is what stops a missing
      // bedrock:GetIngestionJob permission from turning every healthy sync into
      // a KBSyncFailure page.
      return { outcome: "unknown", status: null, reason: errorName(error) };
    }

    const status = job?.status ?? null;
    if (status && TERMINAL_STATUSES.has(status)) {
      const documentsFailed = job?.statistics?.numberOfDocumentsFailed ?? 0;
      return {
        // A COMPLETE job that failed documents did not deliver the publish, so
        // it is a failure even though Bedrock calls it complete.
        outcome: status === "COMPLETE" && documentsFailed === 0 ? "complete" : "failed",
        status,
        statistics: job?.statistics,
        failureReasons: job?.failureReasons,
      };
    }

    if (deadlineMs - Date.now() < POLL_INTERVAL_MS + POLL_TIMEOUT_MS) {
      return { outcome: "unknown", status, reason: "budget_exhausted" };
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

/** @param {MetricsCollector} metrics */
async function flushTelemetry(metrics) {
  await metrics.flush();
  await flushSentry();
  await flushProductAnalytics();
}

/**
 * @param {any} event
 * @param {any} [context] Lambda context; absent on direct/local invokes.
 */
export const handler = async (event, context) => {
  // Health check mode (triggered by EventBridge scheduled rule or manual
  // `aws lambda invoke --payload '{"healthCheck":true}'`). Returns a liveness
  // probe without performing a KB sync or publishing metrics.
  if (event.healthCheck === true) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        service: "kb-sync",
        version: "1.0.0",
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        dataSourceId: DATA_SOURCE_ID,
      }),
    };
  }

  const metrics = new MetricsCollector(cloudwatch, NAMESPACE);
  setRequestContext(null, "kb-sync", { trigger: "s3-event" });

  // One absolute deadline for every Bedrock call in this invocation (start
  // retries AND the outcome poll), anchored once: Date.now() +
  // getRemainingTimeInMillis() is the invariant Lambda deadline, so the
  // AbortControllers always fire before the hard-timeout and the flushes below
  // always get their window. Self-adjusts to whatever --timeout is deployed.
  const deadlineMs = Date.now() + (context?.getRemainingTimeInMillis?.() ?? DEFAULT_BUDGET_MS) - FLUSH_RESERVE_MS;

  // Extract event details for logging
  const records = event.Records || [];
  const eventSummary = records.map((/** @type {any} */ r) => ({
    eventName: r.eventName,
    key: r.s3?.object?.key,
    bucket: r.s3?.bucket?.name,
  }));

  log.info("s3_trigger", { changes: eventSummary });
  addBreadcrumb("s3", "sync_triggered", { records: records.length });

  /** @type {any} */
  let started;
  try {
    started = await startIngestion(deadlineMs);
  } catch (error) {
    const retryable = isRetryable(error);
    log.error("kb_sync_failure", { error: errorName(error), message: errorMessage(error), retryable });

    metrics.record("KBSyncFailure");
    captureError(error, { handler: "kb-sync", retryable });
    captureProductEvent("KBSyncTriggered", { outcome: "failure" });
    await flushTelemetry(metrics);

    // Retryable means the ingestion has not started yet. Returning here would
    // record the async invoke as a success, so the S3 write would be dropped for
    // good: the admin sees a clean publish while the KB keeps serving the
    // previous knowledge-base.txt. Throwing hands the event back to Lambda,
    // which re-invokes twice more, minutes apart — long enough for a competing
    // ingestion job to finish or a throttle window to clear.
    if (retryable) throw error;

    // Terminal errors (ValidationException, AccessDeniedException,
    // ResourceNotFoundException) cannot be fixed by re-invoking, so swallow them
    // and let the KBSyncFailure alarm carry the signal.
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to trigger Knowledge Base sync",
        error: errorMessage(error),
      }),
    };
  }

  const ingestionJobId = started.ingestionJob?.ingestionJobId;
  log.info("kb_sync_started", {
    ingestionJobId,
    status: started.ingestionJob?.status,
  });
  metrics.record("KBSyncTriggered");

  const outcome = ingestionJobId
    ? await awaitIngestionOutcome(ingestionJobId, deadlineMs)
    : /** @type {IngestionOutcome} */ ({ outcome: "unknown", status: null, reason: "no_ingestion_job_id" });

  if (outcome.outcome === "failed") {
    log.error("kb_sync_incomplete", {
      ingestionJobId,
      status: outcome.status,
      statistics: outcome.statistics,
      failureReasons: outcome.failureReasons,
    });

    metrics.record("KBSyncFailure");
    captureProductEvent("KBSyncTriggered", { outcome: "failure" });
    await flushTelemetry(metrics);

    // No re-throw: a job that reached a terminal failure will fail the same way
    // on a re-invoke, and blind re-ingestion would only paper over the reason.
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Knowledge Base ingestion did not complete",
        ingestionJobId,
        status: outcome.status,
        triggeredBy: eventSummary,
      }),
    };
  }

  if (outcome.outcome === "unknown") {
    // Distinct from success: the job was accepted but we ran out of invocation
    // budget (or could not read its state) before seeing it settle. Reporting it
    // as success by default is what made the old handler blind.
    log.warn("kb_sync_outcome_unknown", { ingestionJobId, status: outcome.status, reason: outcome.reason });
    metrics.record("KBSyncOutcomeUnknown");
  } else {
    log.info("kb_sync_complete", { ingestionJobId, statistics: outcome.statistics });
  }

  captureProductEvent("KBSyncTriggered", { outcome: outcome.outcome === "complete" ? "success" : "unknown" });
  await flushTelemetry(metrics);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Knowledge Base sync triggered",
      ingestionJobId,
      status: outcome.status ?? started.ingestionJob?.status,
      triggeredBy: eventSummary,
    }),
  };
};
