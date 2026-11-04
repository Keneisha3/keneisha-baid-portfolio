// Tiny JSON-file store. One file, human-readable, easy to back up or edit by hand.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DATA_DIR } from "./paths.js";

const FILE = () => path.join(DATA_DIR, "tracker.json");

export const APP_STATUSES = ["found", "drafted", "applied", "interviewing", "offer", "rejected", "skipped"];
export const CONTACT_STATUSES = ["to_contact", "drafted", "sent", "accepted", "replied", "chat_booked", "chat_done", "no_response"];

const empty = () => ({ jobs: [], contacts: [], log: [] });

export function read() {
  try {
    return { ...empty(), ...JSON.parse(fs.readFileSync(FILE(), "utf8")) };
  } catch (e) {
    if (e.code === "ENOENT") return empty();
    throw e;
  }
}

export function write(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE() + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE());
}

export const id = () => crypto.randomBytes(5).toString("hex");
export const now = () => new Date().toISOString();

export function addDays(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function logEvent(db, kind, refId, message) {
  db.log.unshift({ at: now(), kind, refId, message });
  db.log = db.log.slice(0, 500);
}

/** Insert jobs, skipping ones we've already seen (by source+externalId). Returns count added. */
export function upsertJobs(jobs) {
  const db = read();
  const seen = new Set(db.jobs.map((j) => `${j.source}:${j.externalId}`));
  let added = 0;
  for (const j of jobs) {
    const key = `${j.source}:${j.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    db.jobs.push({ id: id(), status: "found", createdAt: now(), updatedAt: now(), notes: "", ...j });
    added++;
  }
  if (added) logEvent(db, "jobs", null, `Discovered ${added} new job(s)`);
  write(db);
  return added;
}

export function updateJob(jobId, patch) {
  const db = read();
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) throw new Error(`No job with id ${jobId}`);
  if (patch.status && !APP_STATUSES.includes(patch.status)) throw new Error(`Unknown job status "${patch.status}"`);
  if (patch.status && patch.status !== job.status) {
    if (patch.status === "applied" && !job.appliedAt) {
      patch.appliedAt = now();
      patch.followUpOn ??= addDays(now(), 7);
    }
    logEvent(db, "job", jobId, `${job.company} · ${job.title}: ${job.status} → ${patch.status}`);
  }
  Object.assign(job, patch, { updatedAt: now() });
  write(db);
  return job;
}

export function addContact(c) {
  if (c.status && !CONTACT_STATUSES.includes(c.status)) throw new Error(`Unknown contact status "${c.status}"`);
  const db = read();
  const dupe = c.linkedinUrl && db.contacts.find((x) => normUrl(x.linkedinUrl) === normUrl(c.linkedinUrl));
  if (dupe) return dupe;
  const contact = { id: id(), status: "to_contact", createdAt: now(), updatedAt: now(), notes: "", ...c };
  db.contacts.push(contact);
  logEvent(db, "contact", contact.id, `Added ${contact.name} (${contact.company || "?"})`);
  write(db);
  return contact;
}

export function updateContact(contactId, patch) {
  const db = read();
  const c = db.contacts.find((x) => x.id === contactId);
  if (!c) throw new Error(`No contact with id ${contactId}`);
  if (patch.status && !CONTACT_STATUSES.includes(patch.status)) throw new Error(`Unknown contact status "${patch.status}"`);
  if (patch.status && patch.status !== c.status) {
    if (patch.status === "sent" && !c.sentAt) {
      patch.sentAt = now();
      patch.followUpOn ??= addDays(now(), 5);
    }
    if (patch.status === "replied" || patch.status === "chat_booked") patch.followUpOn = patch.followUpOn ?? null;
    logEvent(db, "contact", contactId, `${c.name}: ${c.status} → ${patch.status}`);
  }
  Object.assign(c, patch, { updatedAt: now() });
  write(db);
  return c;
}

export function sentToday(db = read()) {
  const today = new Date().toISOString().slice(0, 10);
  return db.contacts.filter((c) => c.sentAt?.startsWith(today)).length;
}

/** Everything whose follow-up date is today or earlier and still waiting on something. */
export function dueFollowUps(db = read()) {
  const today = new Date().toISOString().slice(0, 10);
  const jobs = db.jobs.filter((j) => j.followUpOn && j.followUpOn <= today && ["applied"].includes(j.status));
  const contacts = db.contacts.filter(
    (c) => c.followUpOn && c.followUpOn <= today && ["sent", "accepted"].includes(c.status),
  );
  return { jobs, contacts };
}

export function stats(db = read()) {
  const count = (arr, statuses) => Object.fromEntries(statuses.map((s) => [s, arr.filter((x) => x.status === s).length]));
  return { jobs: count(db.jobs, APP_STATUSES), contacts: count(db.contacts, CONTACT_STATUSES), sentToday: sentToday(db) };
}

const normUrl = (u) => (u || "").toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
