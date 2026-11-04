#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import * as db from "./db.js";
import { loadProfile, loadTargets } from "./config.js";
import { CONFIG_DIR } from "./paths.js";
import { discover, draftJob, draftContact } from "./commands.js";
import { openBrowser, ask } from "./browser.js";
import { openApplication, autofill, clickSubmit } from "./apply/autofill.js";
import { ensureLoggedIn, prepareConnect, prepareMessage, searchLinks } from "./outreach/linkedin.js";
import { startServer } from "./server.js";

const HELP = `
job-hunt-assistant — find roles, apply faster, book coffee chats, track it all.

SETUP
  init                         Create config/profile.json + targets.json from the examples
  serve [--port 4321]          Open the tracker dashboard (http://localhost:4321)

JOBS
  discover                     Pull new postings from your target companies' job boards
  jobs [--status drafted]      List tracked jobs (best matches first)
  draft <jobId> | --top N      Write a tailored cover letter + answers (Claude)
  apply <jobId> [--submit]     Open the form, autofill everything, you review & submit
                               (--submit clicks Submit for you after you press Enter)
  apply --next N               Work through your top N drafted jobs one by one

COFFEE CHATS (LinkedIn)
  people <company>             Search links to find alumni / people in your target roles
  add-contact --url <linkedin profile> --name ".." [--title ..] [--company ..]
              [--reason "why them"] [--job <jobId>] [--notes ".."]
  contacts [--status sent]     List contacts
  draft-outreach <id> | --all  Write connection note + coffee-chat ask + nudge (Claude)
  connect <id> | --next N      Open profile, paste note in Connect dialog; you press Send
  message <id> [--nudge]       Paste the coffee-chat ask (or nudge) into a DM; you press Send

TRACKING
  followups                    What needs a nudge today
  set <id> <status>            e.g. set a1b2c3 interviewing  |  set f00d42 chat_booked
                               jobs:     ${db.APP_STATUSES.join(", ")}
                               contacts: ${db.CONTACT_STATUSES.join(", ")}
  stats
`;

const [cmd, ...rest] = process.argv.slice(2);
const { values: opt, positionals: pos } = parseArgs({
  args: rest,
  allowPositionals: true,
  options: {
    port: { type: "string" }, status: { type: "string" }, top: { type: "string" }, next: { type: "string" },
    submit: { type: "boolean" }, all: { type: "boolean" }, nudge: { type: "boolean" },
    url: { type: "string" }, name: { type: "string" }, title: { type: "string" }, company: { type: "string" },
    reason: { type: "string" }, job: { type: "string" }, notes: { type: "string" },
  },
});

const fmtJob = (j) => `${j.id}  ${String(j.matchScore ?? "").padStart(3)}  ${j.status.padEnd(12)} ${j.company} · ${j.title} (${j.location})`;
const fmtContact = (c) => `${c.id}  ${c.status.padEnd(12)} ${c.name} · ${c.title || ""} @ ${c.company || ""}${c.followUpOn ? `  [follow up ${c.followUpOn}]` : ""}`;

