// Thin wrapper around the Anthropic SDK used by every pipeline stage.
// Falls back to "demo mode" (canned output) when no credentials are configured.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

export const MODEL = process.env.STUDIO_MODEL || "claude-opus-5-5";

// Server-side refusal fallback: if the model declines, the API re-runs the
// request on a recommended fallback model inside the same call.
const BETAS = ["server-side-fallback-2026-07-01"];

let client = null;
export function isLive() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

function textOf(message) {
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function sourcesOf(message) {
  const out = [];
  for (const block of message.content) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content) {
        if (r.type === "web_search_result") out.push({ title: r.title, url: r.url });
      }
    }
  }
  // de-dupe by url
  return [...new Map(out.map((s) => [s.url, s])).values()];
}

function checkStop(message) {
  if (message.stop_reason === "refusal") {
    throw new Error("The model declined this request" +
      (message.stop_details?.explanation ? `: ${message.stop_details.explanation}` : "."));
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("The model ran out of output space; try a smaller request.");
  }
}

/**
 * Research a question on the live web. Returns { notes, sources }.
 */
export async function research(system, prompt, { maxSearches = 8, effort = "high" } = {}) {
  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: maxSearches }];
  const messages = [{ role: "user", content: prompt }];
  let message;
  // Server-side tool loops can pause; resume up to a few times.
  for (let i = 0; i < 5; i++) {
    message = await getClient()
      .beta.messages.stream({
        model: MODEL,
        max_tokens: 64000,
        betas: BETAS,
        fallbacks: "default",
        output_config: { effort },
        system,
        tools,
        messages,
      })
      .finalMessage();
    if (message.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: message.content });
  }
  checkStop(message);
  return { notes: textOf(message), sources: sourcesOf(message) };
}

/**
 * Ask for JSON matching a zod schema. Streams so large outputs (e.g. whole
 * app source files) don't hit HTTP timeouts, then validates locally.
 */
export async function structured(system, prompt, schema, { effort = "high", maxTokens = 64000 } = {}) {
  const message = await getClient()
    .beta.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      betas: BETAS,
      fallbacks: "default",
      output_config: { effort, format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: prompt }],
    })
    .finalMessage();
  checkStop(message);
  return schema.parse(JSON.parse(textOf(message)));
}
