import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.JHA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "jha-"));
process.env.JHA_NO_AI = "1";
const db = await import("../src/db.js");
const { scoreJob } = await import("../src/jobs/score.js");
const sources = await import("../src/jobs/sources.js");
const { draftOutreach, draftApplication, NOTE_LIMIT } = await import("../src/ai.js");
const { createServer } = await import("../src/server.js");
const { loadProfile, loadTargets } = await import("../src/config.js");

const filters = loadTargets().filters;

test("scoring keeps junior analyst roles and drops senior / wrong-location ones", () => {
  const desc = "You'll use Python and SQL to build dashboards and automation for finance.";
  assert.ok(scoreJob({ title: "Data Analyst Intern", location: "Toronto, ON", description: desc }, filters).score >= filters.minScore);
  assert.equal(scoreJob({ title: "Senior Data Analyst", location: "Toronto", description: desc }, filters).score, 0);
  assert.equal(scoreJob({ title: "Data Analyst Intern", location: "Berlin", description: desc }, filters).score, 0);
  assert.equal(scoreJob({ title: "Account Executive", location: "Toronto", description: desc }, filters).score, 0);
});

test("job board responses are normalised", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => ({
    ok: true,
    json: async () =>
      url.includes("greenhouse")
        ? { jobs: [{ id: 1, title: "Business Analyst Intern", absolute_url: "https://x/1", location: { name: "Toronto" }, content: "&lt;p&gt;Python &amp;amp; SQL&lt;/p&gt;" }] }
        : url.includes("lever")
          ? [{ id: "a", text: "Data Co-op", hostedUrl: "https://jobs.lever.co/x/a", categories: { location: "Remote" }, descriptionPlain: "SQL" }]
          : { jobs: [{ id: "z", title: "Ops Analyst", location: "New York", jobUrl: "https://jobs.ashbyhq.com/x/z", descriptionPlain: "Excel" }] },
  });
  try {
    const jobs = await sources.fetchAll([
      { name: "G", ats: "greenhouse", board: "g" },
      { name: "L", ats: "lever", board: "l" },
      { name: "A", ats: "ashby", board: "a" },
    ]);
    assert.equal(jobs.length, 3);
    assert.equal(jobs[0].description, "Python & SQL");
    assert.equal(jobs[1].applyUrl, "https://jobs.lever.co/x/a/apply");
    assert.equal(jobs[2].company, "A");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("tracker: dedupe, status transitions set follow-ups, due list", () => {
  const job = { source: "greenhouse", externalId: "42", company: "Acme", title: "Analyst Intern", location: "Toronto" };
  assert.equal(db.upsertJobs([job, job]), 1);
  assert.equal(db.upsertJobs([job]), 0);
  const j = db.read().jobs[0];
  const applied = db.updateJob(j.id, { status: "applied" });
  assert.ok(applied.appliedAt && applied.followUpOn);
  assert.throws(() => db.updateJob(j.id, { status: "bogus" }));

  const c = db.addContact({ name: "Ada L", company: "Acme", linkedinUrl: "https://www.linkedin.com/in/ada/" });
  assert.equal(db.addContact({ name: "dupe", linkedinUrl: "https://www.linkedin.com/in/ada" }).id, c.id);
  db.updateContact(c.id, { status: "sent", followUpOn: "2000-01-01" });
  assert.equal(db.sentToday(), 1);
  assert.equal(db.dueFollowUps().contacts.length, 1);
  db.updateContact(c.id, { status: "chat_booked" });
  assert.equal(db.dueFollowUps().contacts.length, 0);
});

test("template drafts work offline and respect LinkedIn's note limit", async () => {
  const p = loadProfile();
  const o = await draftOutreach(p, { name: "Grace Hopper", title: "Principal Data Scientist, Payments Infrastructure", company: "A Very Long Company Name Incorporated" });
  assert.ok(o.connectionNote.length <= NOTE_LIMIT, o.connectionNote.length);
  assert.match(o.followUp, /Grace/);
  const a = await draftApplication(p, { company: "Acme", title: "Analyst" });
  assert.match(a.coverLetter, /Keneisha Baid/);
});

test("dashboard API", async () => {
  const server = createServer().listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (p, b) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  try {
    assert.equal((await fetch(base + "/")).status, 200);
    assert.equal((await post("/api/contacts", { name: "X", status: "hacked" })).status, 400);
    const added = await (await post("/api/contacts", { name: "Linus", company: "Acme" })).json();
    assert.equal(added.status, "to_contact");
    const drafted = await (await post(`/api/contacts/${added.id}/draft`, {})).json();
    assert.equal(drafted.status, "drafted");
    assert.ok(drafted.draft.connectionNote);
    assert.equal((await fetch(base + "/api/contacts", { method: "POST", body: "{}" })).status, 415);
    const state = await (await fetch(base + "/api/state")).json();
    assert.ok(state.stats.contacts.drafted >= 1);
    const links = await (await fetch(base + "/api/people?company=Stripe")).json();
    assert.ok(links.some((l) => l.url.includes("school/uwaterloo/people")));
  } finally {
    server.close();
  }
});

test("LaTeX resume is converted to readable text (last document wins)", async () => {
  const { latexToText } = await import("../src/resume.js");
  const tex = String.raw`\begin{document}OLD\end{document}
\begin{document}
\section{Skills}
\item\fontsize{9}{10.2}\selectfont{ \textbf{Languages:} Python, SQL \\ }
% a comment
\resumeOneLine{Pratt \& Whitney}{Intern}{Sep 2026 -- Dec 2026}
\resumeItem{Cut time \textbf{30\%} via \href{https://x}{\underline{a tool}} $|$ done}
\end{document}`;
  const out = latexToText(tex);
  assert.ok(!out.includes("OLD"));
  assert.match(out, /SKILLS\n+Languages: Python, SQL/);
  assert.match(out, /Pratt & Whitney, Intern \(Sep 2026 – Dec 2026\)/);
  assert.match(out, /- Cut time 30% via a tool \| done/);
  assert.ok(!/[\\{}]|comment/.test(out), out);
});
