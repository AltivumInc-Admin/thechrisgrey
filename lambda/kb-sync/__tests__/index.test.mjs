import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// --- Isolate from AWS BEFORE importing the handler -------------------------
// kb-sync/index.mjs builds its BedrockAgentClient + CloudWatchClient at module
// scope with NO dependency-injection seam: the clients are not exported and the
// handler closes over them directly. The repo's established pattern for this
// exact situation (see lambda/metrics/__tests__/requestId-propagation.test.mjs)
// is to override the SDK client classes' `prototype.send` BEFORE importing the
// handler. That intercepts the *exact* clients the real handler uses while still
// running the entire real handler body: real event parsing, real
// StartIngestionJobCommand / GetIngestionJobCommand / PutMetricDataCommand
// construction, real response shaping, and the real retry + polling paths.
//
// Defense-in-depth: strip every credential/IMDS source so that even if a stub
// were bypassed, the SDK could not reach the network.
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;
delete process.env.AWS_SESSION_TOKEN;
delete process.env.AWS_PROFILE;
process.env.AWS_SHARED_CREDENTIALS_FILE = "/dev/null";
process.env.AWS_CONFIG_FILE = "/dev/null";
process.env.AWS_EC2_METADATA_DISABLED = "true";
process.env.AWS_REGION = "us-east-1";

// The ids are env-first since 2647a8e (the migration to a second account):
// KB_ID || "ARFYABW8HP" and KB_DATA_SOURCE_ID || DATA_SOURCE_ID || "TXQTRAJOSD".
// They are resolved once at module-evaluation time, so proving both halves needs
// separate imports (below). Delete them here so the default-value assertions are
// deterministic: an operator shell that exports KB_ID mid-cutover is exactly the
// state that used to turn this file red for reasons that had nothing to do with
// the handler.
delete process.env.KB_ID;
delete process.env.KB_DATA_SOURCE_ID;
delete process.env.DATA_SOURCE_ID;

const { BedrockAgentClient, StartIngestionJobCommand, GetIngestionJobCommand } =
  await import("@aws-sdk/client-bedrock-agent");
const { CloudWatchClient } = await import("@aws-sdk/client-cloudwatch");

// The values the handler ships when nothing is exported (CLAUDE.md,
// lambda/kb-sync/iam-policy.json).
const DEFAULT_KB_ID = "ARFYABW8HP";
const DEFAULT_DATA_SOURCE_ID = "TXQTRAJOSD";
const EXPECTED_NAMESPACE = "TheChrisGrey/SiteMetrics";

// Capture every command sent through each SDK client. We swap the *behavior*
// per-test (per command type) via mutable closures, but the interception is
// installed once on the real prototypes.
let bedrockCalls = [];
let bedrockOptions = [];
let startBehavior = null; // (cmd, options) => StartIngestionJob response | throws
let getBehavior = null; // (cmd, options) => GetIngestionJob response | throws
let cloudwatchCalls = [];
let cloudwatchBehavior = null;

// The real handler calls `client.send(new StartIngestionJobCommand(...))` and,
// once the job is accepted, `client.send(new GetIngestionJobCommand(...))` until
// the job settles. Overriding the prototype catches both sends. We record the
// *real* command objects (with their real `.input`) so assertions exercise the
// genuine command-construction logic, not a re-implementation.
BedrockAgentClient.prototype.send = async function bedrockStub(command, options) {
  bedrockCalls.push(command);
  bedrockOptions.push(options);

  // Every Bedrock call must arrive with a real abortSignal. Failing loudly here
  // (rather than ignoring the second argument) is what keeps a revert to
  // withTimeout — a Promise.race that leaves the request in flight — from
  // passing this file unnoticed.
  if (!options?.abortSignal) throw new Error("Bedrock send() called without an abortSignal");

  if (command instanceof StartIngestionJobCommand) {
    if (startBehavior) return startBehavior(command, options);
    // Real StartIngestionJob output: the job is only ACCEPTED here, so its
    // status is always STARTING — that is precisely why the handler polls.
    return { ingestionJob: { ingestionJobId: "default-job-id", status: "STARTING" } };
  }

  if (command instanceof GetIngestionJobCommand) {
    if (getBehavior) return getBehavior(command, options);
    return {
      ingestionJob: {
        ingestionJobId: "default-job-id",
        status: "COMPLETE",
        statistics: { numberOfDocumentsScanned: 1, numberOfNewDocumentsIndexed: 1, numberOfDocumentsFailed: 0 },
      },
    };
  }

  throw new Error(`unexpected Bedrock command: ${command?.constructor?.name}`);
};

