// Shared operations used by both the CLI and the dashboard server.
import * as db from "./db.js";
import { fetchAll } from "./jobs/sources.js";
import { scoreJob } from "./jobs/score.js";
import { draftApplication, draftOutreach } from "./ai.js";

export async function discover(profile, targets, { log = console.log } = {}) {
  log(`Checking ${targets.companies.length} job boards…`);
  const all = await fetchAll(targets.companies, { onError: log });
  const minScore = targets.filters?.minScore ?? 50;
  const matches = [];
  for (const job of all) {
    const { score, reasons } = scoreJob(job, targets.filters || {});
    if (score >= minScore) matches.push({ ...job, matchScore: score, matchReasons: reasons });
  }
  const added = db.upsertJobs(matches);
  log(`Fetched ${all.length} postings, ${matches.length} match your filters, ${added} new.`);
  return { fetched: all.length, matched: matches.length, added };
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
