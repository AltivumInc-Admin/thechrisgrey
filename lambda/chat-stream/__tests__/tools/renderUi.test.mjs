import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRenderUiTool } from "../../tools/renderUi.mjs";
import { RenderUiInputSchema, UiBlockSchema } from "../../uiBlocks.mjs";
import { EVENT_DELIM } from "../../events.mjs";

function fakeStream() {
  const chunks = [];
  return { chunks, write: (s) => chunks.push(s) };
}

function fakeMetrics() {
  const records = [];
  return { records, record: (name, value, unit) => records.push({ name, value, unit }) };
}

function parseEvents(stream) {
  return stream.chunks.map((chunk) => JSON.parse(chunk.slice(EVENT_DELIM.length, chunk.length - EVENT_DELIM.length)));
}

const validTimeline = {
  type: "timeline",
  title: "Career",
  items: [
    { year: "2008", heading: "Enlisted", detail: "Joined the Army." },
    { year: "2014", heading: "18D", detail: "Became a Special Forces medic." },
  ],
};

const validComparison = {
  type: "comparison",
  left: { heading: "AWS work", points: ["Community Builder"] },
  right: { heading: "Claude work", points: ["Applied AI engineer"] },
};

// ── Schema validation (the SDK enforces inputSchema before the callback) ──

test("RenderUiInputSchema accepts valid blocks", () => {
  const r = RenderUiInputSchema.safeParse({ blocks: [validTimeline, validComparison] });
  assert.equal(r.success, true);
});

test("RenderUiInputSchema rejects an empty blocks array", () => {
  assert.equal(RenderUiInputSchema.safeParse({ blocks: [] }).success, false);
});

test("RenderUiInputSchema rejects more than three blocks", () => {
  const four = [validTimeline, validComparison, validTimeline, validComparison];
  assert.equal(RenderUiInputSchema.safeParse({ blocks: four }).success, false);
});

test("UiBlockSchema rejects an unknown block type", () => {
  assert.equal(UiBlockSchema.safeParse({ type: "iframe", src: "evil" }).success, false);
});

test("UiBlockSchema rejects a link_grid with an external path", () => {
  const block = {
    type: "link_grid",
    links: [
      { label: "Evil", path: "https://evil.example", blurb: "nope" },
      { label: "Blog", path: "/blog", blurb: "posts" },
    ],
  };
  assert.equal(UiBlockSchema.safeParse(block).success, false);
});

// The path allowlist is a SCHEMA control: the Strands SDK validates inputSchema
// before the callback runs, and the client is no backstop — GenerativeBlocks.tsx
// renders anything starting with "/" as a live link.

test("UiBlockSchema rejects a link_grid path that is merely path-shaped", () => {
  // /vector-podcast passes the regex and dead-ends on the 404 route. isLinkablePath
  // (validation.mjs) is what catches it, and it is the same predicate navigate_to
  // enforces, so the two link surfaces cannot drift.
  const block = {
    type: "link_grid",
    links: [
      { label: "Podcast", path: "/vector-podcast", blurb: "not a real route" },
      { label: "Blog", path: "/blog", blurb: "posts" },
    ],
  };
  assert.equal(UiBlockSchema.safeParse(block).success, false);
});

test("UiBlockSchema rejects a link_grid pointing at the Cognito-gated /admin", () => {
  const block = {
    type: "link_grid",
    links: [
      { label: "Admin", path: "/admin", blurb: "console" },
      { label: "Blog", path: "/blog", blurb: "posts" },
    ],
  };
  assert.equal(UiBlockSchema.safeParse(block).success, false);
});

test("UiBlockSchema accepts a link_grid with a real blog slug", () => {
  const block = {
    type: "link_grid",
    links: [
      { label: "A post", path: "/blog/some-post", blurb: "a real slug" },
      { label: "Blog", path: "/blog", blurb: "posts" },
    ],
  };
  assert.equal(UiBlockSchema.safeParse(block).success, true);
});

test("UiBlockSchema rejects a profile_mini ctaPath of /admin", () => {
  // Second path-carrying field in the vocabulary; it must share the link policy
  // rather than only the regex.
  const block = {
    type: "profile_mini",
    name: "Christian Perez",
    role: "Founder & CEO, Altivum Inc.",
    blurb: "Former Green Beret turned applied AI engineer, building at Altivum.",
    ctaPath: "/admin",
  };
  assert.equal(UiBlockSchema.safeParse(block).success, false);
  assert.equal(UiBlockSchema.safeParse({ ...block, ctaPath: "/about" }).success, true);
});

test("UiBlockSchema enforces stat_row min/max counts", () => {
  assert.equal(
    UiBlockSchema.safeParse({ type: "stat_row", stats: [{ value: "9", label: "Episodes" }] }).success,
    false,
  );
});

// ── Tool callback behavior ──

test("render_ui emits one ui_block event per block and returns rendered types", async () => {
  const stream = fakeStream();
  const metrics = fakeMetrics();
  const tool = buildRenderUiTool({ responseStream: stream, metrics, requestId: "req-1" });

  const res = await tool.invoke({ blocks: [validTimeline, validComparison] });

  assert.equal(res.ok, true);
  assert.deepEqual(res.rendered, ["timeline", "comparison"]);

  const events = parseEvents(stream);
  assert.equal(events.length, 2);
  assert.equal(events[0].kind, "ui_block");
  assert.equal(events[0].block.type, "timeline");
  assert.equal(events[1].block.type, "comparison");

  const names = metrics.records.map((r) => r.name);
  assert.ok(names.includes("ToolCall_RenderUi"));
  assert.ok(names.includes("RenderUiBlocks"));
});

test("render_ui has the expected tool name", () => {
  const tool = buildRenderUiTool({ responseStream: fakeStream(), metrics: fakeMetrics() });
  assert.equal(tool.name, "render_ui");
});
