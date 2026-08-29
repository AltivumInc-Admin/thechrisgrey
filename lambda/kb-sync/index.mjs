/**
 * Lambda function triggered by S3 events (PUT/DELETE) on thechrisgrey-kb-source bucket.
 * Automatically syncs the Bedrock Knowledge Base when content changes.
 * Publishes CloudWatch metrics for observability.
 */

import { BedrockAgentClient, StartIngestionJobCommand } from "@aws-sdk/client-bedrock-agent";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { createLogger } from "lambda-shared/logger";
import { withTimeout } from "lambda-shared/timeout";
import { MetricsCollector } from "lambda-shared/metrics";
import { setRequestContext, captureError, addBreadcrumb, flushSentry } from "lambda-shared/errorTracking";
import { captureProductEvent, flushProductAnalytics } from "lambda-shared/productAnalytics";

const KNOWLEDGE_BASE_ID = process.env.KB_ID || "ARFYABW8HP";
const DATA_SOURCE_ID = process.env.DATA_SOURCE_ID || "TXQTRAJOSD";
const NAMESPACE = "TheChrisGrey/SiteMetrics";

const log = createLogger(null, { service: "kb-sync" });

const client = new BedrockAgentClient({ region: "us-east-1" });
const cloudwatch = new CloudWatchClient({ region: "us-east-1" });

/** @param {any} event */
export const handler = async (event) => {
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

  // Extract event details for logging
  const records = event.Records || [];
  const eventSummary = records.map((/** @type {any} */ r) => ({
    eventName: r.eventName,
    key: r.s3?.object?.key,
    bucket: r.s3?.bucket?.name,
  }));

  log.info("s3_trigger", { changes: eventSummary });
  addBreadcrumb("s3", "sync_triggered", { records: records.length });

  try {
    const command = new StartIngestionJobCommand({
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      dataSourceId: DATA_SOURCE_ID,
    });

    const response = await withTimeout(client.send(command), 15000, "bedrock_start_ingestion");

    log.info("kb_sync_started", {
      ingestionJobId: response.ingestionJob?.ingestionJobId,
      status: response.ingestionJob?.status,
    });

    captureProductEvent("KBSyncTriggered", { outcome: "success" });

    metrics.record("KBSyncTriggered");
    await metrics.flush();
    await flushSentry();
    await flushProductAnalytics();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Knowledge Base sync triggered",
        ingestionJobId: response.ingestionJob?.ingestionJobId,
        triggeredBy: eventSummary,
      }),
    };
  } catch (error) {
    const errName = error instanceof Error ? error.name : "Unknown";
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error("kb_sync_failure", { error: errName, message: errMsg });

    metrics.record("KBSyncFailure");
    captureError(error, { handler: "kb-sync" });
    await metrics.flush();
    await flushSentry();
    await flushProductAnalytics();

    // Don't throw - we don't want S3 to retry on transient errors
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to trigger Knowledge Base sync",
        error: errMsg,
      }),
    };
  }
};
