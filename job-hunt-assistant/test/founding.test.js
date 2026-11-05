import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.JHA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "jha-"));
process.env.JHA_NO_AI = "1";
const db = await import("../src/db.js");
const { titlePasses, laneOf } = await import("../src/jobs/score.js");
const { loadTargets, loadProfile } = await import("../src/config.js");
const { discover } = await import("../src/commands.js");
const ai = await import("../src/ai.js");
const targets = loadTargets();
const f = targets.filters;

test("founding roles pass without 'intern'; senior ones and normal SWE roles still don't", () => {
  for (const t of ["Founding Engineer", "Founding GTM", "Founder's Associate", "Chief of Staff", "Founding Account Executive", "Chief of Staff Intern"])
    assert.ok(titlePasses(t, f), t);
  for (const t of ["Senior Founding Engineer", "Founding Engineer, Lead", "Software Engineer", "Staff Engineer"])
    assert.ok(!titlePasses(t, f), t);
  assert.equal(laneOf({ title: "Founding GTM" }), "founding");
  assert.ok(titlePasses("Global Markets Sales Off-Cycle Intern", f), "London bank sales counts");
});

test("HN Who is hiring: founder posts become jobs, and their emails become outreach contacts", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => ({ ok: true, json: async () => url.includes("search_by_date")
    ? { hits: [{ objectID: "900", title: "Ask HN: Who is hiring? (November 2026)" }] }
    : { children: [
      { id: 1, created_at: "2026-11-02", text: "Ledgerly | Founding GTM | London | ONSITE<p>Fintech for SMBs, 5 people. Email sam [at] ledgerly [dot] co" },
      { id: 2, created_at: "2026-11-02", text: "BigCo | Senior Staff Engineer | Remote<p>Email jobs@bigco.com" },
      { id: 3, created_at: "2026-11-02", text: "Kite | Software Engineering Intern (Winter 2027) | Toronto | Hybrid<p>Apply https://kite.dev/jobs" },
      { id: 4, created_at: "2026-11-02", text: "Rando | Founding Engineer | Berlin<p>x" },
    ] } });
  try {
    const r = await discover(loadProfile(), { ...targets, companies: [{ name: "HN", ats: "hn", category: "founding", size: "startup" }] }, { log: () => {} });
    const jobs = db.read().jobs;
    const ledgerly = jobs.find((j) => j.company === "Ledgerly");
    assert.ok(ledgerly, "London founding GTM kept");
    assert.equal(ledgerly.region, "uk");
    assert.ok(ledgerly.priority);
    assert.ok(!jobs.some((j) => j.company === "BigCo"), "senior dropped");
    assert.ok(!jobs.some((j) => j.company === "Rando"), "Berlin isn't a target location");
    const c = db.read().contacts.find((x) => x.company === "Ledgerly");
    assert.equal(c.email, "sam@ledgerly.co");
    assert.equal(c.jobId, ledgerly.id);
    assert.ok(r.added >= 1);
  } finally { globalThis.fetch = real; }
});

test("founding pitch: angle + email that offers a small build and a trial-to-full-time ask", async () => {
  const p = loadProfile();
  assert.match(ai.angleFor(p, "Founding GTM"), /build the thing and help sell it/);
  assert.match(ai.angleFor(p, "Founding Engineer"), /build the thing/);
  assert.match(ai.OUTREACH_GUIDE, /FOUNDING roles/);
});
