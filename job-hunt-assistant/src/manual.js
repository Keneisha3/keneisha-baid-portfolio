// Free drafting with the claude.ai chat (no API key, no subscription needed):
// build one prompt for several jobs/contacts, paste it into Claude, paste the
// JSON reply back. Same quality rules as the automatic engines.
import * as z from "zod/v4";
import * as db from "./db.js";
import { ApplicationDraft, OutreachDraft, OUTREACH_GUIDE, NOTE_LIMIT, profileBlurb, jobContext, contactContext, jsonSchemaOf } from "./ai.js";

const fieldsOf = (schema) =>
  Object.entries(jsonSchemaOf(schema).properties).map(([k, v]) => `  "${k}": ${v.type}: ${v.description || ""}`).join("\n");

export function buildPack(kind, items, profile) {
  const state = db.read();
  const isJobs = kind === "jobs";
  const schema = isJobs ? ApplicationDraft : OutreachDraft;
  const blocks = items.map((it) => {
    const job = !isJobs && it.jobId ? state.jobs.find((j) => j.id === it.jobId) : null;
    return `### id: ${it.id}\n${isJobs ? jobContext(it, 3500) : contactContext(profile, it, job)}`;
  });
  return `You're helping me (a student) write ${isJobs ? "job applications" : "cold outreach"}. Write in my voice: warm, specific, confident, never grovelling or generic. Only use facts from my profile below; never invent experience, numbers or connections. No "I hope this finds you well", no "passionate".

## About me
${profileBlurb(profile)}
${isJobs ? "" : `\n## Rules\n${OUTREACH_GUIDE}\n`}
## What to return
Reply with ONLY a JSON array (no commentary, no markdown), one object per item below, in this shape:
{
  "id": string: copy the item's id exactly,
${fieldsOf(schema)}
}

## Items (${items.length})
${blocks.join("\n\n")}
`;
}

/** Saves the JSON reply from claude.ai. Accepts code fences and stray text around the array. */
export function applyPack(text) {
  const start = text.indexOf("["), end = text.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error("couldn't find a JSON array in what you pasted");
  const arr = JSON.parse(text.slice(start, end + 1));
  const state = db.read();
  const saved = [], errors = [];
  for (const o of arr) {
    const job = state.jobs.find((j) => j.id === o.id);
    const contact = !job && state.contacts.find((c) => c.id === o.id);
    if (!job && !contact) { errors.push(`${o.id}: no job or contact with that id`); continue; }
    const parsed = (job ? ApplicationDraft : OutreachDraft).safeParse(o);
    if (!parsed.success) { errors.push(`${o.id}: ${z.prettifyError(parsed.error).split("\n")[0]}`); continue; }
    const draft = { ...parsed.data, by: "claude.ai", at: db.now() };
    if (contact && draft.connectionNote.length > NOTE_LIMIT) errors.push(`${o.id}: connection note is ${draft.connectionNote.length} chars, trim it before sending`);
    if (job) db.updateJob(job.id, { draft, status: job.status === "found" ? "drafted" : job.status });
    else db.updateContact(contact.id, { draft, status: contact.status === "to_contact" ? "drafted" : contact.status });
    saved.push(job ? `${job.company} · ${job.title}` : `${contact.name} (${contact.company || ""})`);
  }
  return { saved, errors };
}

export function nextForPack(kind, n = 8, filter = () => true) {
  const s = db.read();
  return kind === "jobs"
    ? s.jobs.filter((j) => j.status === "found" && !j.pitch && filter(j)).sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)).slice(0, n)
    : s.contacts.filter((c) => c.status === "to_contact" && filter(c)).slice(0, n);
}
