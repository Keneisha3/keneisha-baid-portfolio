import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

process.env.JHA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "jha-"));
const db = await import("../src/db.js");
const { importPipeline } = await import("../src/pipeline.js");
const { screeningAnswer } = await import("../src/apply/autofill.js");
const { loadProfile, loadTargets } = await import("../src/config.js");

test("the seed tracker imports with sizes, pitches, closed rows, and is idempotent", () => {
  const md = fs.readFileSync(new URL("../seed/winter-2027-pipeline.md", import.meta.url), "utf8");
  const r = importPipeline(md);
  assert.equal(r.added, 49); // 42 rows + 7 closed/skipped
  const jobs = db.read().jobs;
  const stage = jobs.find((j) => j.company === "StageKeep");
  assert.ok(stage.pitch);
  assert.equal(stage.companySize, "startup");
  assert.match(stage.title, /^Cold pitch/);
  const deliverect = jobs.find((j) => j.company === "Deliverect");
  assert.equal(deliverect.manualApply, false, "Lever link can be autofilled");
  assert.equal(jobs.find((j) => j.company === "Scotiabank").companySize, "large");
  assert.equal(jobs.find((j) => j.company === "EIC (Experience Internship Canada)").status, "skipped");
  const loop = jobs.find((j) => j.company === "Loop Financial");
  assert.equal(loop.status, "found");
  assert.ok(loop.pitch, "email still worth trying");
  db.updateJob(deliverect.id, { status: "applied" });
  assert.equal(importPipeline(md).added, 0);
  assert.equal(db.read().jobs.find((j) => j.id === deliverect.id).status, "applied", "re-import never undoes progress");
});

test("London: UK work questions use their own answers; targets carry region and size", () => {
  const p = loadProfile();
  assert.equal(screeningAnswer("Do you have the right to work in the UK?", p), "Yes");
  assert.equal(screeningAnswer("Will you require visa sponsorship to work in the United Kingdom?", p), "No");
  assert.equal(screeningAnswer("Are you legally authorized to work in Canada?", p), "Yes");
  const t = loadTargets();
  assert.ok(t.companies.filter((c) => c.region === "uk").length >= 40);
  assert.ok(t.companies.every((c) => ["startup", "large"].includes(c.size)));
});

test("research uses Claude web search; outreach drafts carry a 3-email sequence", async () => {
  const reqs = [];
  const server = http.createServer(async (req, res) => {
    let raw = ""; for await (const c of req) raw += c;
    const body = JSON.parse(raw); reqs.push(body);
    const text = body.tools ? "- Launched Bree Credit in Ontario (bree.com)\n- ~30 employees; founders decide (ycombinator.com)"
      : JSON.stringify({ connectionNote: "Hi", followUp: "f", nudge: "n", emailSubject: "Bree Credit ops", emailBody: "b", emailFollowUp1: "f1", emailFollowUp2: "f2" });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", stop_sequence: null, content: [{ type: "text", text }], usage: { input_tokens: 1, output_tokens: 1 } }));
  }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.ANTHROPIC_API_KEY = "test";
  try {
    const { researchMany, draftContact } = await import("../src/commands.js");
    const c = db.addContact({ name: "Bree team", company: "Bree", email: "founders@bree.com", companySize: "startup" });
    await researchMany([c.id], { log: () => {}, profile: { ...loadProfile(), ai: "api" } });
    assert.equal(reqs[0].tools[0].type, "web_search_20260209");
    const d = await draftContact({ ...loadProfile(), ai: "api" }, c.id);
    assert.equal(d.draft.emailFollowUp2, "f2");
    assert.match(reqs[1].messages[0].content, /Launched Bree Credit/);
    assert.match(reqs[1].messages[0].content, /VALUE-FIRST/);
    assert.match(reqs[1].messages[0].content, /Company size: startup/);
  } finally { server.close(); }
});