CloudWatchClient.prototype.send = async function cloudwatchStub(command) {
  cloudwatchCalls.push(command);
  if (cloudwatchBehavior) return cloudwatchBehavior(command);
  return {}; // real PutMetricData returns an empty object on success
};

const { handler } = await import("../index.mjs");

// A second module instance evaluated with the ids exported, which is the state
// the account migration puts the Lambda in. A query string makes this a distinct
// module URL, so index.mjs re-runs its module-scope constants while still
// resolving the SAME @aws-sdk classes (bare specifier, no query) — the stubs
// above still intercept it.
process.env.KB_ID = "KBTESTID001";
process.env.KB_DATA_SOURCE_ID = "DSTESTID002";
const { handler: envOverrideHandler } = await import("../index.mjs?ids=override");
delete process.env.KB_ID;
delete process.env.KB_DATA_SOURCE_ID;

// A third instance with only the legacy, non-namespaced name exported. The
// handler must still honour it: a migration shell that exported DATA_SOURCE_ID
// before the rename would otherwise fall back to the ORIGINAL account's data
// source and re-ingest the wrong bucket without a single error.
process.env.DATA_SOURCE_ID = "DSLEGACY003";
const { handler: legacyDataSourceHandler } = await import("../index.mjs?ids=legacy");
delete process.env.DATA_SOURCE_ID;

// Silence the handler's structured console.log/error during tests; restore
// after each so a failure still surfaces useful output if needed.
let restoreConsole = null;
function muteConsole() {
  const log = console.log;
  const warn = console.warn;
  const error = console.error;
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  restoreConsole = () => {
    console.log = log;
    console.warn = warn;
    console.error = error;
  };
}

beforeEach(() => {
  bedrockCalls = [];
  bedrockOptions = [];
  cloudwatchCalls = [];
  startBehavior = null;
  getBehavior = null;
  cloudwatchBehavior = null;
  muteConsole();
});

afterEach(() => {
  if (restoreConsole) restoreConsole();
  restoreConsole = null;
});

const startCommands = () => bedrockCalls.filter((c) => c instanceof StartIngestionJobCommand);
const getCommands = () => bedrockCalls.filter((c) => c instanceof GetIngestionJobCommand);
const publishedMetrics = () =>
  cloudwatchCalls.flatMap((c) => c.input.MetricData.map((/** @type {any} */ d) => d.MetricName));

// A Lambda context stub. The handler derives one absolute deadline from
// getRemainingTimeInMillis(), so the remaining budget is how a test steers the
// retry and polling paths without real sleeps.
const lambdaContext = (remainingMs) => ({ getRemainingTimeInMillis: () => remainingMs });

// A realistic S3 PUT event, matching the shape S3 actually delivers to a
// Lambda notification (Records[].s3.bucket.name / s3.object.key / eventName).
function s3PutEvent({
  bucket = "thechrisgrey-kb-source",
  key = "knowledge-base.txt",
  eventName = "ObjectCreated:Put",
} = {}) {
  return {
    Records: [
      {
        eventVersion: "2.1",
        eventSource: "aws:s3",
        awsRegion: "us-east-1",
        eventName,
        s3: {
          s3SchemaVersion: "1.0",
          bucket: { name: bucket, arn: `arn:aws:s3:::${bucket}` },
          object: { key, size: 1024, eTag: "abc123" },
        },
      },
    ],
  };
}

