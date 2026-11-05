// Shared operations used by both the CLI and the dashboard server.
import * as db from "./db.js";
import { fetchAll, mapLimit } from "./jobs/sources.js";
import { scoreJob, titlePasses, applyPriorities } from "./jobs/score.js";
import { importJobUrl } from "./jobs/import.js";
import { draftApplication, draftOutreach, researchContact, engineFor, runClaudeCode } from "./ai.js";
import { buildPack, applyPack, packSchema } from "./manual.js";

export const matches = (o, { category, region, size, priority } = {}) =>
  (!category || o.category === category || o.lane === category) && (!region || o.region === region) &&
  (!size || (o.size || o.companySize) === size) && (!priority || o.priority === true || (o.region && ["uk", "us"].includes(o.region)));

export async function discover(profile, targets, { log = console.log, ...filter } = {}) {
  const companies = targets.companies.filter((c) => matches(c, filter));
  const feeds = companies.filter((c) => c.ats !== "careers" && !c.disabled);
  log(`Checking ${feeds.length} job feeds…`);
  const filters = targets.filters || {};
  const { jobs, failures } = await fetchAll(companies, { onError: log, titleOk: (t) => titlePasses(t, filters) });
  // Founder posts (HN) skip the location filter when remote and are scored on the whole post.
  const found = [...scoreAll(jobs.filter((j) => j.source !== "hn"), filters),
    ...jobs.filter((j) => j.source === "hn").map((j) => ({ ...j, ...scoreFounderPost(j, filters) })).filter((j) => j.matchScore > 0)]
    .map((j) => applyPriorities(j, targets.priorities));
  const added = db.upsertJobs(found);
  let contacts = 0;
  for (const j of found.filter((x) => x.contactEmail)) {
    const row = db.read().jobs.find((x) => x.source === j.source && x.externalId === j.externalId);
    const before = db.read().contacts.length;
    db.addContact({ name: `${j.company} hiring`, company: j.company, email: j.contactEmail, reason: `Posted "${j.title}" in HN ${j.hnThread || "Who is hiring"}`,
      jobId: row?.id, companySize: "startup", region: j.region, category: "founding", notes: j.applyUrl });
    contacts += db.read().contacts.length - before;
  }
  if (contacts) log(`${contacts} founder email(s) from Hacker News added as outreach contacts.`);
  log(`Fetched ${jobs.length} postings, ${found.length} match your filters (${found.filter((j) => j.priority).length} in your priorities), ${added} new.`);
  if (failures.length) log(`${failures.length} feed(s) failed. Run check-targets to see which addresses to fix or disable.`);
  return { fetched: jobs.length, matched: found.length, added, failed: failures.length };
}

function scoreFounderPost(job, filters) {
  const firstLine = (job.description || "").split("\n")[0];
  const remote = /remote/i.test(firstLine);
  const r = scoreJob({ ...job, location: remote ? "" : job.location || firstLine }, { ...filters, titleRequire: [], titleInclude: [], titleExclude: filters.seniorityExclude || [] });
  return { matchScore: r.score, matchReasons: [...r.reasons, "founder post"] };
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
      return { ok: true, job: applyPriorities({ ...job, title: job.title || url, company: job.company || new URL(url).hostname, matchScore: score || null, matchReasons: reasons }, targets.priorities) };
    } catch (e) {
      return { ok: false, url, error: e.message };
    }
  });
  const ok = results.filter((r) => r.ok).map((r) => r.job);
  const added = db.upsertJobs(ok);
  for (const r of results) log(r.ok ? `  + ${r.job.company} · ${r.job.title}` : `  ! ${r.url}: ${r.error}`);
  return { added, read: ok.length, failed: results.filter((r) => !r.ok).map(({ url, error }) => ({ url, error })) };
}

export async function draftJob(profile, jobId, opts = {}) {
  const job = db.read().jobs.find((j) => j.id === jobId);
  if (!job) throw new Error(`No job ${jobId}`);
  const draft = await draftApplication(profile, job, opts);
  return db.updateJob(jobId, { draft, status: job.status === "found" ? "drafted" : job.status });
}

export async function draftContact(profile, contactId, opts = {}) {
  const state = db.read();
  const contact = state.contacts.find((c) => c.id === contactId);
  if (!contact) throw new Error(`No contact ${contactId}`);
  const job = contact.jobId ? state.jobs.find((j) => j.id === contact.jobId) : null;
  const draft = await draftOutreach(profile, contact, job, opts);
  return db.updateContact(contactId, { draft, status: contact.status === "to_contact" ? "drafted" : contact.status });
}

