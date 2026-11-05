// Runs the form-filling and LinkedIn helpers against local look-alike pages.
// Skipped automatically if Playwright isn't installed.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.JHA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "jha-"));
let chromium;
try { ({ chromium } = await import("playwright")); } catch {}
const { autofill } = await import("../src/apply/autofill.js");
const { prepareConnect, prepareMessage } = await import("../src/outreach/linkedin.js");
const { loadProfile } = await import("../src/config.js");

const PAGES = {
  "/greenhouse": `<form>
    <label for="first_name">First Name *</label><input id="first_name" required>
    <label for="last_name">Last Name *</label><input id="last_name" required>
    <label for="email">Email *</label><input id="email" type="email" required>
    <label for="phone">Phone</label><input id="phone" type="tel">
    <div class="field"><label>Resume/CV</label><input type="file" id="resume"></div>
    <div class="field"><label>Cover Letter</label><input type="file" id="cover_letter"></div>
    <div class="field"><label for="q1">LinkedIn Profile</label><input id="q1"></div>
    <div class="field"><label for="q2">Why do you want to work at Acme?</label><textarea id="q2"></textarea></div>
    <div class="field"><label for="q3">Are you legally authorized to work in Canada? *</label><select id="q3" required><option value="">Select...</option><option value="1">Yes</option><option value="0">No</option></select></div>
    <fieldset><legend>Will you require sponsorship?</legend><label><input type="radio" name="sp" value="y" required>Yes</label><label><input type="radio" name="sp" value="n">No</label></fieldset>
    <div class="field"><label for="q4">What is your gender?</label><select id="q4"><option value="">Select...</option><option>Woman</option><option>Decline to self-identify</option></select></div>
    <div class="field"><label for="q5">What are your salary expectations? *</label><input id="q5" required></div>
    <button type="submit">Submit application</button></form>`,
  "/done": `<h1>Thank you for applying!</h1>`,
  "/jobs/view/111/": `<main><h1>Finance Intern</h1><a href="/company/acme">Acme Air</a><div id="job-details">Forecast fares.</div>
    <button class="jobs-apply-button" onclick="window.open('/company-apply')">Apply</button></main>`,
  "/jobs/view/222/": `<main><h1>Ops Intern</h1><a href="/company/b">Beta</a><button class="jobs-apply-button">Easy Apply</button></main>`,
  "/company-apply": `<h1>Acme careers</h1>`,
  "/lever": `<form>
    <input name="name"><input name="email"><input name="phone"><input name="org">
    <input name="urls[LinkedIn]"><input name="urls[GitHub]"><input type="file" name="resume">
    <textarea name="comments"></textarea></form>`,
  "/in/ada": `<main><h1>Ada Lovelace</h1><button aria-label="More actions" onclick="document.getElementById('menu').hidden=false">More</button>
    <div id="menu" role="menu" hidden><div role="button" aria-label="Invite Ada Lovelace to connect" onclick="document.getElementById('dlg').hidden=false">Connect</div></div></main>
    <div id="dlg" role="dialog" hidden><button aria-label="Add a note" onclick="document.getElementById('note').hidden=false">Add a note</button>
    <div id="note" hidden><textarea name="message" id="custom-message"></textarea><button>Send</button></div></div>`,
  "/in/grace": `<main><h1>Grace</h1><button>Pending</button><a aria-label="Message Grace" href="#" onclick="document.getElementById('m').hidden=false;return false">Message</a></main>
    <div id="m" hidden><div class="msg-form__contenteditable" contenteditable="true"></div></div>`,
};

test("autofill + LinkedIn assisted send against look-alike pages", { skip: !chromium && "playwright not installed" }, async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<!doctype html><body>${PAGES[req.url] || ""}</body>`);
  }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const resume = path.join(process.env.JHA_DATA_DIR, "resume.pdf");
  fs.writeFileSync(resume, "%PDF-1.4 test");
  const profile = { ...loadProfile(), phone: "555-0100", resumePdfPath: resume };
  const draft = { coverLetter: "Dear Acme…", whyCompany: "Because of the mission.", whyRole: "I fit." };

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(base + "/greenhouse");
    const gh = await autofill(page, { company: "Acme" }, profile, draft);
    assert.equal(await page.inputValue("#first_name"), "Keneisha");
    assert.equal(await page.inputValue("#email"), profile.email);
    assert.equal(await page.inputValue("#q1"), profile.linkedin);
    assert.equal(await page.inputValue("#q2"), draft.whyCompany);
    assert.equal(await page.$eval("#resume", (e) => e.files[0]?.name), "resume.pdf");
    assert.match(await page.$eval("#cover_letter", (e) => e.files[0]?.name), /cover-letter\.txt$/);
    assert.equal(await page.inputValue("#q3"), "1");
    assert.equal(await page.$eval('input[name="sp"]:checked', (e) => e.value), "n");
    assert.equal(await page.$eval("#q4", (e) => e.selectedOptions[0].text), "Decline to self-identify");
    assert.deepEqual(gh.unfilled.map((u) => u.slice(0, 15)), ["What are your s"], "only the salary question is left for her");

    const { isConfirmed } = await import("../src/apply/autofill.js");
    assert.equal(await isConfirmed(page), false);
    await page.goto(base + "/done");
    assert.equal(await isConfirmed(page), true);

    await page.goto(base + "/lever");
    await autofill(page, { company: "Acme" }, profile, draft);
    assert.equal(await page.inputValue('input[name="name"]'), "Keneisha Baid");
    assert.equal(await page.inputValue('input[name="urls[GitHub]"]'), profile.github);
    assert.equal(await page.inputValue('textarea[name="comments"]'), draft.coverLetter);

    const { resolveLinkedInJob } = await import("../src/outreach/linkedin.js");
    const ctx = page.context();
    const ext = await resolveLinkedInJob(ctx, page, base + "/jobs/view/111/");
    assert.equal(ext.title, "Finance Intern");
    assert.equal(ext.company, "Acme Air");
    assert.equal(ext.externalUrl, base + "/company-apply");
    const easy = await resolveLinkedInJob(ctx, page, base + "/jobs/view/222/");
    assert.equal(easy.easyApply, true);

    const r = await prepareConnect(page, base + "/in/ada", "Hi Ada!");
    assert.deepEqual(r, { ok: true });
    assert.equal(await page.inputValue("#custom-message"), "Hi Ada!");

    const g = await prepareConnect(page, base + "/in/grace", "Hi");
    assert.equal(g.ok, false);
    assert.match(g.reason, /pending/);
    const m = await prepareMessage(page, base + "/in/grace", "Coffee?");
    assert.ok(m.ok);
    assert.equal(await page.textContent(".msg-form__contenteditable"), "Coffee?");
  } finally {
    await browser.close();
    server.close();
  }
});
