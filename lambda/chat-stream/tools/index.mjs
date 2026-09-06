import { buildNavigateTool } from "./navigate.mjs";
import { buildDraftMessageTool } from "./draftMessage.mjs";
import { buildDraftNewsletterTool } from "./draftNewsletter.mjs";
import { buildCitePassageTool } from "./citePassage.mjs";
import { buildSearchBlogTool } from "./searchBlog.mjs";
import { buildSearchPodcastTool } from "./searchPodcast.mjs";
import { buildRenderUiTool } from "./renderUi.mjs";
import { buildRememberFactTool } from "./rememberFact.mjs";

/**
 * The dependency bag the tool builders destructure. Named rather than `any` so
 * the one production call site (index.mjs) is type-checked: a dropped or
 * misspelled key used to register a silently-missing tool with no error
 * anywhere. Every key is required — "not configured" is expressed as a null /
 * empty value, not as an absent key — because absence is exactly the failure
 * this typedef exists to catch. `surface` is the sharpest example: omit it and
 * render_ui quietly disappears from the /chat page.
 *
 * @typedef {object} ToolDeps
 * @property {any} responseStream - Lambda response stream; every tool frames events onto it.
 * @property {any} metrics - MetricsCollector; every tool records ToolCall_/ToolFailure_.
 * @property {string} requestId - Correlates a tool's error log with the request.
 * @property {any} sanityClient - Null when Sanity is unconfigured; gates cite_blog_passage + search_blog.
 * @property {any} agentClient - BedrockAgentRuntimeClient for the podcast KB.
 * @property {any} RetrieveCommand - Injected so tests can stub the KB call.
 * @property {string} podcastKbId - Empty string disables search_podcast.
 * @property {any} docClient - DynamoDB document client for visitor memory.
 * @property {any} PutCommand - Injected so tests can stub the memory write.
 * @property {string|null} deviceId - Null means no visitor to remember facts against.
 * @property {Array<{ factId: string, content: string }>} facts - Facts already stored for
 *   this visitor, loaded once per turn by index.mjs. Seeds remember_fact's dedupe map;
 *   an empty array is the honest "nothing stored / no device" value.
 * @property {"page"|"widget"} surface - render_ui is registered only on "page".
 */

/**
 * Build the tool list for an agent invocation.
 *
 * @param {ToolDeps} deps
 * @returns {any[]}
 */
export function buildTools(deps) {
  const tools = [buildNavigateTool(deps), buildDraftMessageTool(deps), buildDraftNewsletterTool(deps)];

  if (deps.sanityClient) {
    tools.push(buildCitePassageTool(deps));
    tools.push(buildSearchBlogTool(deps));
  }

  if (deps.agentClient && deps.RetrieveCommand && deps.podcastKbId) {
    tools.push(buildSearchPodcastTool(deps));
  }

  // Generative UI is offered ONLY on the dedicated /chat page — never the widget.
  if (deps.surface === "page") {
    tools.push(buildRenderUiTool(deps));
  }

  if (deps.docClient && deps.PutCommand && deps.deviceId) {
    // The only cast in this file, and it now covers exactly one thing: the gate
    // above proves deviceId is non-null, but the type system cannot carry that
    // narrowing across the call. (It used to also paper over a required
    // `timeoutMs` dep; that parameter defaults to PUT_FACT_TIMEOUT_MS in
    // rememberFact.mjs and is optional now.)
    tools.push(buildRememberFactTool(/** @type {any} */ (deps)));
  }

  return tools;
}
