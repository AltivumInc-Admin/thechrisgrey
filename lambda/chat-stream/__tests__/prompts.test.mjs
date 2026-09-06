import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BASE_SYSTEM_PROMPT,
  buildVisitorContext,
  buildMemoryContext,
  buildWelcomeBackContext,
  buildSystemPrompt,
} from "../prompts.mjs";

test("buildVisitorContext returns empty string for null", () => {
  assert.equal(buildVisitorContext(null), "");
});

test("buildVisitorContext includes current section/page", () => {
  const out = buildVisitorContext({
    currentPage: "/podcast",
    section: "Podcast",
    visitedPages: [],
  });
  assert.match(out, /Podcast page \(\/podcast\)/);
  assert.match(out, /VISITOR CONTEXT/);
});

test("buildVisitorContext adds journey line when prior pages exist", () => {
  const out = buildVisitorContext({
    currentPage: "/podcast",
    section: "Podcast",
    visitedPages: ["/podcast", "/", "/about"],
  });
  assert.match(out, /also visited: \/, \/about/);
});

test("buildVisitorContext omits journey line when no prior pages", () => {
  const out = buildVisitorContext({
    currentPage: "/",
    section: "Home",
    visitedPages: ["/"],
  });
  assert.doesNotMatch(out, /also visited/);
});

test("buildSystemPrompt without context uses fallback note", () => {
  const out = buildSystemPrompt(null, null);
  assert.ok(out.startsWith(BASE_SYSTEM_PROMPT));
  assert.match(out, /No specific context was retrieved/);
});

test("buildSystemPrompt includes retrieved context", () => {
  const ctx = "Christian served in 3rd SFG as an 18D.";
  const out = buildSystemPrompt(ctx, null);
  assert.match(out, /RETRIEVED CONTEXT/);
  assert.match(out, /3rd SFG/);
  assert.match(out, /END CONTEXT/);
});

test("buildSystemPrompt combines visitor + retrieved context", () => {
  const out = buildSystemPrompt("retrieved info", {
    currentPage: "/altivum",
    section: "Altivum",
    visitedPages: [],
  });
  assert.match(out, /VISITOR CONTEXT/);
  assert.match(out, /Altivum page/);
  assert.match(out, /retrieved info/);
});

test("buildSystemPrompt: render_ui guidance (page surface) reliably honors EXPLICIT structural asks", () => {
  const page = buildSystemPrompt(null, null, [], "page");
  // Scope to the GENERATIVE UI section so we test the render_ui guidance itself,
  // not "explicit" appearing elsewhere (e.g. the remember_fact etiquette).
  const genUi = page.slice(page.indexOf("GENERATIVE UI"));
  assert.match(genUi, /render_ui/);
  // The card promises "compare / timeline / stats / links" triggers — the render_ui
  // guidance must render the matching block on an EXPLICIT request, not suppress it
  // under the "sparingly" rule (which is for unprompted enrichment only).
  assert.match(genUi, /explicit/i);
  assert.match(genUi, /compare|comparison/i);
  assert.match(genUi, /timeline/i);
});

test("buildSystemPrompt: render_ui guidance is omitted on the floating widget surface", () => {
  const widget = buildSystemPrompt(null, null, [], "widget");
  assert.doesNotMatch(widget, /render_ui/);
});

