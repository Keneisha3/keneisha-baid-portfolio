#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import * as db from "./db.js";
import { loadProfile, loadTargets } from "./config.js";
import { CONFIG_DIR } from "./paths.js";
import { discover, draftJob, draftContact, draftMany, importLinks, todayPlan, researchMany, matches, importLinkedIn, checkLinks } from "./commands.js";
import { importPipeline } from "./pipeline.js";
import { buildPack, applyPack, nextForPack } from "./manual.js";
import { engineFor, canResearch } from "./ai.js";
import { execFileSync } from "node:child_process";
import { FETCHERS } from "./jobs/sources.js";
import { parseCsv } from "./csv.js";
import { openBrowser, ask } from "./browser.js";
import { openApplication, autofill, clickSubmit, isConfirmed } from "./apply/autofill.js";
import { ensureLoggedIn, prepareConnect, prepareMessage, searchLinks, jobSearchLinks, isLinkedInJob, resolveLinkedInJob } from "./outreach/linkedin.js";
import { importJobUrl } from "./jobs/import.js";
import { scoreJob } from "./jobs/score.js";
import { composeUrl } from "./outreach/email.js";
import { startServer } from "./server.js";

const HELP = `
job-hunt-assistant: find roles, apply in bulk, line up coffee chats, track it all.

DAILY
  today                          Progress vs your daily goals + what's queued
  serve [--port 4321]            Dashboard at http://localhost:4321

FIND JOBS
  discover [--category fintech]  Pull new matching postings from every job feed in targets.json
  check-targets [--disable-failed]  Test every feed; optionally switch off the broken ones
  careers [--category airlines] [--tabs 8]
                                 Open career pages for companies with no feed, so you can grab links
  linkedin-jobs [--region uk]    Opens LinkedIn job searches (internships, past week) for you to browse
  add-job <url> [<url>...]       Import postings from any career site or LinkedIn job link
  import-pipeline [file]         Load a tracker table (defaults to seed/winter-2027-pipeline.md)
  import-jobs <links.txt>        Same, one link per line
  check-links                    Re-check saved postings; closed/expired ones move to skipped
  jobs [--status drafted] [--category consulting]

APPLY
  draft <jobId> | --top N | --all [--concurrency 4]
                                 Tailored cover letter + answers (Claude)
  apply <jobId> | --next N [--tabs 4] [--category ..] [--auto-submit] [--ai]
                                 Opens N applications in batches of tabs, autofilled. You review and
                                 submit; confirmations are detected and marked applied automatically.
                                 --auto-submit clicks Submit only when every required field is filled.

OUTREACH
  people <company>               LinkedIn search links (alumni, roles, recruiters)
  add-contact --name ".." [--url <linkedin>] [--email ..] [--title ..] [--company ..] [--reason ..] [--job <id>]
  import-contacts <file.csv>     Columns: name,title,company,linkedinurl,email,reason,notes
  research <id> | --all [--open] Recent news per company for the hook (automatic with claude-code/api;
                                 otherwise opens the searches and you type one line each)
  prompt-pack [--jobs 8 | --contacts 8]
                                 FREE drafting: copies one prompt for 8 items to paste into claude.ai
  paste-drafts [reply.txt]       Saves Claude's reply (reads the clipboard on a Mac)
  draft-outreach <id> | --all    LinkedIn note + coffee-chat ask, and a 3-email value-first sequence
  email --next N                 Opens N cold emails in Outlook/Gmail compose tabs; you press Send
  email --followups              Opens the due follow-up emails (day 4-5, then day 10-12)
  connect <id> | --next N        Opens LinkedIn profiles with your note in the Connect box; you press Send
  message <id> [--nudge]         Paste the coffee-chat ask (or nudge) into a LinkedIn DM

FILTERS (most commands): --category fintech|tech sales|consulting|airlines|...  --region canada|us|uk  --size startup|large

TRACK
  followups | contacts [--status sent] | stats
  set <id> <status>              jobs: ${db.APP_STATUSES.join(", ")}
                                 contacts: ${db.CONTACT_STATUSES.join(", ")}
`;

