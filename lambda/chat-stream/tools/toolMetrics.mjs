/**
 * The tool telemetry naming convention, as a function rather than eight repeated
 * string literals.
 *
 * Every tool already counted its own `ToolFailure_<Tool>` / `ToolTimeout_<Tool>`,
 * which is what you want when you are looking at ONE tool — and useless when you
 * want an alarm. CloudWatch alarms on a single metric name, so "any tool is
 * failing" needed one alarm per tool, each of which has to be remembered when a
 * tool is added; nothing here emits dimensions, so there was no aggregate to
 * point an alarm at either.
 *
 * These helpers emit the bare `ToolFailure` / `ToolTimeout` counter alongside the
 * per-tool one. The aggregate is what an alarm watches; the suffixed name is what
 * an operator drills into afterwards. A deliberate REJECTION (a PII refusal, a
 * stop-word query, a restricted path) is not a failure and never reaches here —
 * that distinction is the whole reason the aggregate is safe to alarm on.
 */

/**
 * @param {{ record: any } | undefined | null} metrics
 * @param {string} tool - PascalCase tool name, e.g. "SearchPodcast".
 */
export function recordToolFailure(metrics, tool) {
  metrics?.record("ToolFailure");
  metrics?.record(`ToolFailure_${tool}`);
}

/**
 * @param {{ record: any } | undefined | null} metrics
 * @param {string} tool - PascalCase tool name, e.g. "RememberFact".
 */
export function recordToolTimeout(metrics, tool) {
  metrics?.record("ToolTimeout");
  metrics?.record(`ToolTimeout_${tool}`);
}