test("buildSystemPrompt: podcast guidance appears only when a podcast KB is configured", () => {
  // Mirrors the search_podcast registration in tools/index.mjs. Advertised
  // unconditionally, the prompt told the model to call a tool it had not been
  // given whenever PODCAST_KB_ID was unset — and nothing surfaced the mismatch,
  // because every Podcast* metric is downstream of the registration.
  const enabled = buildSystemPrompt(null, null, [], "widget", false, true);
  assert.match(enabled, /search_podcast/);
  assert.match(enabled, /The Vector Podcast is Christian's show/);

  const disabled = buildSystemPrompt(null, null, [], "widget", false, false);
  assert.doesNotMatch(disabled, /search_podcast/);

  // Default OFF: a caller that forgets the flag gets the safe shape, not a
  // phantom tool.
  assert.doesNotMatch(buildSystemPrompt(null, null, [], "widget"), /search_podcast/);
});

test("BASE_SYSTEM_PROMPT includes tool etiquette for each tool", () => {
  assert.match(BASE_SYSTEM_PROMPT, /TOOL ETIQUETTE/);
  assert.match(BASE_SYSTEM_PROMPT, /navigate_to/);
  assert.match(BASE_SYSTEM_PROMPT, /draft_message/);
  assert.match(BASE_SYSTEM_PROMPT, /draft_newsletter_subscription/);
  assert.match(BASE_SYSTEM_PROMPT, /search_blog/);
  assert.match(BASE_SYSTEM_PROMPT, /cite_blog_passage/);
  assert.match(BASE_SYSTEM_PROMPT, /remember_fact/);
});

test("BASE_SYSTEM_PROMPT forbids fabricating visitor identity for draft_message", () => {
  assert.match(BASE_SYSTEM_PROMPT, /NEVER fabricate the visitor's name/i);
});

test("BASE_SYSTEM_PROMPT forbids PII in memory", () => {
  assert.match(BASE_SYSTEM_PROMPT, /Never store emails, phone numbers/i);
});

test("buildMemoryContext returns empty for null/undefined/empty", () => {
  assert.equal(buildMemoryContext(null), "");
  assert.equal(buildMemoryContext(undefined), "");
  assert.equal(buildMemoryContext([]), "");
});

test("buildMemoryContext renders strings as bullet list", () => {
  const out = buildMemoryContext(["Is preparing for SFAS", "Works in DevOps"]);
  assert.match(out, /VISITOR MEMORY/);
  assert.match(out, /- Is preparing for SFAS/);
  assert.match(out, /- Works in DevOps/);
});

test("buildMemoryContext accepts {content} objects", () => {
  const out = buildMemoryContext([{ content: "Lives in Austin" }, { content: "Enjoys long-form podcasts" }]);
  assert.match(out, /- Lives in Austin/);
  assert.match(out, /- Enjoys long-form podcasts/);
});

test("buildMemoryContext filters blanks and non-strings", () => {
  const out = buildMemoryContext(["   ", null, undefined, { content: "" }, { content: "Real fact" }]);
  assert.match(out, /- Real fact/);
  assert.doesNotMatch(out, /- \n/);
});

test("buildMemoryContext returns empty when all entries filter out", () => {
  assert.equal(buildMemoryContext(["   ", null, { content: "" }]), "");
});

test("buildSystemPrompt includes memory block when facts provided (no retrieved context)", () => {
  const out = buildSystemPrompt(null, null, ["Has three kids"]);
  assert.match(out, /VISITOR MEMORY/);
  assert.match(out, /- Has three kids/);
  assert.match(out, /No specific context was retrieved/);
});

test("buildSystemPrompt includes visitor + memory + retrieved context together", () => {
  const out = buildSystemPrompt(
    "RAG chunk about Altivum.",
    { section: "Altivum", currentPage: "/altivum", visitedPages: ["/altivum", "/"] },
    ["Is preparing for SFAS"],
  );
  assert.match(out, /VISITOR CONTEXT/);
  assert.match(out, /VISITOR MEMORY/);
  assert.match(out, /- Is preparing for SFAS/);
  assert.match(out, /RETRIEVED CONTEXT/);
  assert.match(out, /RAG chunk about Altivum/);
});

test("buildSystemPrompt omits memory block when facts empty", () => {
  const out = buildSystemPrompt(null, null, []);
  assert.doesNotMatch(out, /VISITOR MEMORY/);
});

// --- Welcome-back branch (VAL-ENG-012) -------------------------------------
// The welcome-back greeting fires ONLY when (a) the visitor has stored facts
// (returning visitor) AND (b) the client signals this is the first message of
// a new session. Every other combination must omit it so first-time visitors
// never see it and it never repeats on later turns.

test("buildWelcomeBackContext returns empty when firstMessage is false", () => {
  assert.equal(buildWelcomeBackContext(["a fact"], false), "");
});

test("buildWelcomeBackContext returns empty when facts are missing", () => {
  assert.equal(buildWelcomeBackContext([], true), "");
  assert.equal(buildWelcomeBackContext(null, true), "");
  assert.equal(buildWelcomeBackContext(undefined, true), "");
});

test("buildWelcomeBackContext returns empty for first-time visitor on first message (no facts)", () => {
  // A first-time visitor sends firstMessage=true but has no stored facts —
  // the greeting must NOT appear (VAL-ENG-012: "does not appear for first-time
  // visitors").
  assert.equal(buildWelcomeBackContext([], true), "");
});

test("buildWelcomeBackContext includes greeting only for returning visitor on first message", () => {
  const out = buildWelcomeBackContext(["Is preparing for SFAS"], true);
  assert.match(out, /WELCOME BACK/);
  assert.match(out, /first/i);
  assert.match(out, /welcome-back/i);
  // Must instruct the model NOT to list the stored facts or repeat the greeting.
  assert.match(out, /do not list/i);
  assert.match(out, /repeat/i);
});

test("buildSystemPrompt includes welcome-back only when facts + firstMessage", () => {
  const facts = ["Is preparing for SFAS"];

  // firstMessage=true + facts → welcome-back present
  const firstReturning = buildSystemPrompt(null, null, facts, "widget", true);
  assert.match(firstReturning, /WELCOME BACK/);

  // firstMessage=false + facts → welcome-back absent (later message in session)
  const laterReturning = buildSystemPrompt(null, null, facts, "widget", false);
  assert.doesNotMatch(laterReturning, /WELCOME BACK/);

  // firstMessage=true + no facts → welcome-back absent (first-time visitor)
  const firstTime = buildSystemPrompt(null, null, [], "widget", true);
  assert.doesNotMatch(firstTime, /WELCOME BACK/);

  // firstMessage omitted (default false) + facts → welcome-back absent
  const defaultFlag = buildSystemPrompt(null, null, facts, "widget");
  assert.doesNotMatch(defaultFlag, /WELCOME BACK/);
});

test("buildSystemPrompt: welcome-back appears before render_ui etiquette on the page surface", () => {
  const out = buildSystemPrompt("ctx", null, ["a fact"], "page", true);
  const wbIdx = out.indexOf("WELCOME BACK");
  const genUiIdx = out.indexOf("GENERATIVE UI");
  assert.ok(wbIdx > -1, "welcome-back block must be present");
  assert.ok(genUiIdx > -1, "render_ui etiquette must be present on the page surface");
  assert.ok(wbIdx < genUiIdx, "welcome-back should render before render_ui etiquette");
});

test("buildSystemPrompt: welcome-back is omitted on the widget surface too when no facts", () => {
  // Sanity: surface alone never triggers welcome-back — facts + firstMessage do.
  const widget = buildSystemPrompt(null, null, [], "widget", true);
  assert.doesNotMatch(widget, /WELCOME BACK/);
});