const [cmd, ...rest] = process.argv.slice(2);
const { values: opt, positionals: pos } = parseArgs({
  args: rest, allowPositionals: true,
  options: {
    port: { type: "string" }, status: { type: "string" }, top: { type: "string" }, next: { type: "string" }, tabs: { type: "string" },
    concurrency: { type: "string" }, category: { type: "string" }, region: { type: "string" }, size: { type: "string" }, followups: { type: "boolean" },
    submit: { type: "boolean" }, ai: { type: "boolean" }, jobs: { type: "string" }, contacts: { type: "string" }, open: { type: "boolean" }, "auto-submit": { type: "boolean" }, all: { type: "boolean" }, nudge: { type: "boolean" }, "disable-failed": { type: "boolean" },
    url: { type: "string" }, email: { type: "string" }, name: { type: "string" }, title: { type: "string" }, company: { type: "string" },
    reason: { type: "string" }, job: { type: "string" }, notes: { type: "string" },
  },
});

const fmtJob = (j) => `${j.id}  ${String(j.matchScore ?? "").padStart(3)}  ${j.status.padEnd(12)} ${j.company} · ${j.title} (${j.location || "?"})${j.manualApply ? "  [apply on site]" : ""}`;
const fmtContact = (c) => `${c.id}  ${c.status.padEnd(12)} ${c.name} · ${c.title || ""} @ ${c.company || ""}${c.email ? ` <${c.email}>` : ""}${c.followUpOn ? `  [follow up ${c.followUpOn}]` : ""}`;
const F = () => ({ category: opt.category, region: opt.region, size: opt.size });
const byScore = (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0);
const bar = (n, goal) => (goal ? `${String(n).padStart(3)}/${goal} ${"█".repeat(Math.min(20, Math.round((n / goal) * 20))).padEnd(20, "░")}` : String(n));