test("StartIngestionJob is built with the shipped default KB + DataSource IDs when nothing is exported", async () => {
  const response = await handler(s3PutEvent());

  assert.equal(startCommands().length, 1, "handler must send exactly one StartIngestionJobCommand");

  const command = startCommands()[0];
  // The handler sends a *real* StartIngestionJobCommand; assert against the
  // genuine SDK class, not a duck-typed shape.
  assert.ok(command instanceof StartIngestionJobCommand, "command must be a real StartIngestionJobCommand instance");
  // The real SDK stores the constructor config on `.input` (verified against
  // the live SDK), so this asserts the exact wiring the handler builds.
  assert.deepEqual(command.input, {
    knowledgeBaseId: DEFAULT_KB_ID,
    dataSourceId: DEFAULT_DATA_SOURCE_ID,
  });

  assert.equal(response.statusCode, 200);
});

test("KB_ID and KB_DATA_SOURCE_ID override the shipped defaults", async () => {
  const response = await envOverrideHandler(s3PutEvent());

  assert.deepEqual(startCommands()[0].input, {
    knowledgeBaseId: "KBTESTID001",
    dataSourceId: "DSTESTID002",
  });
  // The poll has to follow the same ids, or the handler would report on a job
  // in whichever account the defaults point at.
  assert.deepEqual(getCommands()[0].input, {
    knowledgeBaseId: "KBTESTID001",
    dataSourceId: "DSTESTID002",
    ingestionJobId: "default-job-id",
  });
  assert.equal(response.statusCode, 200);

  // The health probe reports the ids it would actually sync, not the literals.
  const health = JSON.parse((await envOverrideHandler({ healthCheck: true })).body);
  assert.equal(health.knowledgeBaseId, "KBTESTID001");
  assert.equal(health.dataSourceId, "DSTESTID002");
});

test("the legacy non-namespaced DATA_SOURCE_ID is still honoured", async () => {
  await legacyDataSourceHandler(s3PutEvent());

  assert.deepEqual(startCommands()[0].input, {
    knowledgeBaseId: DEFAULT_KB_ID,
    dataSourceId: "DSLEGACY003",
  });
});

test("success path returns 200 with the ingestionJobId from the Bedrock response", async () => {
  startBehavior = () => ({
    ingestionJob: {
      ingestionJobId: "job-7f3a9c",
      status: "STARTING",
      knowledgeBaseId: DEFAULT_KB_ID,
      dataSourceId: DEFAULT_DATA_SOURCE_ID,
    },
  });
  getBehavior = () => ({
    ingestionJob: {
      ingestionJobId: "job-7f3a9c",
      status: "COMPLETE",
      statistics: { numberOfNewDocumentsIndexed: 2, numberOfDocumentsFailed: 0 },
    },
  });

  const response = await handler(s3PutEvent({ key: "docs/new-entry.txt" }));

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.message, "Knowledge Base sync triggered");
  // ingestionJobId must be read off the real response shape
  // (response.ingestionJob.ingestionJobId).
  assert.equal(body.ingestionJobId, "job-7f3a9c");
  // The reported status is the job's TERMINAL state, not the STARTING that
  // StartIngestionJob hands back.
  assert.equal(body.status, "COMPLETE");
  // The poll must address the job the start returned.
  assert.equal(getCommands()[0].input.ingestionJobId, "job-7f3a9c");
  // triggeredBy echoes the parsed S3 record(s).
  assert.deepEqual(body.triggeredBy, [
    {
      eventName: "ObjectCreated:Put",
      key: "docs/new-entry.txt",
      bucket: "thechrisgrey-kb-source",
    },
  ]);
});

test("success path publishes the KBSyncTriggered CloudWatch metric", async () => {
  await handler(s3PutEvent());

  assert.equal(cloudwatchCalls.length, 1, "exactly one PutMetricDataCommand on the success path");
  const metricCmd = cloudwatchCalls[0];
  // Check the constructor NAME, not `instanceof`: the metric command is built by
  // MetricsCollector in lambda-shared, which resolves its own @aws-sdk/client-cloudwatch
  // copy. Under CI's `npm ci --no-workspaces` isolated installs that copy differs from
  // this test's, so `instanceof` fails across the boundary even though it is a real
  // PutMetricDataCommand. Name comparison is identity-agnostic and still rejects a mock.
  assert.equal(metricCmd?.constructor?.name, "PutMetricDataCommand", "must be a real PutMetricDataCommand instance");
  assert.equal(metricCmd.input.Namespace, EXPECTED_NAMESPACE);
  assert.equal(metricCmd.input.MetricData.length, 1);
  const datum = metricCmd.input.MetricData[0];
  assert.equal(datum.MetricName, "KBSyncTriggered");
  assert.equal(datum.Value, 1);
  assert.equal(datum.Unit, "Count");
  assert.ok(datum.Timestamp instanceof Date, "Timestamp is a Date");
});

