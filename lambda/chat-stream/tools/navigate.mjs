import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import { isValidPath, UNLINKABLE_PATHS } from "../validation.mjs";
import { emitEvent, EVENT_KINDS } from "../events.mjs";

const _tool = /** @type {any} */ (tool);

/** @param {{ responseStream: any, metrics: any }} deps */
export function buildNavigateTool({ responseStream, metrics }) {
  return _tool({
    name: "navigate_to",
    description:
      "Suggest that the visitor navigate to a specific page on thechrisgrey.com. " +
      "Use when a dedicated page would answer the visitor's question better than a prose reply. " +
      "Allowed paths: /, /about, /altivum, /foundation, /podcast, /beyond-the-assessment, /aws, /claude, " +
      "/blog, /blog/<slug>, /contact, /links, /blueprint, /privacy. " +
      "Do NOT use for /admin or /chat.",
    inputSchema: z.object({
      path: z.string().describe("The route path, e.g. /about or /blog/post-slug"),
      reason: z.string().min(4).max(240).describe("One sentence explaining why this page helps the visitor"),
    }),
    callback: async (/** @type {{ path: string, reason: string }} */ { path, reason }) => {
      // Shared with render_ui's block schema via validation.mjs (isLinkablePath
      // is exactly isValidPath minus this set). Kept as its own branch rather
      // than folded into isLinkablePath so a restricted route still gets the
      // "restricted" answer instead of "not a known route" — the model should
      // learn the page exists and is off-limits, not that it was imagined.
      if (UNLINKABLE_PATHS.has(path)) {
        metrics?.record("ToolRejection_NavigateTo");
        return { ok: false, error: "Path is restricted." };
      }
      if (!isValidPath(path)) {
        metrics?.record("ToolRejection_NavigateTo");
        return { ok: false, error: `Path ${path} is not a known route on the site.` };
      }
      metrics?.record("ToolCall_NavigateTo");
      emitEvent(responseStream, {
        kind: EVENT_KINDS.DRAFT_ACTION,
        action: "navigate",
        path,
        reason,
      });
      return { ok: true, path, reason };
    },
  });
}
