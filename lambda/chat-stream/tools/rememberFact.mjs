import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import { putFact, sanitizeFactContent, MAX_FACT_LENGTH, PUT_FACT_TIMEOUT_MS } from "../memory.mjs";
import { emitEvent, EVENT_KINDS } from "../events.mjs";
import { createLogger } from "lambda-shared/logger";
import { recordToolFailure, recordToolTimeout } from "./toolMetrics.mjs";

const _tool = /** @type {any} */ (tool);

// A rejected fact is a working control, not a dependency failure. Counting each
// refusal separately keeps ToolFailure_RememberFact meaning only "the DynamoDB
// write failed" — safe to alarm on — and gives the server-side PII guard the one
// number an operator would ask for: how often it fires.
const REJECTION_METRICS = {
  email: "ToolRejection_RememberFact_PII",
  phone: "ToolRejection_RememberFact_PII",
  sentinel: "ToolRejection_RememberFact_Sentinel",
  empty: "ToolRejection_RememberFact_Empty",
};

// Definite refusals, not "try again" copy: the model should move on rather than
// re-offering the same blocked fact for the rest of the turn.
const PII_REFUSAL = "I don't store contact details like emails or phone numbers, so I've skipped that one.";
const CONTENT_REFUSAL = "That isn't something I can save.";

/** @param {any} content @returns {string} */
function dedupeKey(content) {
  return sanitizeFactContent(content).toLowerCase();
}

/**
 * @param {{ docClient: any, PutCommand: any, deviceId: string, responseStream: any, metrics: any, requestId: string, timeoutMs?: number, facts?: Array<{ factId: string, content: string }> }} deps
 */
export function buildRememberFactTool({
  docClient,
  PutCommand,
  deviceId,
  responseStream,
  metrics,
  requestId,
  timeoutMs = PUT_FACT_TIMEOUT_MS,
  facts = [],
}) {
  const log = createLogger(requestId, { service: "chat-stream" });
  // Seeded from the facts already loaded for this turn, so a repeat costs zero
  // extra reads. Without it, nothing server-side notices a duplicate: factId is
  // timestamp + uuid so identical text always lands on a fresh row, and getFacts
  // only ever reads back the newest 20 — twenty repeats push everything else the
  // visitor shared out of the readable window for the full 90-day TTL.
  /** @type {Map<string, { content: string, factId: string }>} */
  const seen = new Map();
  for (const fact of facts) {
    const key = dedupeKey(fact?.content);
    if (key && !seen.has(key)) seen.set(key, { content: fact.content, factId: fact.factId });
  }

  return _tool({
    name: "remember_fact",
    description:
      "Save a short, voluntarily-shared fact about the visitor so you can recall it in future conversations. " +
      "Use ONLY when the visitor explicitly volunteers a detail they want remembered " +
      "(e.g. 'I'm a platform engineer at X', 'I'm interviewing for SOF selection', 'call me Pat'). " +
      "Never store sensitive PII — no full email addresses, phone numbers, home addresses, or health details. " +
      "Keep each fact under 240 characters and phrase it in the third person.",
    inputSchema: z.object({
      fact: z
        .string()
        .min(4)
        .max(MAX_FACT_LENGTH)
        .describe(
          "Third-person fact about the visitor, e.g. 'Is preparing for SFAS' or 'Runs a fintech startup in Dallas'",
        ),
    }),
    callback: async (/** @type {{ fact: string }} */ { fact }) => {
      if (!deviceId) {
        metrics?.record("ToolRejection_RememberFact_NoDevice");
        return { ok: false, error: "No visitor device identified; cannot persist memory." };
      }
      const key = dedupeKey(fact);
      const known = key ? seen.get(key) : undefined;
      if (known) {
        // Same answer and the same event as a fresh save, so nothing the agent or
        // the UI sees changes — only the redundant write is skipped.
        metrics?.record("ToolDedupe_RememberFact");
        emitEvent(responseStream, {
          kind: EVENT_KINDS.MEMORY_UPDATE,
          action: "remembered",
          content: known.content,
          factId: known.factId,
        });
        return { ok: true, remembered: known.content };
      }
      // Counted for the ATTEMPT — past the no-device gate and the dedupe
      // short-circuit, before the awaited write. Recorded on the far side of
      // putFact, a failed or timed-out write emitted ToolFailure_/ToolTimeout_
      // with no matching ToolCall_, so failures/calls was not a failure rate and
      // could exceed 1. The sanitizer refusal inside putFact is counted here too,
      // which is correct: the model did call the tool, and the refusal has its
      // own ToolRejection_ name to be read against this one.
      metrics?.record("ToolCall_RememberFact");
      const startedAt = Date.now();
      try {
        const saved = await putFact(docClient, PutCommand, deviceId, fact, { timeoutMs });
        seen.set(key, { content: saved.content, factId: saved.factId });
        metrics?.record("ToolLatency_RememberFact", Date.now() - startedAt, "Milliseconds");
        emitEvent(responseStream, {
          kind: EVENT_KINDS.MEMORY_UPDATE,
          action: "remembered",
          content: saved.content,
          factId: saved.factId,
        });
        return { ok: true, remembered: saved.content };
      } catch (error) {
        const errName = error instanceof Error ? error.name : String(error);
        // A sanitizer rejection is the privacy control working as designed — count
        // and log it as a refusal, or it drowns a real write outage in PII noise.
        if (errName === "FactRejectedError") {
          const reason = /** @type {{ reason?: keyof typeof REJECTION_METRICS }} */ (error).reason || "empty";
          metrics?.record(REJECTION_METRICS[reason] || REJECTION_METRICS.empty);
          log.info("tool_rejected", { tool: "remember_fact", reason });
          return {
            ok: false,
            error: `${reason === "email" || reason === "phone" ? PII_REFUSAL : CONTENT_REFUSAL} Tell me something else and I'll remember that instead.`,
          };
        }
        // Distinguish a hung-write timeout from a genuine DynamoDB failure so the
        // two are separable in CloudWatch and the visitor gets accurate copy.
        const timedOut = errName === "TimeoutError";
        if (timedOut) recordToolTimeout(metrics, "RememberFact");
        else recordToolFailure(metrics, "RememberFact");
        log.error("tool_error", {
          tool: "remember_fact",
          error: errName,
          message: error instanceof Error ? error.message : "",
        });
        return {
          ok: false,
          error: timedOut ? "Unable to save that right now — it timed out." : "Unable to save that right now.",
        };
      }
    },
  });
}