async function main() {
  switch (cmd) {
    case "init": {
      for (const n of ["profile", "targets"]) {
        const dest = path.join(CONFIG_DIR, `${n}.json`);
        if (fs.existsSync(dest)) console.log(`exists: config/${n}.json`);
        else fs.copyFileSync(path.join(CONFIG_DIR, `${n}.example.json`), dest), console.log(`created: config/${n}.json`);
      }
      console.log("Next: check config/profile.json (phone, screeningAnswers), add config/resume.tex + resume.pdf, then run check-targets.");
      return;
    }
    case "serve":
      return startServer(Number(opt.port || 4321));

    case "engine": {
      const p = loadProfile(), e = engineFor(p);
      console.log(`Drafting engine: ${e}`);
      if (e === "claude-code") {
        try { console.log(execFileSync(process.env.JHA_CLAUDE_BIN || "claude", ["--version"], { encoding: "utf8" }).trim(), "found. Make sure you've run `claude` once and logged in with your Claude account."); }
        catch { console.log("`claude` not found: npm install -g @anthropic-ai/claude-code, then run `claude` and log in."); }
      } else if (e === "template") console.log("Free templates. For Claude-quality drafts without paying: prompt-pack → claude.ai → paste-drafts.");
      return;
    }
    case "today": {
      const p = todayPlan(loadTargets());
      const g = p.goals;
      console.log(`Applications  ${bar(p.applied, g.applicationsPerDay)}`);
      console.log(`Cold emails   ${bar(p.emails, g.emailsPerDay)}`);
      console.log(`LinkedIn      ${bar(p.linkedin, g.linkedinPerDay)}   (this week ${p.linkedinWeek}/${g.linkedinPerWeek ?? "–"})`);
      console.log(`\nQueue: ${p.queue.toDraft} to draft · ${p.queue.readyToApply} ready to apply · ${p.queue.emailReady} emails ready · ${p.queue.linkedinReady} LinkedIn ready`);
      console.log(`Follow-ups due: ${p.due.jobs.length} applications, ${p.due.contacts.length} people`);
      const gap = (g.applicationsPerDay || 0) - p.applied - p.queue.readyToApply - p.queue.toDraft;
      if (gap > 0) console.log(`\nYou're ${gap} postings short of today's goal. Try: discover · careers --category airlines · import-jobs links.txt`);
      return;
    }

    case "discover":
      await discover(loadProfile(), loadTargets(), F());
      return;
    case "check-targets": {
      const t = loadTargets();
      const feeds = t.companies.filter((c) => c.ats !== "careers" && matches(c, F()));
      const bad = [];
      await Promise.all(feeds.map(async (c) => {
        try {
          const jobs = await FETCHERS[c.ats](c, { titleOk: () => false });
          console.log(`✓ ${c.name} (${c.ats}${jobs.length ? `, ${jobs.length} postings` : ""})`);
        } catch (e) { bad.push(c.name); console.log(`✗ ${c.name} (${c.ats}): ${e.message.slice(0, 90)}`); }
      }));
      console.log(`\n${feeds.length - bad.length}/${feeds.length} feeds work.`);
      if (bad.length && opt["disable-failed"]) {
        const file = path.join(CONFIG_DIR, "targets.json");
        if (!fs.existsSync(file)) throw new Error("Run init first so there's a config/targets.json to edit");
        const real = JSON.parse(fs.readFileSync(file, "utf8"));
        for (const c of real.companies) if (bad.includes(c.name)) { c.disabled = true; c.ats_was = c.ats; c.ats = "careers"; }
        fs.writeFileSync(file, JSON.stringify(real, null, 2) + "\n");
        console.log(`Moved ${bad.length} to "careers" (open them with: careers). Fix the board slug and ats to re-enable.`);
      } else if (bad.length) console.log("Fix the board slug for those, or run: check-targets --disable-failed");
      return;
    }
    case "careers": {
      const t = loadTargets();
      const list = t.companies.filter((c) => (c.ats === "careers" || c.careersUrl) && matches(c, F()));
      const n = Number(opt.tabs || 8);
      const browser = await openBrowser();
      for (let i = 0; i < list.length; i += n) {
        const chunk = list.slice(i, i + n);
        for (const c of chunk) {
          const page = await browser.newPage();
          const url = c.careersUrl || `https://www.google.com/search?q=${encodeURIComponent(`${c.name} careers intern OR co-op winter 2027`)}`;
          await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
        }
        console.log(`\nOpened ${chunk.map((c) => c.name).join(", ")}.`);
        console.log("Copy the links of any relevant postings into a text file (one per line), or paste them into the dashboard's 'Paste job links' box.");
        if ((await ask(i + n < list.length ? "Enter = next batch, q = stop: " : "Enter = done: ")).toLowerCase() === "q") break;
        for (const p of browser.pages().slice(1)) await p.close();
      }
      await browser.close();
      return;
    }
    case "linkedin-jobs": {
      const t = loadTargets();
      const roles = t.linkedinJobs?.roles || ["intern", "co-op"];
      const locs = (t.linkedinJobs?.locations || ["Canada"]).filter((l) => !opt.region || (opt.region === "uk") === /london|united kingdom|uk/i.test(l));
      const links = jobSearchLinks(roles, locs);
      const browser = await openBrowser();
      const page = browser.pages()[0] || (await browser.newPage());
      await ensureLoggedIn(page);
      for (let i = 0; i < links.length; i += 6) {
        for (const l of links.slice(i, i + 6)) { const p = await browser.newPage(); await p.goto(l.url, { waitUntil: "domcontentloaded" }).catch(() => {}); await new Promise((r) => setTimeout(r, 1200)); }
        console.log(`\nOpened: ${links.slice(i, i + 6).map((l) => l.label).join(" | ")}`);
        console.log("Copy the link of each job you like (Share → Copy link, or the address bar) into linkedin.txt, one per line.");
        if ((await ask(i + 6 < links.length ? "Enter = next searches, q = done browsing: " : "Enter = done: ")).toLowerCase() === "q") break;
        for (const p of browser.pages().slice(1)) await p.close();
      }
      await browser.close();
      console.log("Then: npm run jha -- import-jobs linkedin.txt");
      return;
    }
    case "add-job":
    case "import-jobs": {
      const all = (cmd === "add-job" ? pos : fs.readFileSync(pos[0], "utf8").split(/\s+/)).filter((u) => /^https?:\/\//.test(u));
      const li = all.filter(isLinkedInJob), urls = all.filter((u) => !isLinkedInJob(u));
      if (li.length) console.log(`Imported ${(await importLinkedIn(li, loadTargets())).added} LinkedIn job(s).`);
      if (!urls.length) return;
      const r = await importLinks(urls, loadTargets());
      console.log(`Imported ${r.added} new job(s) (${r.read} read, ${r.failed.length} failed).`);
      return;
    }
    case "import-pipeline": {
      const file = pos[0] || new URL("../seed/winter-2027-pipeline.md", import.meta.url).pathname;
      const r = importPipeline(fs.readFileSync(file, "utf8"));
      console.log(`Read ${r.rows} rows: ${r.added} new jobs, ${r.updated} statuses updated, ${r.pitches} cold-pitch targets.`);
      console.log("Cold-pitch targets have no posting: find a person with `people <company>`, then add-contact --email ... --job <id>.");
      return;
    }
    case "check-links":
      await checkLinks();
      return;
    case "jobs": {
      const jobs = db.read().jobs.filter((j) => (!opt.status || j.status === opt.status) && matches(j, F())).sort(byScore);
      jobs.forEach((j) => console.log(fmtJob(j)));
      if (!jobs.length) console.log("No jobs yet. Run: discover");
      return;
    }
    case "draft": {
      const profile = loadProfile();
      const found = db.read().jobs.filter((j) => j.status === "found" && !j.pitch && matches(j, F())).sort(byScore);
      const ids = opt.all ? found.map((j) => j.id) : opt.top ? found.slice(0, Number(opt.top)).map((j) => j.id) : pos;
      if (ids.length === 1) {
        const j = await draftJob(profile, ids[0]);
        console.log(`\n=== ${j.company} · ${j.title}  (fit ${j.draft.fitScore ?? "?"})\n${j.draft.fitSummary}\n\n${j.draft.coverLetter}`);
      } else {
        console.log(`Drafting ${ids.length} application(s)…`);
        await draftMany(profile, "jobs", ids, { concurrency: Number(opt.concurrency || 4) });
      }
      return;
    }
    case "apply":
      return applyBatch();

    case "people": {
      const company = pos.join(" ");
      if (!company) throw new Error("Usage: people <company>");
      const t = loadTargets(), p = loadProfile();
      for (const l of searchLinks(company, { roles: t.outreach?.roles, school: p.schoolName, schoolSlug: t.outreach?.schoolSlug }))
        console.log(`${l.label}\n  ${l.url}`);
      console.log(`\nFound someone? add-contact --url <profile> --name "..." --title "..." --company "${company}" --reason "..."`);
      return;
    }
    case "add-contact": {
      if (!opt.name || !(opt.url || opt.email)) throw new Error('Usage: add-contact --name "Full Name" (--url <linkedin> | --email <addr>) [--title] [--company] [--reason] [--job]');
      const job = opt.job && db.read().jobs.find((j) => j.id === opt.job);
      const c = db.addContact({ linkedinUrl: opt.url, email: opt.email, name: opt.name, title: opt.title, company: opt.company || job?.company, reason: opt.reason,
        jobId: opt.job, notes: opt.notes || "", companySize: job?.companySize, region: job?.region, category: job?.category });
      console.log(`Added ${fmtContact(c)}`);
      return;
    }
    case "import-contacts": {
      const rows = parseCsv(fs.readFileSync(pos[0], "utf8"));
      let n = 0;
      for (const r of rows) {
        if (!r.name || !(r.linkedinurl || r.linkedin || r.email)) continue;
        db.addContact({ name: r.name, title: r.title, company: r.company, linkedinUrl: r.linkedinurl || r.linkedin || undefined, email: r.email || undefined, reason: r.reason, notes: r.notes || "" });
        n++;
      }
      console.log(`Imported ${n} contact(s) from ${rows.length} row(s).`);
      return;
    }
    case "contacts": {
      const cs = db.read().contacts.filter((c) => !opt.status || c.status === opt.status);
      cs.forEach((c) => console.log(fmtContact(c)));
      if (!cs.length) console.log("No contacts yet. Try: people <company>");
      return;
    }
    case "draft-outreach": {
      const profile = loadProfile();
      const ids = opt.all ? db.read().contacts.filter((c) => c.status === "to_contact").map((c) => c.id) : pos;
      if (ids.length === 1) {
        const c = await draftContact(profile, ids[0]);
        console.log(`\n=== ${c.name} (${c.draft.connectionNote.length} chars)\n${c.draft.connectionNote}\n--- after they accept:\n${c.draft.followUp}\n--- email: ${c.draft.emailSubject}\n${c.draft.emailBody}`);
      } else await draftMany(profile, "contacts", ids, { concurrency: Number(opt.concurrency || 4) });
      return;
    }
    case "prompt-pack": {
      const kind = opt.contacts ? "contacts" : "jobs";
      const items = pos.length ? pos.map((id) => db.read()[kind].find((x) => x.id === id)).filter(Boolean) : nextForPack(kind, Number(opt.contacts || opt.jobs || 8), (o) => matches(o, F()));
      if (!items.length) return console.log(`Nothing waiting to be drafted (${kind}).`);
      const text = buildPack(kind, items, loadProfile());
      const file = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "data", "prompt-pack.txt");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text);
      let copied = false;
      try { execFileSync("pbcopy", { input: text }); copied = true; } catch {}
      console.log(`Prompt for ${items.length} ${kind} ${copied ? "copied to your clipboard" : `saved to ${file}`}.`);
      console.log("1. Paste it into a new chat at claude.ai (free works)\n2. Copy Claude's whole reply\n3. Run: npm run jha -- paste-drafts   (reads your clipboard), or paste it in the dashboard");
      return;
    }
    case "paste-drafts": {
      let text = pos[0] ? fs.readFileSync(pos[0], "utf8") : "";
      if (!text) try { text = execFileSync("pbpaste", { encoding: "utf8" }); } catch { throw new Error("Pass a file: paste-drafts reply.json"); }
      const r = applyPack(text);
      r.saved.forEach((x) => console.log(`  ✓ ${x}`));
      r.errors.forEach((x) => console.log(`  ! ${x}`));
      console.log(`Saved ${r.saved.length} draft(s).`);
      return;
    }
    case "research": {
      const state = db.read();
      const ids = opt.all ? state.contacts.filter((c) => !c.research && ["to_contact", "drafted"].includes(c.status) && matches(c, F())).map((c) => c.id) : pos;
      const profile = loadProfile();
      if (canResearch(profile) && !opt.open) {
        console.log(`Researching ${ids.length} contact(s) with web search…`);
        await researchMany(ids, { profile });
      } else {
        // Free version: opens the right searches; you skim and type one line.
        const browser = await openBrowser();
        for (const id of ids) {
          const c = db.read().contacts.find((x) => x.id === id);
          const q = encodeURIComponent(c.company || c.name);
          for (const u of [`https://www.google.com/search?q=${q}&tbm=nws`, `https://www.linkedin.com/company/${(c.company || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}/posts/`, ...(c.linkedinUrl ? [`${c.linkedinUrl.replace(/\/$/, "")}/recent-activity/all/`] : [])]) {
            const page = await browser.newPage();
            await page.goto(u, { waitUntil: "domcontentloaded" }).catch(() => {});
          }
          const hook = await ask(`\n${c.name} (${c.company || ""}): one specific recent thing to mention (Enter to skip, q to stop): `);
          if (hook.toLowerCase() === "q") break;
          if (hook) db.updateContact(id, { research: `- ${hook}`, researchedAt: db.now() });
          for (const p of browser.pages().slice(1)) await p.close();
        }
        await browser.close();
      }
      console.log("Done. Re-draft them so the research is used: draft-outreach --all (or <id>)");
      return;
    }
    case "email":
      return opt.followups ? emailFollowups() : emailBatch();
    case "connect":
      return connectBatch();
    case "message": {
      const profile = loadProfile();
      const c = db.read().contacts.find((x) => x.id === pos[0]);
      if (!c) throw new Error("Usage: message <contactId> [--nudge]");
      const draft = c.draft || (await draftContact(profile, c.id)).draft;
      const text = opt.nudge ? draft.nudge : draft.followUp;
      const browser = await openBrowser();
      const page = browser.pages()[0] || (await browser.newPage());
      await ensureLoggedIn(page);
      const r = await prepareMessage(page, c.linkedinUrl, text);
      console.log(r.ok ? "  Message typed. Review and press Send in the browser." : `  ! ${r.reason}\n  Message:\n${text}`);
      if ((await ask("  Sent? y/n: ")).toLowerCase() === "y")
        db.updateContact(c.id, { status: c.status === "sent" ? "accepted" : c.status, lastMessagedAt: db.now(), followUpOn: db.addDays(db.now(), 7) });
      await browser.close();
      return;
    }

    case "followups": {
      const { jobs, contacts } = db.dueFollowUps();
      if (!jobs.length && !contacts.length) return console.log("Nothing due. Nice.");
      if (jobs.length) console.log("Applications to chase (email the recruiter / ping a contact there):"), jobs.forEach((j) => console.log("  " + fmtJob(j)));
      if (contacts.length) console.log("People to nudge (message <id> --nudge):"), contacts.forEach((c) => console.log("  " + fmtContact(c)));
      return;
    }
    case "set": {
      const [rid, status] = pos;
      const state = db.read();
      if (state.jobs.some((j) => j.id === rid)) console.log(fmtJob(db.updateJob(rid, { status })));
      else if (state.contacts.some((c) => c.id === rid)) console.log(fmtContact(db.updateContact(rid, { status })));
      else throw new Error(`No job or contact with id ${rid}`);
      return;
    }
    case "stats":
      console.log(JSON.stringify(db.stats(), null, 2));
      return;
    default:
      console.log(HELP);
  }
}