/** Drafts many at once (Claude calls in parallel). */
export async function draftMany(profile, kind, ids, { concurrency, log = console.log, engine, batch = 8 } = {}) {
  // With a Claude subscription, draft 8 per request: ~8x less of your usage limit than one request per item.
  if (!engine && engineFor(profile) === "claude-code" && ids.length > 1) return draftBatchesClaudeCode(profile, kind, ids, { batch, log });
  let done = 0;
  concurrency ??= engineFor(profile) === "claude-code" ? 2 : 4;
  return mapLimit(ids, concurrency, async (id) => {
    const r = await (kind === "jobs" ? draftJob(profile, id, { engine }) : draftContact(profile, id, { engine })).catch((e) => ({ error: e.message, id }));
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

export async function researchMany(ids, { concurrency = 3, log = console.log, profile } = {}) {
  let done = 0;
  return mapLimit(ids, concurrency, async (id) => {
    const c = db.read().contacts.find((x) => x.id === id);
    try {
      const research = await researchContact(c, profile);
      db.updateContact(id, { research, researchedAt: db.now() });
      log(`  [${++done}/${ids.length}] ${c.company || c.name}`);
    } catch (e) { log(`  [${++done}/${ids.length}] ! ${c.company || c.name}: ${e.message}`); }
  });
}

async function draftBatchesClaudeCode(profile, kind, ids, { batch, log }) {
  const groups = [];
  for (let i = 0; i < ids.length; i += batch) groups.push(ids.slice(i, i + batch));
  let saved = 0;
  await mapLimit(groups, 2, async (group, g) => {
    const s = db.read();
    const items = group.map((id) => s[kind].find((x) => x.id === id)).filter(Boolean);
    try {
      const out = await runClaudeCode(buildPack(kind, items, profile), { schema: packSchema(kind) });
      const r = applyPack(out.structured_output?.items ?? JSON.parse(out.result).items, "claude-code");
      saved += r.saved.length;
      r.saved.forEach((x) => log(`  ✓ ${x}`));
      r.errors.forEach((x) => log(`  ! ${x}`));
      const missing = group.filter((id) => !db.read()[kind].find((x) => x.id === id)?.draft);
      if (missing.length) { log(`  (${missing.length} missing from batch ${g + 1}; using templates)`); await draftMany(profile, kind, missing, { engine: "template", log }); }
    } catch (e) {
      log(`  ! batch ${g + 1} failed (${e.message}); using templates for it`);
      await draftMany(profile, kind, group, { engine: "template", log });
    }
  });
  log(`Drafted ${saved} with Claude.`);
}

/** LinkedIn job links: opened one at a time in your logged-in browser; follows Apply to the company's site. */
export async function importLinkedIn(urls, targets, { log = console.log } = {}) {
  const { openBrowser } = await import("./browser.js");
  const { ensureLoggedIn, resolveLinkedInJob } = await import("./outreach/linkedin.js");
  const browser = await openBrowser();
  const page = browser.pages()[0] || (await browser.newPage());
  await ensureLoggedIn(page);
  let added = 0;
  const failed = [];
  const list = [...new Set(urls)];
  for (const [k, url] of list.entries()) {
    try {
      const li = await resolveLinkedInJob(browser, page, url);
      let job = null;
      if (li.externalUrl && !/linkedin\.com/.test(li.externalUrl)) job = await importJobUrl(li.externalUrl).catch(() => null);
      job = {
        ...(job || { source: "linkedin", externalId: url, url, applyUrl: li.externalUrl || url, manualApply: true }),
        title: job?.title || li.title, company: job?.company || li.company, location: job?.location || li.location,
        description: job?.description?.length > 200 ? job.description : li.description,
        linkedinUrl: url, easyApply: li.easyApply,
        notes: li.easyApply ? "Easy Apply on LinkedIn: apply there (takes a minute)." : li.externalUrl ? "" : "Couldn't find the company's apply link; apply from LinkedIn.",
      };
      const { score, reasons } = scoreJob(job, { ...targets.filters, titleRequire: [], titleInclude: [], locations: [] });
      added += db.upsertJobs([applyPriorities({ ...job, matchScore: score || null, matchReasons: reasons }, targets.priorities)]);
      log(`  [${k + 1}/${list.length}] ${job.company} · ${job.title}${li.easyApply ? "  (Easy Apply)" : li.externalUrl ? "  → company site" : ""}`);
    } catch (e) { failed.push({ url, error: e.message.split("\n")[0] }); log(`  ! ${url}: ${e.message.split("\n")[0]}`); }
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000)); // human pace
  }
  await browser.close();
  return { added, read: list.length - failed.length, failed };
}

/** Re-checks saved postings and moves dead ones (404, "no longer accepting") to skipped. */
export async function checkLinks({ log = console.log, statuses = ["found", "drafted"] } = {}) {
  const jobs = db.read().jobs.filter((j) => statuses.includes(j.status) && j.url && !/linkedin\.com/.test(j.url) && !j.pitch);
  const DEAD = /no longer (accepting|available|open)|position (has been|is) (filled|closed)|job (is )?(not found|closed|expired)|this (job|posting) (has )?(expired|closed)|page (you('re| are) looking for|not found)/i;
  let closed = 0;
  await mapLimit(jobs, 6, async (j) => {
    let verdict = "";
    try {
      const res = await fetch(j.url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh) Chrome/130 Safari/537.36" }, redirect: "follow" });
      if ([404, 410].includes(res.status)) verdict = `HTTP ${res.status}`;
      else if (res.ok) { const html = (await res.text()).slice(0, 200000); const m = html.replace(/<[^>]+>/g, " ").match(DEAD); if (m) verdict = `"${m[0]}"`; }
    } catch { /* network hiccup: leave it alone */ }
    if (verdict) {
      closed++;
      db.updateJob(j.id, { status: "skipped", notes: `${j.notes ? j.notes + " · " : ""}Closed (${verdict}, checked ${db.today()})` });
      log(`  ✗ ${j.company} · ${j.title}: ${verdict}`);
    }
  });
  log(`Checked ${jobs.length} postings; ${closed} closed.`);
  return { checked: jobs.length, closed };
}
