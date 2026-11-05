import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.JHA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "jha-"));
process.env.JHA_NO_AI = "1";
const { parseJobPage, sourceFor } = await import("../src/jobs/import.js");
const sources = await import("../src/jobs/sources.js");
const { titlePasses, scoreJob } = await import("../src/jobs/score.js");
const { screeningAnswer, pickOption } = await import("../src/apply/autofill.js");
const { composeUrl } = await import("../src/outreach/email.js");
const { parseCsv } = await import("../src/csv.js");
const { loadTargets, loadProfile } = await import("../src/config.js");
const db = await import("../src/db.js");
const { todayPlan, draftMany } = await import("../src/commands.js");

const filters = loadTargets().filters;

test("filters: interns in her lanes pass; wrong level, wrong term, engineering roles don't", () => {
  for (const t of ["Intern, Project Management (Winter 2027)", "Sales Development Co-op", "Revenue Management Intern", "Investment Intern", "Consulting Analyst Intern", "Business Operations Intern"])
    assert.ok(titlePasses(t, filters), t);
  for (const t of ["Senior Financial Analyst", "Software Engineer Intern", "Aircraft Maintenance Technician", "Financial Analyst", "Intern, Finance (Summer 2027)"])
    assert.ok(!titlePasses(t, filters), t);
  const winter = scoreJob({ title: "Finance Intern", location: "Calgary, AB", description: "Winter 2027 term. Excel, SQL, forecasting." }, filters);
  const other = scoreJob({ title: "Finance Intern", location: "Calgary, AB", description: "Excel." }, filters);
  assert.ok(winter.score > other.score);
  assert.equal(scoreJob({ title: "Finance Intern", location: "Calgary", description: "x", closesAt: "2020-01-01" }, filters).score, 0);
});

test("job links: schema.org JobPosting is read from any career site", () => {
  const html = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization"},
    {"@type":"JobPosting","title":"Intern, Revenue Management (Winter 2027)","hiringOrganization":{"name":"Air Canada"},
     "jobLocation":[{"address":{"addressLocality":"Montréal","addressRegion":"QC","addressCountry":"CA"}}],
     "description":"&lt;p&gt;Use SQL &amp;amp; Python to price fares.&lt;/p&gt;","validThrough":"2099-01-01"}]}</script></head></html>`;
  const j = parseJobPage(html, "https://careers.aircanada.com/job/1");
  assert.equal(j.company, "Air Canada");
  assert.equal(j.location, "Montréal, QC, CA");
  assert.equal(j.description, "Use SQL & Python to price fares.");
  assert.equal(sourceFor("https://acme.wd3.myworkdayjobs.com/x"), "workday");
  assert.equal(parseJobPage("<title>Analyst Intern | Acme</title>", "u").title, "Analyst Intern | Acme");
});

test("Workday, SmartRecruiters and SuccessFactors feeds are normalised", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const json = (d) => ({ ok: true, json: async () => d, text: async () => d });
    if (url.includes("/wday/cxs/") && opts.method === "POST")
      return json({ total: 2, jobPostings: [{ title: "Finance Co-op", externalPath: "/job/Calgary/Finance-Co-op_R1", locationsText: "Calgary" }, { title: "Pilot", externalPath: "/job/x" }] });
    if (url.includes("/wday/cxs/")) return json({ jobPostingInfo: { jobDescription: "<p>Excel</p>", location: "Calgary, AB", jobReqId: "R1", externalUrl: "https://westjet.wd3.myworkdayjobs.com/WJ/job/R1" } });
    if (url.includes("smartrecruiters") && url.includes("offset")) return json({ totalFound: 1, content: [{ id: "9", name: "Sales Intern", location: { city: "Toronto", country: "ca" } }] });
    if (url.includes("smartrecruiters")) return json({ postingUrl: "https://jobs.smartrecruiters.com/x/9", jobAd: { sections: { jobDescription: { text: "<b>CRM</b>" } } } });
    if (url.includes("/services/rss/job/"))
      return json(`<rss><channel><item><title><![CDATA[Intern, Project Management (Winter 2027) (Mississauga, ON, CA)]]></title><link>https://jobs.bombardier.com/job/1</link><description>&lt;p&gt;PMO&lt;/p&gt;</description></item></channel></rss>`);
    throw new Error("unexpected " + url);
  };
  try {
    const ok = (t) => titlePasses(t, filters);
    const wd = await sources.workday({ name: "WestJet", host: "westjet.wd3.myworkdayjobs.com", tenant: "westjet", site: "WJ", category: "airlines" }, { titleOk: ok });
    assert.equal(wd.length, 1);
    assert.equal(wd[0].url, "https://westjet.wd3.myworkdayjobs.com/WJ/job/R1");
    assert.equal(wd[0].description, "Excel");
    assert.equal(wd[0].category, "airlines");
    const sr = await sources.smartrecruiters({ name: "X", board: "x" }, { titleOk: ok });
    assert.equal(sr[0].location, "Toronto, CA");
    assert.equal(sr[0].description, "CRM");
    const sf = await sources.successfactors({ name: "Bombardier", host: "jobs.bombardier.com" });
    assert.equal(sf[0].title, "Intern, Project Management (Winter 2027)");
    assert.equal(sf[0].location, "Mississauga, ON, CA");
    assert.equal(sf[0].description, "PMO");
  } finally { globalThis.fetch = real; }
});

