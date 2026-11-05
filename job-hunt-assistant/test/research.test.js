import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jha-"));
process.env.JHA_DATA_DIR = tmp;
delete process.env.ANTHROPIC_API_KEY;
const { collectSignals, companyDomain, parseFeed, ruleIdeas } = await import("../src/research.js");
const { IdeaDraft, generateIdea } = await import("../src/ideas.js");
const { loadProfile } = await import("../src/config.js");
const profile = loadProfile();

const SITE = {
  "https://ledgerly.co": `<html><head><meta name="description" content="Payments and cash flow for SMBs"><link rel="alternate" type="application/rss+xml" href="/blog/feed.xml"></head>
    <body><a href="/blog">Blog</a><a href="/changelog">Changelog</a><a href="/careers">Careers</a><a href="https://twitter.com/x">t</a></body></html>`,
  "https://ledgerly.co/blog/feed.xml": `<rss><channel><item><title>Ledgerly expands to the UK</title><link>https://ledgerly.co/blog/uk</link><pubDate>Mon, 02 Nov 2026</pubDate></item>
    <item><title><![CDATA[Introducing instant payouts]]></title><link>https://ledgerly.co/blog/payouts</link></item></channel></rss>`,
  "https://ledgerly.co/changelog": `<h2>New: Xero integration for invoices</h2><h2>Faster onboarding for multi-entity accounts</h2>`,
  "https://ledgerly.co/careers": `<li>Account Executive, UK</li><li>Sales Development Representative</li><li>Customer Success Manager</li>`,
};
function mockFetch() {
  return async (url) => {
    if (url.startsWith("https://hn.algolia.com")) return { ok: true, url, headers: { get: () => "application/json" }, text: async () => JSON.stringify({ hits: [{ title: "Ledgerly (YC W25) is hiring", points: 40, objectID: "42", created_at: "2026-10-01" }] }) };
    const body = SITE[url.replace(/\/$/, "")];
    return body ? { ok: true, url, headers: { get: () => "text/html" }, text: async () => body } : { ok: false, status: 404, headers: { get: () => "" }, text: async () => "" };
  };
}

test("company domain comes from the posting, email or name, never from a job board", () => {
  assert.equal(companyDomain({ company: "Bree", url: "https://builtin.com/job/x" }), "bree.com");
  assert.equal(companyDomain({ company: "X", email: "sam@ledgerly.co" }), "ledgerly.co");
  assert.equal(companyDomain({ company: "Withe", url: "https://withe.co/jobs/gtm" }), "withe.co");
  assert.equal(parseFeed(`<feed><entry><title>Hi</title><link href="https://a.b/c"/><updated>2026</updated></entry></feed>`)[0].link, "https://a.b/c");
});

test("code gathers feeds, changelog, careers and HN; rules turn them into a valid idea without AI", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = mockFetch();
  try {
    const rec = { company: "Ledgerly", email: "sam@ledgerly.co", title: "Founding GTM", category: "fintech" };
    const { domain, signals } = await collectSignals(rec);
    assert.equal(domain, "ledgerly.co");
    const types = signals.map((s) => s.type);
    for (const t of ["blog", "changelog", "jobs", "news", "other"]) assert.ok(types.includes(t), `has ${t}: ${types}`);
    assert.ok(signals.some((s) => /Introducing instant payouts/.test(s.finding)));
    assert.ok(signals.some((s) => /Account Executive, UK/.test(s.finding)));

    const idea = ruleIdeas(profile, rec, signals);
    assert.ok(IdeaDraft.safeParse(idea).success, "same shape as Claude's output");
    assert.equal(idea.ideas.length, 3);
    assert.match(idea.bestIdea, /target account list/i, "hiring AEs/SDRs → sales play first");
    assert.match(idea.onePager, /\[source\]\(https:\/\/ledgerly\.co\/careers\)/);
    assert.match(idea.onePager, /Why me/);
    assert.equal(idea.by, "rules");

    const viaGenerate = await generateIdea(profile, rec, { rules: true });
    assert.equal(viaGenerate.by, "rules");
  } finally { globalThis.fetch = real; }
});

test("with Claude on, the gathered signals go into the prompt and Claude browses less; falls back to rules if Claude fails", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = mockFetch();
  const log = path.join(tmp, "args.json");
  const fake = path.join(tmp, "claude");
  fs.writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");let input="";process.stdin.on("data",d=>input+=d).on("end",()=>{fs.writeFileSync(${JSON.stringify(log)},JSON.stringify({args:process.argv.slice(2),input}));process.exit(1);});`);
  fs.chmodSync(fake, 0o755);
  process.env.JHA_CLAUDE_BIN = fake;
  try {
    const idea = await generateIdea({ ...profile, ai: "claude-code" }, { company: "Ledgerly", email: "sam@ledgerly.co" });
    const { input, args } = JSON.parse(fs.readFileSync(log, "utf8"));
    assert.match(input, /Signals already gathered by code/);
    assert.match(input, /Introducing instant payouts/);
    assert.match(input, /at most 4 lookups/);
    assert.ok(args.includes("WebSearch,WebFetch"));
    assert.equal(idea.by, "rules", "Claude failed, so rules filled in");
    await generateIdea({ ...profile, ai: "claude-code" }, { company: "Ledgerly", email: "sam@ledgerly.co" }, { fast: true });
    assert.equal(JSON.parse(fs.readFileSync(log, "utf8")).args[JSON.parse(fs.readFileSync(log, "utf8")).args.indexOf("--tools") + 1], "", "--fast: no browsing");
  } finally { globalThis.fetch = real; delete process.env.JHA_CLAUDE_BIN; }
});
