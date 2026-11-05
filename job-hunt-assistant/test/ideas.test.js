import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jha-"));
process.env.JHA_DATA_DIR = tmp;
delete process.env.ANTHROPIC_API_KEY;
const db = await import("../src/db.js");
const ideas = await import("../src/ideas.js");
const ai = await import("../src/ai.js");
const { loadProfile } = await import("../src/config.js");
const profile = loadProfile();

const IDEA = {
  oneLiner: "Restaurant ordering middleware",
  signals: [{ type: "jobs", finding: "Hiring a Head of Mid Market sales", source: "https://example.org/job" }],
  problems: [{ problem: "Knowing which mid-market chains to call next", evidence: "New MM/SMB team" }],
  ideas: [
    { title: "Chain fit-score target list", kind: "sales/GTM play", pitch: "p", weekPlan: "w", metric: "m", impact: 4, feasibility: 4 },
    { title: "Menu accuracy audit", kind: "growth experiment", pitch: "p", weekPlan: "w", metric: "m", impact: 4, feasibility: 4 },
  ],
  bestIdea: "Chain fit-score target list",
  onePager: "# Chain fit-score target list for Acme\n\n## The problem\nThey're hiring a [Head of MM](https://example.org/job).\n\n## A one-week plan\n- **Day 1:** profile\n- Day 2: score\n\n*Built from public info.*",
  emailHook: "Saw you're building a mid-market team, so I scored 200 chains on fit.",
};

test("idea research runs through Claude Code with web tools and a schema, then saves a one-pager", async () => {
  const fake = path.join(tmp, "claude");
  const log = path.join(tmp, "args.json");
  fs.writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");let input="";process.stdin.on("data",d=>input+=d).on("end",()=>{
fs.writeFileSync(${JSON.stringify(log)},JSON.stringify({args:process.argv.slice(2),input}));
console.log(JSON.stringify({type:"result",is_error:false,result:"",structured_output:${JSON.stringify(IDEA)}}));});`);
  fs.chmodSync(fake, 0o755);
  process.env.JHA_CLAUDE_BIN = fake;
  try {
    const c = db.addContact({ name: "Acme team", company: "Acme", email: "hi@acme.com", companySize: "startup" });
    const idea = await ideas.generateIdea({ ...profile, ai: "claude-code" }, c);
    const { args, input } = JSON.parse(fs.readFileSync(log, "utf8"));
    assert.ok(args.includes("WebSearch,WebFetch"));
    assert.match(input, /changelog/);
    assert.match(input, /careers page/);
    const saved = ideas.saveIdea("contacts", c.id, idea);
    assert.ok(fs.readFileSync(saved.idea.file, "utf8").includes("research notes (not published)"));
    // Outreach now builds on the idea, with any model and with free templates.
    assert.match(ai.contactContext(profile, saved), /one-page proposal for them: "Chain fit-score target list"/);
    const t = await ai.draftOutreach(profile, saved, null, { engine: "template" });
    assert.match(t.emailBody, /I scored 200 chains on fit/);
    assert.match(t.emailBody, /one-page idea for Acme: Chain fit-score target list\. Happy to send it over/);
  } finally { delete process.env.JHA_CLAUDE_BIN; }
});

test("publishing writes an unlisted page into the portfolio and the email links it", async () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "site-"));
  const c = db.read().contacts.find((x) => x.company === "Acme");
  const r = ideas.publishIdea(profile, "contacts", c.id, { portfolioDir: site });
  const html = fs.readFileSync(r.file, "utf8");
  assert.match(r.url, /^https:\/\/keneisha-baid-portfolio\.vercel\.app\/pitches\/acme-[a-z0-9]+\.html$/);
  assert.match(html, /noindex/);
  assert.match(html, /<a href="https:\/\/example\.org\/job"/);
  assert.match(html, /<strong>Day 1:<\/strong>/);
  assert.ok(!html.includes("research notes"), "private notes aren't published");
  const after = db.read().contacts.find((x) => x.id === c.id);
  const t = await ai.draftOutreach(profile, after, null, { engine: "template" });
  assert.ok(t.emailBody.includes(r.url));
  assert.equal(ideas.publishIdea(profile, "contacts", c.id, { portfolioDir: site }).file, r.file, "republish keeps the same URL");
});

test("markdown renderer escapes HTML", () => {
  assert.equal(ideas.mdToHtml("<script>x</script>"), "<p>&lt;script&gt;x&lt;/script&gt;</p>");
});
