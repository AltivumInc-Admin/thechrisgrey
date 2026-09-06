import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import { BLOG_CITE_QUERY, SITE_ORIGIN } from "lambda-shared/sanityQueries";
import { emitEvent, EVENT_KINDS } from "../events.mjs";
import { createLogger } from "lambda-shared/logger";
import { recordToolFailure } from "./toolMetrics.mjs";

const _tool = /** @type {any} */ (tool);

/** @param {{ sanityClient: any, responseStream: any, metrics: any, requestId: string }} deps */
export function buildCitePassageTool({ sanityClient, responseStream, metrics, requestId }) {
  const log = createLogger(requestId, { service: "chat-stream" });
  return _tool({
    name: "cite_blog_passage",
    description:
      "Retrieve a short citation for a specific blog post so the reply can include an authoritative reference with a link. " +
      "Use when the visitor asks about a topic covered in a specific blog post that you can identify by slug. " +
      "Returns the post title, excerpt, and canonical URL.",
    inputSchema: z.object({
      slug: z
        .string()
        .regex(/^[a-z0-9][a-z0-9-]*$/, "Slug must be lowercase alphanumeric with hyphens")
        .min(1)
        .max(120)
        .describe("The blog post slug, e.g. 'building-agentic-alti'"),
    }),
    callback: async (/** @type {{ slug: string }} */ { slug }) => {
      // ToolCall_ counts ATTEMPTS, matching navigate/draft_*. Recording it after
      // the fetch resolved meant a failed call emitted ToolFailure_ and no
      // ToolCall_, so any failure-rate ratio over this namespace was wrong.
      metrics?.record("ToolCall_CitePassage");
      const startedAt = Date.now();
      try {
        const post = await sanityClient.fetch(BLOG_CITE_QUERY, { slug });
        metrics?.record("ToolLatency_CitePassage", Date.now() - startedAt, "Milliseconds");

        if (!post) {
          return { ok: false, error: `No blog post found for slug '${slug}'.` };
        }

        const url = `${SITE_ORIGIN}/blog/${post.slug}`;
        emitEvent(responseStream, {
          kind: EVENT_KINDS.DRAFT_ACTION,
          action: "citation",
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt || "",
          url,
        });

        return {
          ok: true,
          title: post.title,
          excerpt: post.excerpt || "",
          url,
          slug: post.slug,
        };
      } catch (error) {
        recordToolFailure(metrics, "CitePassage");
        log.error("tool_error", {
          tool: "cite_blog_passage",
          error: error instanceof Error ? error.name : String(error),
          message: error instanceof Error ? error.message : "",
        });
        return { ok: false, error: "Unable to fetch citation right now." };
      }
    },
  });
}