/** Parses "1 3 5" / "1,3" / "all" into zero-based indexes. */
const pickList = (answer, n) => (/^all$/i.test(answer) ? [...Array(n).keys()] : answer.split(/[\s,]+/).map(Number).filter((k) => k >= 1 && k <= n).map((k) => k - 1));

async function applyBatch() {
  const profile = loadProfile();
  const state = db.read();
  const jobs = opt.next
    ? state.jobs.filter((j) => ["drafted", "found"].includes(j.status) && !j.pitch && matches(j, F()))
      .sort((a, b) => (b.status === "drafted") - (a.status === "drafted") || byScore(a, b)).slice(0, Number(opt.next))
    : pos.map((p) => state.jobs.find((j) => j.id === p)).filter(Boolean);
  if (!jobs.length) throw new Error("Nothing to apply to. Try: discover, then draft --top 20");
  const undrafted = jobs.filter((j) => !j.draft).map((j) => j.id);
  if (undrafted.length) {
    // Bulk applying: undrafted jobs get instant free drafts unless you pay per use (api) or pass --ai.
    const engine = opt.ai || engineFor(profile) === "api" ? undefined : "template";
    console.log(`Drafting ${undrafted.length} first${engine ? " (free templates; use `draft` or prompt-pack for your top picks)" : ""}…`);
    await draftMany(profile, "jobs", undrafted, { engine, log: () => {} });
  }
  const fresh = db.read().jobs;
  const queue = jobs.map((j) => fresh.find((f) => f.id === j.id));
  const tabs = Math.max(1, Number(opt.tabs || 4));
  const auto = opt["auto-submit"] || opt.submit;
  const browser = await openBrowser();
  let applied = 0;

  for (let i = 0; i < queue.length; i += tabs) {
    const batch = [];
    for (const job of queue.slice(i, i + tabs)) {
      const page = await browser.newPage();
      try {
        await openApplication(page, job);
        const r = await autofill(page, job, profile, job.draft);
        const n = i + batch.length + 1;
        console.log(`\n[${n}/${queue.length}] ${job.company} · ${job.title}\n  filled ${r.filled.length}${r.unfilled.length ? ` · needs you: ${r.unfilled.join(" | ")}` : " · nothing required left"}${job.manualApply ? "\n  (career site: you may need to sign in; cover letter is in the dashboard)" : ""}`);
        if (auto && !job.manualApply && !r.unfilled.length) {
          await clickSubmit(page);
          await page.waitForTimeout(5000);
          console.log((await isConfirmed(page)) ? "  ✓ submitted" : "  … clicked Submit; check the tab (captcha?)");
        }
        batch.push({ job, page });
      } catch (e) {
        console.log(`\n  ! ${job.company} · ${job.title}: ${e.message.split("\n")[0]}`);
        await page.close().catch(() => {});
      }
    }
    if (!batch.length) continue;
    const a = (await ask(`\nReview and submit the ${batch.length} open tab(s). Enter when done, s = skip this batch, q = stop: `)).toLowerCase();
    const unconfirmed = [];
    for (const b of batch) {
      if (!b.page.isClosed() && (await isConfirmed(b.page))) { db.updateJob(b.job.id, { status: "applied" }); applied++; }
      else unconfirmed.push(b);
    }
    if (unconfirmed.length && a !== "s") {
      unconfirmed.forEach((b, k) => console.log(`  ${k + 1}. ${b.job.company} · ${b.job.title}`));
      const ans = await ask("No confirmation seen for these. Which did you submit? (e.g. 1 3, all, or Enter for none): ");
      for (const k of pickList(ans, unconfirmed.length)) { db.updateJob(unconfirmed[k].job.id, { status: "applied" }); applied++; }
    }
    for (const b of batch) await b.page.close().catch(() => {});
    console.log(`  ${applied} applied so far · today: ${db.appliedToday()}`);
    if (a === "q") break;
  }
  await browser.close();
}