test("screening answers: only what you've set, EEO only declined, US vs Canada kept apart", () => {
  const p = loadProfile();
  assert.equal(screeningAnswer("Are you legally eligible to work in Canada?", p), "Yes");
  assert.equal(screeningAnswer("Will you require visa sponsorship to work in Canada?", p), "No");
  assert.equal(screeningAnswer("Are you authorized to work in the United States?", p), "No");
  assert.equal(screeningAnswer("What is your gender?", p), "__decline__");
  assert.equal(screeningAnswer("What are your salary expectations?", p), "");
  assert.equal(pickOption(["Please select", "Yes", "No"], "Yes"), 1);
  assert.equal(pickOption(["Woman", "Man", "I don't wish to answer"], "__decline__"), 2);
});

test("email compose links and CSV contacts", () => {
  const u = new URL(composeUrl("outlook", "hi@stagekeep.com", "Winter 2027 co-op", "Hi team,\nThanks & bye"));
  assert.equal(u.searchParams.get("body"), "Hi team,\nThanks & bye");
  assert.match(composeUrl("gmail", "a@b.c", "s", "b"), /mail\.google\.com.*su=s/);
  const rows = parseCsv('Name,Company,Email,LinkedIn URL\n"Lee, Ana",StageKeep,ana@sk.com,\nBo,MRG,,https://linkedin.com/in/bo\n');
  assert.equal(rows[0].name, "Lee, Ana");
  assert.equal(rows[1].linkedinurl, "https://linkedin.com/in/bo");
});

test("daily plan counts today's applications, emails and invites separately", async () => {
  db.upsertJobs([{ source: "t", externalId: "1", company: "A", title: "Analyst Intern" }, { source: "t", externalId: "2", company: "B", title: "Sales Intern" }]);
  const [j1] = db.read().jobs;
  db.updateJob(j1.id, { status: "applied" });
  const e = db.addContact({ name: "StageKeep team", company: "StageKeep", email: "hi@stagekeep.com" });
  const l = db.addContact({ name: "Bo", linkedinUrl: "https://linkedin.com/in/bo" });
  await draftMany(loadProfile(), "contacts", [e.id], { log: () => {} });
  assert.ok(db.read().contacts.find((c) => c.id === e.id).draft.emailBody.includes("Winter 2027"));
  db.updateContact(e.id, { status: "sent", channel: "email" });
  db.updateContact(l.id, { status: "sent", channel: "linkedin" });
  const p = todayPlan(loadTargets());
  assert.equal(p.applied, 1);
  assert.equal(p.emails, 1);
  assert.equal(p.linkedin, 1);
  assert.equal(p.queue.toDraft, 1);
  assert.equal(p.goals.applicationsPerDay, 100);
});
