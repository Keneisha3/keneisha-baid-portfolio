// The no-API-key paths: Claude Code (subscription), claude.ai copy-paste, and templates.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jha-"));
process.env.JHA_DATA_DIR = tmp;
delete process.env.ANTHROPIC_API_KEY;
const db = await import("../src/db.js");
const ai = await import("../src/ai.js");
const { buildPack, applyPack } = await import("../src/manual.js");
const { loadProfile } = await import("../src/config.js");
const profile = loadProfile();

test("auto engine is free templates when there's no API key", () => {
  assert.equal(ai.engineFor({ ai: "auto" }), "template");
  assert.equal(ai.engineFor({ ai: "claude-code" }), "claude-code");
});

test("claude-code engine: runs `claude -p` with the JSON schema and reads structured_output", async () => {
  const fake = path.join(tmp, "claude");
  const log = path.join(tmp, "args.json");
  fs.writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");let input="";process.stdin.on("data",d=>input+=d).on("end",()=>{
fs.writeFileSync(${JSON.stringify(log)},JSON.stringify({args:process.argv.slice(2),input}));
const schema=JSON.parse(process.argv[process.argv.indexOf("--json-schema")+1]);
const out=Object.fromEntries(Object.entries(schema.properties).map(([k,v])=>[k,v.type==="number"?80:k+" text"]));
console.log(JSON.stringify({type:"result",is_error:false,result:"",structured_output:out}));});`);
  fs.chmodSync(fake, 0o755);
  process.env.JHA_CLAUDE_BIN = fake;
  try {
    const d = await ai.draftApplication({ ...profile, ai: "claude-code" }, { company: "Porter Airlines", title: "FP&A Co-op", description: "Forecasting" });
    assert.equal(d.by, "claude-code");
    assert.equal(d.coverLetter, "coverLetter text");
    const { args, input } = JSON.parse(fs.readFileSync(log, "utf8"));
    assert.deepEqual(args.slice(0, 2), ["-p", "--output-format"]);
    assert.ok(args.includes("--no-session-persistence"));
    assert.match(input, /Porter Airlines/);
    assert.match(input, /Keneisha Baid/);
  } finally { delete process.env.JHA_CLAUDE_BIN; }
});

test("claude.ai prompt pack round-trips: build → reply → saved drafts", () => {
  db.upsertJobs([{ source: "t", externalId: "a", company: "WestJet", title: "Network Planning Co-op", description: "Analyze routes" }]);
  const c = db.addContact({ name: "Ana Lee", company: "StageKeep", email: "ana@stagekeep.com", companySize: "startup" });
  const job = db.read().jobs[0];
  const packJobs = buildPack("jobs", [job], profile);
  assert.match(packJobs, new RegExp(`id: ${job.id}`));
  assert.match(packJobs, /"coverLetter": string/);
  assert.match(buildPack("contacts", [c], profile), /VALUE-FIRST/);
  const reply = "Here you go:\n```json\n" + JSON.stringify([
    { id: job.id, fitScore: 70, fitSummary: "ok", coverLetter: "Dear WestJet", whyCompany: "w", whyRole: "r" },
    { id: c.id, connectionNote: "Hi Ana", followUp: "f", nudge: "n", emailSubject: "s", emailBody: "b", emailFollowUp1: "1", emailFollowUp2: "2" },
    { id: "nope", coverLetter: "x" },
  ]) + "\n```";
  const r = applyPack(reply);
  assert.equal(r.saved.length, 2);
  assert.equal(r.errors.length, 1);
  const s = db.read();
  assert.equal(s.jobs[0].status, "drafted");
  assert.equal(s.jobs[0].draft.by, "claude.ai");
  assert.equal(s.contacts.find((x) => x.id === c.id).draft.emailFollowUp2, "2");
});

