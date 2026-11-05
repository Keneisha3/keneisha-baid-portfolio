// Shared operations used by both the CLI and the dashboard server.
import * as db from "./db.js";
import { fetchAll, mapLimit } from "./jobs/sources.js";
import { scoreJob, titlePasses } from "./jobs/score.js";
import { importJobUrl } from "./jobs/import.js";
import { draftApplication, draftOutreach } from "./ai.js";

export async function discover(profile, targets, { log = console.log, category } = {}) {
  const companies = targets.companies.filter((c) => !category || c.category === category);
  const feeds = companies.filter((c) => c.ats !== "careers" && !c.disabled);
  log(`Checking ${feeds.length} job feeds…`);
  const filters = targets.filters || {};
  const { jobs, failures } = await fetchAll(companies, { onError: log, titleOk: (t) => titlePasses(t, filters) });
  const matches = scoreAll(jobs, filters);
  const added = db.upsertJobs(matches);
  log(`Fetched ${jobs.length} postings, ${matches.length} match your filters, ${added} new.`);
  if (failures.length) log(`${failures.length} feed(s) failed. Run check-targets to see which addresses to fix or disable.`);
  return { fetched: jobs.length, matched: matches.length, added, failed: failures.length };
}

function scoreAll(jobs, filters) {
  const minScore = filters.minScore ?? 45;
  const out = [];
  for (const job of jobs) {
    const { score, reasons } = scoreJob(job, filters);
    if (score >= minScore) out.push({ ...job, matchScore: score, matchReasons: reasons });
  }
  return out;
}

/** Imports job links (any career site). Links you paste are kept even if they miss your filters. */
export async function importLinks(urls, targets, { log = console.log } = {}) {
  const clean = [...new Set(urls.map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u)))];
  const results = await mapLimit(clean, 4, async (url) => {
    try {
      const job = await importJobUrl(url);
      const { score, reasons } = scoreJob(job, { ...targets.filters, titleRequire: [], titleInclude: [], locations: [] });
      return { ok: true, job: { ...job, title: job.title || url, company: job.company || new URL(url).hostname, matchScore: score || null, matchReasons: reasons } };
    } catch (e) {
      return { ok: false, url, error: e.message };
    }
  });
  const ok = results.filter((r) => r.ok).map((r) => r.job);
  const added = db.upsertJobs(ok);
  for (const r of results) log(r.ok ? `  + ${r.job.company} · ${r.job.title}` : `  ! ${r.url}: ${r.error}`);
  return { added, read: ok.length, failed: results.filter((r) => !r.ok).map(({ url, error }) => ({ url, error })) };
}

export async function draftJob(profile, jobId) {
  const job = db.read().jobs.find((j) => j.id === jobId);
  if (!job) throw new Error(`No job ${jobId}`);
  const draft = await draftApplication(profile, job);
  return db.updateJob(jobId, { draft, status: job.status === "found" ? "drafted" : job.status });
}

export async function draftContact(profile, contactId) {
  const state = db.read();
  const contact = state.contacts.find((c) => c.id === contactId);
  if (!contact) throw new Error(`No contact ${contactId}`);
  const job = contact.jobId ? state.jobs.find((j) => j.id === contact.jobId) : null;
  const draft = await draftOutreach(profile, contact, job);
  return db.updateContact(contactId, { draft, status: contact.status === "to_contact" ? "drafted" : contact.status });
}

/** Drafts many at once (Claude calls in parallel). */
export async function draftMany(profile, kind, ids, { concurrency = 4, log = console.log } = {}) {
  let done = 0;
  return mapLimit(ids, concurrency, async (id) => {
    const r = await (kind === "jobs" ? draftJob(profile, id) : draftContact(profile, id)).catch((e) => ({ error: e.message, id }));
    log(`  [${++done}/${ids.length}] ${r.error ? `! ${r.id}: ${r.error}` : kind === "jobs" ? `${r.company} · ${r.title}` : `${r.name} (${r.company || ""})`}`);
    return r;
  });
}

/** Today's numbers against your daily goals. */
export function todayPlan(targets, state = db.read()) {
  const g = targets.goals || {};
  const s = db.stats(state);
  return {
    goals: g,
    applied: s.appliedToday, emails: s.emailsToday, linkedin: s.sentToday, linkedinWeek: s.linkedinThisWeek,
    queue: {
      toDraft: state.jobs.filter((j) => j.status === "found").length,
      readyToApply: state.jobs.filter((j) => j.status === "drafted").length,
      emailReady: state.contacts.filter((c) => c.email && ["to_contact", "drafted"].includes(c.status)).length,
      linkedinReady: state.contacts.filter((c) => c.linkedinUrl && ["to_contact", "drafted"].includes(c.status)).length,
    },
    due: db.dueFollowUps(state),
  };
}