test("multi-record S3 event still triggers a single ingestion job and echoes every record", async () => {
  // S3 can batch multiple object changes into one notification. The handler
  // summarizes all of them but triggers exactly one full-KB ingestion (the KB
  // re-ingests the whole data source regardless of which keys changed).
  const event = {
    Records: [
      s3PutEvent({ key: "a.txt", eventName: "ObjectCreated:Put" }).Records[0],
      s3PutEvent({ key: "b.txt", eventName: "ObjectRemoved:Delete" }).Records[0],
    ],
  };

  const response = await handler(event);

  assert.equal(startCommands().length, 1, "one ingestion job regardless of record count");
  const body = JSON.parse(response.body);
  assert.deepEqual(
    body.triggeredBy.map((/** @type {any} */ r) => ({ name: r.eventName, key: r.key })),
    [
      { name: "ObjectCreated:Put", key: "a.txt" },
      { name: "ObjectRemoved:Delete", key: "b.txt" },
    ],
  );
});

test("empty/non-matching event (no Records) does not crash and still maps to an empty summary", async () => {
  // The handler treats `event.Records || []`, so an event without Records (or a
  // direct/console test invoke) must not throw. NOTE: the handler does NOT
  // short-circuit on an empty event — it still fires an ingestion job. This
  // test pins that ACTUAL behavior rather than an assumed "ignore" path.
  const response = await handler({});

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.deepEqual(body.triggeredBy, []);
  // Documented reality: the current handler fires even with zero records.
  assert.equal(
    startCommands().length,
    1,
    "current handler fires ingestion even on an empty event (no Records short-circuit)",
  );
});

// --- Terminal outcome, not just acceptance ---------------------------------

test("a COMPLETE job that failed documents publishes KBSyncFailure and returns 500", async () => {
  // Observed in production (job NUGY844DQO): status COMPLETE with
  // numberOfDocumentsFailed 1 and nothing indexed. Reporting acceptance as the
  // whole outcome made that invisible to every metric, alarm and log.
  getBehavior = () => ({
    ingestionJob: {
      ingestionJobId: "default-job-id",
      status: "COMPLETE",
      statistics: { numberOfDocumentsScanned: 1, numberOfNewDocumentsIndexed: 0, numberOfDocumentsFailed: 1 },
    },
  });

  const response = await handler(s3PutEvent());

  assert.equal(response.statusCode, 500);
  assert.equal(JSON.parse(response.body).message, "Knowledge Base ingestion did not complete");
  assert.ok(
    publishedMetrics().includes("KBSyncFailure"),
    "a COMPLETE job with failed documents must publish KBSyncFailure",
  );
});

test("a FAILED ingestion job publishes KBSyncFailure and returns 500", async () => {
  getBehavior = () => ({
    ingestionJob: {
      ingestionJobId: "default-job-id",
      status: "FAILED",
      failureReasons: ["embedding model unavailable"],
      statistics: { numberOfDocumentsFailed: 0 },
    },
  });

  const response = await handler(s3PutEvent());

  assert.equal(response.statusCode, 500);
  assert.equal(JSON.parse(response.body).status, "FAILED");
  assert.ok(publishedMetrics().includes("KBSyncFailure"), "a FAILED job must publish KBSyncFailure");
});