async function emailBatch() {
  const profile = loadProfile(), targets = loadTargets();
  const cap = targets.goals?.emailsPerDay ?? 40;
  const left = cap - db.sentToday(db.read(), "email");
  if (left <= 0) return console.log(`Daily email limit of ${cap} reached. Sending from your own inbox at higher volume gets you flagged as spam.`);
  let list = db.read().contacts.filter((c) => c.email && ["to_contact", "drafted"].includes(c.status) && matches(c, F()));
  if (pos.length) list = list.filter((c) => pos.includes(c.id));
  list = list.slice(0, Math.min(Number(opt.next || 10), left));
  if (!list.length) return console.log("No contacts with an email address waiting. Add some with add-contact --email or import-contacts.");
  const undrafted = list.filter((c) => !c.draft?.emailBody).map((c) => c.id);
  if (undrafted.length) await draftMany(profile, "contacts", undrafted);
  const fresh = db.read().contacts;
  const browser = await openBrowser();
  const provider = profile.emailProvider || "outlook";
  for (let i = 0; i < list.length; i += 8) {
    const chunk = list.slice(i, i + 8).map((c) => fresh.find((f) => f.id === c.id));
    for (const [k, c] of chunk.entries()) {
      const page = await browser.newPage();
      await page.goto(composeUrl(provider, c.email, c.draft.emailSubject, c.draft.emailBody), { waitUntil: "domcontentloaded" }).catch(() => {});
      console.log(`  ${k + 1}. ${c.name} <${c.email}>: ${c.draft.emailSubject}`);
    }
    const ans = await ask("Review and Send each in the browser (sign in the first time). Which did you send? (Enter = all, or e.g. 1 3, 'none'): ");
    const sent = ans.trim() === "" ? chunk.map((_, k) => k) : /^none$/i.test(ans) ? [] : pickList(ans, chunk.length);
    for (const k of sent) db.updateContact(chunk[k].id, { status: "sent", channel: "email" });
    for (const p of browser.pages().slice(1)) await p.close();
    console.log(`  ✓ ${sent.length} tracked (nudge reminder in 5 days)`);
  }
  await browser.close();
}

