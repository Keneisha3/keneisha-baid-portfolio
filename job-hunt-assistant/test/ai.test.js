// Exercises the real Claude code path against a local mock of the Messages API.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

let lastReq;
const server = http.createServer(async (req, res) => {
  let raw = "";
  for await (const c of req) raw += c;
  lastReq = { headers: req.headers, body: JSON.parse(raw) };
  const out = { connectionNote: "Hi Ada, fellow Waterloo engineer here. Would love to connect!", followUp: "Coffee?", nudge: "Bumping this!", emailSubject: "Winter 2027 co-op", emailBody: "Hi Ada", emailFollowUp1: "f1", emailFollowUp2: "f2" };
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", stop_sequence: null,
    content: [{ type: "text", text: JSON.stringify(out) }], usage: { input_tokens: 1, output_tokens: 1 } }));
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
process.env.ANTHROPIC_API_KEY = "test";
delete process.env.JHA_NO_AI;
const { draftOutreach } = await import("../src/ai.js");
const { loadProfile } = await import("../src/config.js");

test("outreach draft goes through Claude with structured output + fallback", async () => {
  try {
    const d = await draftOutreach({ ...loadProfile(), ai: "api" }, { name: "Ada", title: "Analyst", company: "Acme" });
    assert.equal(d.by, "claude-opus-5-5");
    assert.match(d.connectionNote, /Waterloo/);
    assert.equal(lastReq.body.model, "claude-opus-5-5");
    assert.equal(lastReq.body.fallbacks, "default");
    assert.equal(lastReq.body.output_config.format.type, "json_schema");
    assert.match(lastReq.headers["anthropic-beta"], /server-side-fallback-2026-07-01/);
    assert.match(lastReq.body.messages[0].content, /Keneisha/);
  } finally {
    server.close();
  }
});