test("free templates pick the right angle and the most relevant highlights", async () => {
  assert.match(ai.angleFor(profile, "Intern, Revenue Management", "airlines"), /aerospace/);
  assert.match(ai.angleFor(profile, "Sales Development Co-op"), /front line/);
  assert.match(ai.angleFor(profile, "Investment Intern", "fintech"), /earnings forecast/);
  assert.match(ai.rankHighlights(profile, "SEC filings revenue forecast earnings")[0], /earnings forecast/);
  const d = await ai.draftApplication(profile, { company: "Bombardier", title: "Intern, Project Management (Winter 2027)", description: "- Track project risks and coordinate action owners across programs" }, { engine: "template" });
  assert.match(d.coverLetter, /Operations Program Management Intern/);
  assert.match(d.coverLetter, /"track project risks and coordinate action owners across programs"/);
  assert.match(d.coverLetter, /4 months starting January 2027/);
  assert.ok(!/undefined|\$\{/.test(d.coverLetter));
});

test("LinkedIn jobs: searches filter to internships posted this week; links normalise", async () => {
  const li = await import("../src/outreach/linkedin.js");
  const [first] = li.jobSearchLinks(["finance intern"], ["London, England, United Kingdom"]);
  assert.match(first.url, /f_E=1/);
  assert.match(first.url, /f_TPR=r604800/);
  assert.ok(li.isLinkedInJob("https://www.linkedin.com/jobs/search/?currentJobId=4012345678&keywords=x"));
  assert.equal(li.linkedInJobUrl("https://www.linkedin.com/jobs/view/finance-intern-at-acme-4012345678?trk=x"), "https://www.linkedin.com/jobs/view/4012345678/");
  assert.equal(li.linkedInJobUrl("https://www.linkedin.com/jobs/search/?currentJobId=4012345678"), "https://www.linkedin.com/jobs/view/4012345678/");
});

test("Claude Pro: many jobs are drafted 8 per request, with template fallback for gaps", async () => {
  const fake = path.join(tmp, "claude-batch");
  const calls = path.join(tmp, "calls.txt");
  fs.writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");let input="";process.stdin.on("data",d=>input+=d).on("end",()=>{
fs.appendFileSync(${JSON.stringify(calls)},"x");
const ids=[...input.matchAll(/### id: (\\w+)/g)].map(m=>m[1]);
const items=ids.slice(0, ids.length-1).map(id=>({id,fitScore:75,fitSummary:"s",coverLetter:"Dear team from batch",whyCompany:"w",whyRole:"r"}));
console.log(JSON.stringify({type:"result",is_error:false,result:"",structured_output:{items}}));});`);
  fs.chmodSync(fake, 0o755);
  process.env.JHA_CLAUDE_BIN = fake;
  try {
    const { draftMany } = await import("../src/commands.js");
    db.upsertJobs(Array.from({ length: 10 }, (_, i) => ({ source: "b", externalId: String(i), company: `Co${i}`, title: "Analyst Intern", description: "Excel" })));
    const ids = db.read().jobs.filter((j) => j.source === "b").map((j) => j.id);
    await draftMany({ ...profile, ai: "claude-code" }, "jobs", ids, { log: () => {} });
    assert.equal(fs.readFileSync(calls, "utf8").length, 2, "10 jobs → 2 requests");
    const drafted = db.read().jobs.filter((j) => j.source === "b");
    assert.equal(drafted.filter((j) => j.draft?.by === "claude-code").length, 8);
    assert.equal(drafted.filter((j) => j.draft?.by === "template").length, 2, "the one missing from each batch falls back");
  } finally { delete process.env.JHA_CLAUDE_BIN; }
});

test("check-links moves closed postings to skipped and leaves live ones", async () => {
  const { checkLinks } = await import("../src/commands.js");
  db.upsertJobs([
    { source: "c", externalId: "live", company: "Live", title: "Intern", url: "https://x.test/live" },
    { source: "c", externalId: "gone", company: "Gone", title: "Intern", url: "https://x.test/gone" },
    { source: "c", externalId: "filled", company: "Filled", title: "Intern", url: "https://x.test/filled" },
  ]);
  const real = globalThis.fetch;
  globalThis.fetch = async (u) => ({ ok: !u.endsWith("gone"), status: u.endsWith("gone") ? 404 : 200,
    text: async () => (u.endsWith("filled") ? "<p>Sorry, this job is no longer accepting applications.</p>" : "<p>Apply now</p>") });
  try {
    const r = await checkLinks({ log: () => {} });
    const by = Object.fromEntries(db.read().jobs.filter((j) => j.source === "c").map((j) => [j.company, j.status]));
    assert.deepEqual(by, { Live: "found", Gone: "skipped", Filled: "skipped" });
    assert.ok(r.closed >= 2);
  } finally { globalThis.fetch = real; }
});