test("polling continues until the job leaves a non-terminal state", async () => {
  const statuses = ["IN_PROGRESS", "COMPLETE"];
  getBehavior = () => ({
    ingestionJob: {
      ingestionJobId: "default-job-id",
      status: statuses.shift(),
      statistics: { numberOfDocumentsFailed: 0 },
    },
  });

  const response = await handler(s3PutEvent(), lambdaContext(60_000));

  assert.equal(getCommands().length, 2, "an IN_PROGRESS job must be polled again");
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).status, "COMPLETE");
  assert.deepEqual(publishedMetrics(), ["KBSyncTriggered"], "a clean sync publishes no failure/unknown metric");
});

test("a job that has not settled by the budget publishes KBSyncOutcomeUnknown, never a silent success", async () => {
  // 5.2s remaining minus the flush reserve leaves no room for even one poll, so
  // the handler must say it does not know rather than default to success.
  const response = await handler(s3PutEvent(), lambdaContext(5_200));

  assert.equal(response.statusCode, 200, "the job was accepted, so this is not a start failure");
  assert.equal(getCommands().length, 0, "no budget left to poll");
  assert.deepEqual(publishedMetrics(), ["KBSyncTriggered", "KBSyncOutcomeUnknown"]);
  assert.ok(!publishedMetrics().includes("KBSyncFailure"), "an unknown outcome must not page as a failure");
});

test("a GetIngestionJob failure degrades to unknown instead of failing a healthy sync", async () => {
  // The role may not carry bedrock:GetIngestionJob yet. A poll that cannot run
  // says nothing about the job, so it must not turn every successful publish
  // into a KBSyncFailure page (the alarm's threshold is 0).
  getBehavior = () => {
    const err = new Error("User is not authorized to perform: bedrock:GetIngestionJob");
    err.name = "AccessDeniedException";
    throw err;
  };

  const response = await handler(s3PutEvent());

  assert.equal(response.statusCode, 200);
  assert.deepEqual(publishedMetrics(), ["KBSyncTriggered", "KBSyncOutcomeUnknown"]);
});

// --- Start failures: retryable vs terminal ---------------------------------

test("a retryable start failure is re-thrown so Lambda re-invokes the S3 event", async () => {
  // ConflictException means another ingestion job is already running on this
  // data source, i.e. the sync has not happened YET. Resolving here would record
  // the async invoke as a success and drop the S3 write for good, leaving the KB
  // serving the previous knowledge-base.txt while the admin sees a clean publish.
  const boom = new Error("ingestion already running");
  boom.name = "ConflictException";
  startBehavior = () => {
    throw boom;
  };

  // A 5.3s budget leaves no room for the in-handler backoff, so this exercises
  // the re-throw on the first attempt.
  await assert.rejects(
    () => handler(s3PutEvent(), lambdaContext(5_300)),
    (/** @type {any} */ err) => err === boom,
    "a retryable Bedrock failure must reject so Lambda retries the async invoke",
  );

  assert.equal(startCommands().length, 1, "no budget for an in-handler retry at this deadline");
  // The metrics have to be flushed BEFORE the throw, or the failure that
  // triggered the retry would never reach the alarm.
  assert.ok(publishedMetrics().includes("KBSyncFailure"), "KBSyncFailure must be flushed before re-throwing");
});

test("a retryable start failure is retried in-handler before giving up", async () => {
  let attempts = 0;
  startBehavior = () => {
    attempts += 1;
    if (attempts === 1) {
      const err = new Error("Too many requests");
      err.name = "ThrottlingException";
      throw err;
    }
    return { ingestionJob: { ingestionJobId: "job-after-retry", status: "STARTING" } };
  };

  const response = await handler(s3PutEvent(), lambdaContext(60_000));

  assert.equal(startCommands().length, 2, "a throttled start must be retried within the invocation");
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).ingestionJobId, "job-after-retry");
  assert.ok(!publishedMetrics().includes("KBSyncFailure"), "a recovered retry is not a failure");
});

