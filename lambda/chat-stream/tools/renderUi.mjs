import { tool } from "@strands-agents/sdk";
import { RenderUiInputSchema, LINK_PATH_GUIDANCE } from "../uiBlocks.mjs";
import { emitEvent, EVENT_KINDS } from "../events.mjs";
import { createLogger } from "lambda-shared/logger";
import { recordToolFailure } from "./toolMetrics.mjs";

const _tool = /** @type {any} */ (tool);

/**
 * render_ui — Strands tool that lets Alti compose a small visual block to enrich a
 * text answer (timeline, comparison, stat row, profile, explainer, or link grid).
 *
 * The tool's inputSchema IS the block vocabulary (uiBlocks.mjs), so the Strands SDK
 * validates the model's args before this callback runs — malformed/oversized blocks
 * never reach the client. Each valid block is streamed as a `ui_block` event.
 *
 * IMPORTANT: this tool is registered ONLY for the dedicated /chat surface
 * (buildTools gates it on deps.surface === 'page'). The floating widget never
 * receives it, so the model cannot emit blocks there.
 */
/** @param {{ responseStream: any, metrics: any, requestId: string }} deps */
export function buildRenderUiTool({ responseStream, metrics, requestId }) {
  const log = createLogger(requestId, { service: "chat-stream" });
  return _tool({
    name: "render_ui",
    description:
      "Render a small visual block to supplement your answer: a timeline, a side-by-side comparison, " +
      "a row of stats, a mini profile, a short explainer, or a grid of internal links. " +
      "Use SPARINGLY — only when structure genuinely helps (a sequence, a comparison, a set of links). " +
      "Most answers need none; one block is plenty, three is the maximum. " +
      "ALWAYS also write a short text reply — the block supplements your words, it never replaces them. " +
      // The schema refuses an unknown or restricted path outright; naming the real
      // routes here steers the model first, the way navigate_to's description does.
      LINK_PATH_GUIDANCE,
    inputSchema: RenderUiInputSchema,
    callback: async (/** @type {{ blocks: any[] }} */ { blocks }) => {
      try {
        for (const block of blocks) {
          emitEvent(responseStream, {
            kind: EVENT_KINDS.UI_BLOCK,
            block,
          });
        }
        metrics?.record("ToolCall_RenderUi");
        metrics?.record("RenderUiBlocks", blocks.length);
        return { ok: true, rendered: blocks.map((/** @type {any} */ b) => b.type) };
      } catch (error) {
        recordToolFailure(metrics, "RenderUi");
        log.error("tool_error", {
          tool: "render_ui",
          error: error instanceof Error ? error.name : String(error),
          message: error instanceof Error ? error.message : "",
        });
        return { ok: false, error: "Unable to render that block." };
      }
    },
  });
}