async function emailFollowups() {
  const profile = loadProfile();
  const due = db.dueFollowUps().contacts.filter((c) => c.channel === "email" && (c.emailStep || 1) < 3 && c.draft?.emailFollowUp1);
  if (!due.length) return console.log("No email follow-ups due today.");
  const browser = await openBrowser();
  const provider = profile.emailProvider || "outlook";
  due.forEach((c, k) => console.log(`  ${k + 1}. ${c.name} <${c.email}> · follow-up ${(c.emailStep || 1)}`));
  for (const c of due) {
    const page = await browser.newPage();
    const step = c.emailStep || 1;
    const text = step === 1 ? c.draft.emailFollowUp1 : c.draft.emailFollowUp2;
    await page.goto(composeUrl(provider, c.email, `Re: ${c.draft.emailSubject}`, text), { waitUntil: "domcontentloaded" }).catch(() => {});
  }
  console.log("Tip: replying inside the original thread is even better. Search your Sent folder for the subject and paste the text there.");
  const ans = await ask("Which did you send? (Enter = all, e.g. 1 3, or 'none'): ");
  const sent = ans.trim() === "" ? due.map((_, k) => k) : /^none$/i.test(ans) ? [] : pickList(ans, due.length);
  for (const k of sent) {
    const c = due[k], step = (c.emailStep || 1) + 1;
    db.updateContact(c.id, { emailStep: step, lastMessagedAt: db.now(), followUpOn: step < 3 ? db.addDays(db.now(), 6) : null });
  }
  await browser.close();
  console.log(`  ✓ ${sent.length} follow-up(s) tracked`);
}