test("a terminal start failure is swallowed (no re-invoke) and publishes KBSyncFailure", async () => {
  // ValidationException cannot be fixed by running the same event again, so the
  // handler resolves: re-invoking would only burn two more invocations and three
  // alarm data points for the same broken configuration.
  const boom = new Error("dataSourceId does not exist");
  boom.name = "ValidationException";
  startBehavior = () => {
    throw boom;
  };

  let response;
  await assert.doesNotReject(async () => {
    response = await handler(s3PutEvent(), lambdaContext(60_000));
  }, "a terminal Bedrock failure must resolve, not reject");

  assert.equal(startCommands().length, 1, "a terminal error must not be retried");
  assert.equal(response.statusCode, 500);
  const body = JSON.parse(response.body);
  assert.equal(body.message, "Failed to trigger Knowledge Base sync");
  assert.equal(body.error, "dataSourceId does not exist");
  assert.deepEqual(publishedMetrics(), ["KBSyncFailure"]);
});

// --- Cancellation, not just un-awaiting ------------------------------------

test("every Bedrock call carries a real AbortSignal", async () => {
  await handler(s3PutEvent());

  assert.equal(bedrockOptions.length, 2, "one start plus one poll");
  for (const options of bedrockOptions) {
    assert.ok(options.abortSignal instanceof AbortSignal, "send() must receive an AbortController signal");
    assert.equal(options.abortSignal.aborted, false, "a call that answered in time must not have been aborted");
  }
});

test("a hung StartIngestionJob is actually cancelled, not merely stopped being awaited", async () => {
  // lambda/shared/timeout.mjs says as much: withTimeout is a Promise.race that
  // leaves the request in flight, so a "timeout" there could record KBSyncFailure
  // for an ingestion that really did start. This asserts the request itself is
  // cancelled — the stub only settles when the signal fires.
  let sawAbort = false;
  startBehavior = (_command, options) =>
    new Promise((_resolve, reject) => {
      options.abortSignal.addEventListener("abort", () => {
        sawAbort = true;
        const err = new Error("Request aborted");
        err.name = "AbortError";
        reject(err);
      });
    });

  // 6s remaining leaves a 1s deadline after the flush reserve, so the abort
  // fires quickly and there is no room for an in-handler retry.
  await assert.rejects(
    () => handler(s3PutEvent(), lambdaContext(6_000)),
    (/** @type {any} */ err) => err.name === "AbortError",
    "an aborted start is retryable, so it must reject and let Lambda re-invoke",
  );

  assert.ok(sawAbort, "the AbortController must have fired on the in-flight request");
  assert.ok(publishedMetrics().includes("KBSyncFailure"));
});

test("a failing metric publish is swallowed and does not break the success path", async () => {
  // MetricsCollector.flush does `.catch(...)` on the CloudWatch send, so a
  // metric outage must not turn a successful ingestion into a 500.
  cloudwatchBehavior = () => {
    const err = new Error("cloudwatch throttled");
    err.name = "ThrottlingException";
    throw err;
  };

  let response;
  await assert.doesNotReject(async () => {
    response = await handler(s3PutEvent());
  }, "a CloudWatch failure must not reject the handler");

  // Ingestion still happened and the response is still a success.
  assert.equal(startCommands().length, 1);
  assert.equal(response.statusCode, 200);
});

test("health check mode returns 200 without triggering ingestion or metrics", async () => {
  const response = await handler({ healthCheck: true });

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.ok, true);
  assert.equal(body.service, "kb-sync");
  assert.equal(body.version, "1.0.0");
  assert.equal(body.knowledgeBaseId, DEFAULT_KB_ID);
  assert.equal(body.dataSourceId, DEFAULT_DATA_SOURCE_ID);

  // Health check must not trigger any Bedrock or CloudWatch calls
  assert.equal(bedrockCalls.length, 0, "health check must not trigger ingestion");
  assert.equal(cloudwatchCalls.length, 0, "health check must not publish metrics");
});

test("health check mode works alongside normal S3 events in the same handler", async () => {
  // Verify the health check doesn't interfere with normal operation
  const healthResponse = await handler({ healthCheck: true });
  assert.equal(healthResponse.statusCode, 200);

  // Reset and verify normal S3 event still works
  bedrockCalls = [];
  const syncResponse = await handler(s3PutEvent());
  assert.equal(syncResponse.statusCode, 200);
  assert.equal(startCommands().length, 1, "normal S3 event still triggers ingestion after health check");
});
