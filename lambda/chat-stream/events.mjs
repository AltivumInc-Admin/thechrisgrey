export const EVENT_DELIM = "\x00EVT\x00";

export const EVENT_KINDS = Object.freeze({
  TOOL_INVOCATION: "tool_invocation",
  TOOL_RESULT: "tool_result",
  DRAFT_ACTION: "draft_action",
  UI_BLOCK: "ui_block",
  MEMORY_UPDATE: "memory_update",
  GUARDRAIL: "guardrail",
});

/**
 * Write MODEL-authored text to the stream with NUL bytes removed.
 *
 * The wire protocol is NUL-framed (EVENT_DELIM above, "\x00SYS\x00" in
 * index.mjs), so a literal U+0000 in model output can forge a frame the client
 * JSON.parses and trusts — smuggling, for instance, a ui_block that never passed
 * RenderUiInputSchema. Two paths write model text (agent.mjs's stream loop and
 * genUi.mjs's lead-in) and each carried its own copy of the strip; a third would
 * have had to remember. Routing them through one function is what makes the
 * defense hold by construction.
 *
 * Use ONLY for model output. The deliberate delimiter writes in emitEvent and
 * writeSystemMessage must keep their NULs.
 *
 * @param {any} responseStream
 * @param {string} text
 */
export function writeModelText(responseStream, text) {
  // eslint-disable-next-line no-control-regex -- intentionally matching U+0000 to strip forged frame delimiters
  responseStream.write(String(text).replace(/\x00/g, ""));
}

/** @param {any} responseStream @param {any} event */
export function emitEvent(responseStream, event) {
  if (!responseStream || typeof responseStream.write !== "function") {
    throw new Error("emitEvent: responseStream.write is required");
  }
  if (!event || typeof event.kind !== "string") {
    throw new Error("emitEvent: event.kind is required");
  }
  const payload = JSON.stringify(event);
  responseStream.write(EVENT_DELIM + payload + EVENT_DELIM);
}
