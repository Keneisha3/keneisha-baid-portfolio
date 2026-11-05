// Imports a tracker table (Markdown like seed/winter-2027-pipeline.md, or the same
// columns as CSV) into the tool. Re-running it is safe: rows are matched by link.
import { parseCsv } from "./csv.js";
import * as db from "./db.js";
import { sourceFor } from "./jobs/import.js";
import { applyPriorities } from "./jobs/score.js";

const STATUS = { "to apply": "found", applied: "applied", emailed: "applied", replied: "applied", interview: "interviewing", rejected: "rejected", skip: "skipped" };
const SIZE = (s = "") => (/startup/i.test(s) ? "startup" : /large|big|enterprise/i.test(s) ? "large" : /mid/i.test(s) ? "mid" : "");
const isPitch = (r) => /email target|cold email|not an internship|no (intern )?posting/i.test(`${r.postingstatus} ${r.role}`);

function parseMarkdown(text) {
  const rows = [];
  let keys = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) { keys = keys && line.trim() === "" ? keys : keys; continue; }
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    const asKeys = cells.map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
    if (!keys || (asKeys.includes("company") && asKeys.includes("link"))) { keys = asKeys; continue; } // header (incl. later tables)
    rows.push(Object.fromEntries(keys.map((k, i) => [k, cells[i] || ""])));
  }
  // "- Company | Role | City | Reason | ..." bullets under a "Closed or skipped" heading.
  const closed = text.split(/^##\s*closed.*$/im)[1] || "";
  for (const line of closed.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s+(.*)$/);
    if (!m) continue;
    const [company, role, city, reason] = m[1].split("|").map((c) => c.trim());
    rows.push({ company, role, city, notes: reason, status: /email still worth trying/i.test(reason || "") ? "To apply" : "Skip", postingstatus: reason, closed: "1" });
  }
  return rows;
}

export function importPipeline(text, { isMarkdown, priorities } = {}) {
  const rows = isMarkdown ?? /^\s*\|/m.test(text) ? parseMarkdown(text) : parseCsv(text);
  const before = db.read().jobs.length;
  const jobs = rows.filter((r) => r.company).map((r) => {
    const pitch = isPitch(r) || (r.closed && /email still worth trying/i.test(r.notes || ""));
    return {
      source: "pipeline",
      externalId: r.link || `${r.company}|${r.role}`,
      company: r.company,
      title: pitch && /no (intern )?posting|cold email|^$/i.test(r.role || "") ? `Cold pitch: ${r.termordates || "Winter 2027"} internship` : r.role,
      category: (r.category || "").toLowerCase(),
      companySize: SIZE(r.companysize),
      location: r.city || "",
      term: r.termordates || "",
      postingStatus: r.postingstatus || "",
      url: r.link || "",
      applyUrl: r.link || "",
      notes: [r.notes, r.termordates && `Term: ${r.termordates}`, r.postingstatus && `Posting: ${r.postingstatus}`].filter(Boolean).join(" · "),
      pitch: Boolean(pitch),
      manualApply: !(r.link && ["greenhouse", "lever", "ashby"].includes(safeSource(r.link))),
      matchScore: null,
      _status: STATUS[(r.status || "").toLowerCase()] || "found",
      _applied: r.dateapplied,
    };
  });
  const added = db.upsertJobs(jobs.map(({ _status, _applied, ...j }) => applyPriorities(j, priorities)));
  // Apply statuses from the sheet (only moving forward, never undoing your later progress).
  const order = db.APP_STATUSES;
  const state = db.read();
  let updated = 0;
  for (const j of jobs) {
    const row = state.jobs.find((x) => x.source === "pipeline" && x.externalId === j.externalId);
    if (row && j._status !== "found" && order.indexOf(j._status) > order.indexOf(row.status)) {
      db.updateJob(row.id, { status: j._status, ...(j._applied ? { appliedAt: new Date(j._applied).toISOString() } : {}) });
      updated++;
    }
  }
  return { rows: rows.length, added, updated, pitches: jobs.filter((j) => j.pitch).length, total: db.read().jobs.length - before };
}

function safeSource(url) {
  try { return sourceFor(url); } catch { return "link"; }
}