async function main() {
  switch (cmd) {
    case "init": {
      for (const n of ["profile", "targets"]) {
        const dest = path.join(CONFIG_DIR, `${n}.json`);
        if (fs.existsSync(dest)) console.log(`exists: config/${n}.json`);
        else fs.copyFileSync(path.join(CONFIG_DIR, `${n}.example.json`), dest), console.log(`created: config/${n}.json`);
      }
      console.log("Next: edit those two files, drop your resume at config/resume.pdf (+ text in config/resume.txt).");
      return;
    }
    case "serve":
      return startServer(Number(opt.port || 4321));

    case "discover":
      await discover(loadProfile(), loadTargets());
      return;
    case "jobs": {
      const jobs = db.read().jobs.filter((j) => !opt.status || j.status === opt.status).sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
      jobs.forEach((j) => console.log(fmtJob(j)));
      if (!jobs.length) console.log("No jobs yet. Run: discover");
      return;
    }
    case "draft": {
      const profile = loadProfile();
      const ids = opt.top
        ? db.read().jobs.filter((j) => j.status === "found").sort((a, b) => b.matchScore - a.matchScore).slice(0, Number(opt.top)).map((j) => j.id)
        : pos;
      for (const jobId of ids) {
        const j = await draftJob(profile, jobId);
        console.log(`\n=== ${j.company} · ${j.title}  (fit ${j.draft.fitScore ?? "?"})\n${j.draft.fitSummary}\n\n${j.draft.coverLetter}`);
      }
      return;
    }
    case "apply": {
      const profile = loadProfile();
      const state = db.read();
      const jobs = opt.next
        ? state.jobs.filter((j) => j.status === "drafted").sort((a, b) => b.matchScore - a.matchScore).slice(0, Number(opt.next))
        : pos.map((p) => state.jobs.find((j) => j.id === p)).filter(Boolean);
      if (!jobs.length) throw new Error("No matching jobs. Try: jobs --status drafted");
      const browser = await openBrowser();
      const page = browser.pages()[0] || (await browser.newPage());
      for (const job of jobs) {
        console.log(`\n→ ${job.company} · ${job.title}\n  ${job.applyUrl}`);
        const draft = job.draft || (await draftJob(profile, job.id)).draft;
        await openApplication(page, job);
        const { filled, unfilled } = await autofill(page, job, profile, draft);
        console.log(`  Filled ${filled.length} field(s).`);
        if (unfilled.length) console.log(`  Needs you:\n   - ${unfilled.join("\n   - ")}`);
        console.log("  Check the form in the browser (EEO questions, dropdowns, captcha are yours).");
        const a = (await ask(opt.submit ? "  Enter = click Submit, s = skip: " : "  Submitted it yourself? y = mark applied, s = skip: ")).toLowerCase();
        if (a === "s") { db.updateJob(job.id, { status: "skipped" }); continue; }
        if (opt.submit) await clickSubmit(page);
        if (opt.submit || a === "y") { db.updateJob(job.id, { status: "applied" }); console.log("  ✓ marked applied (follow-up reminder in 7 days)"); }
      }
      await browser.close();
      return;
    }

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
      if (!opt.url || !opt.name) throw new Error('Usage: add-contact --url <linkedin url> --name "Full Name" [--title] [--company] [--reason] [--job]');
      const c = db.addContact({ linkedinUrl: opt.url, name: opt.name, title: opt.title, company: opt.company, reason: opt.reason, jobId: opt.job, notes: opt.notes || "" });
      console.log(`Added ${fmtContact(c)}`);
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
      for (const cid of ids) {
        const c = await draftContact(profile, cid);
        console.log(`\n=== ${c.name} (${c.draft.connectionNote.length} chars)\n${c.draft.connectionNote}\n--- after they accept:\n${c.draft.followUp}`);
      }
      return;
    }
    case "connect": {
      const profile = loadProfile(), targets = loadTargets();
      const limit = targets.outreach?.dailyLimit ?? 15;
      const state = db.read();
      let queue = opt.next
        ? state.contacts.filter((c) => ["to_contact", "drafted"].includes(c.status)).slice(0, Number(opt.next))
        : pos.map((p) => state.contacts.find((c) => c.id === p)).filter(Boolean);
      const left = limit - db.sentToday(state);
      if (left <= 0) return console.log(`Daily limit of ${limit} invites reached. Spacing these out keeps your account healthy.`);
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
        if (a === "y") { db.updateContact(c.id, { status: "sent" }); console.log("  ✓ tracked (follow-up reminder in 5 days)"); }
      }
      await browser.close();
      return;
    }
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
      const a = (await ask("  Sent? y/n: ")).toLowerCase();
      if (a === "y") db.updateContact(c.id, { status: c.status === "sent" ? "accepted" : c.status, lastMessagedAt: db.now(), followUpOn: db.addDays(db.now(), 7) });
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

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