async function connectBatch() {
  const profile = loadProfile(), targets = loadTargets();
  const perDay = targets.goals?.linkedinPerDay ?? targets.outreach?.dailyLimit ?? 20;
  const perWeek = targets.goals?.linkedinPerWeek ?? 100;
  const state = db.read();
  const left = Math.min(perDay - db.sentToday(state), perWeek - db.sentThisWeek(state));
  if (left <= 0) return console.log(`LinkedIn limit reached (${perDay}/day, ${perWeek}/week). LinkedIn restricts accounts that go past roughly 100 invites a week; use email for the rest.`);
  let queue = opt.next
    ? state.contacts.filter((c) => c.linkedinUrl && ["to_contact", "drafted"].includes(c.status)).slice(0, Number(opt.next))
    : pos.map((p) => state.contacts.find((c) => c.id === p)).filter(Boolean);
  queue = queue.slice(0, left);
  const browser = await openBrowser();
  const page = browser.pages()[0] || (await browser.newPage());
  await ensureLoggedIn(page);
  for (const c of queue) {
    const note = (c.draft || (await draftContact(profile, c.id)).draft).connectionNote;
    console.log(`\n→ ${c.name} · ${c.title || ""} @ ${c.company || ""}\n  "${note}"`);
    const r = await prepareConnect(page, c.linkedinUrl, note);
    if (!r.ok) console.log(`  ! ${r.reason}`);
    else console.log("  Note is in the box. Edit if you like, then click Send in the browser.");
    const a = (await ask("  Sent? y / n (skip) / q (quit): ")).toLowerCase();
    if (a === "q") break;
    if (a === "y") { db.updateContact(c.id, { status: "sent", channel: "linkedin" }); console.log("  ✓ tracked (follow-up reminder in 5 days)"); }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
