// Fills in Greenhouse / Lever / Ashby application forms (and makes a best effort
// on others) using your profile + the tailored draft, uploads your resume, then
// hands control to you to review, answer anything it couldn't, and submit.
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, ROOT } from "../paths.js";
import { pause } from "../browser.js";

// Each entry: label patterns -> profile value getter.
const FIELD_MAP = [
  [/^first name|preferred first/i, (p) => p.firstName],
  [/^last name|surname|family name/i, (p) => p.lastName],
  [/^(full )?name\b/i, (p) => p.name],
  [/e-?mail/i, (p) => p.email],
  [/phone|mobile/i, (p) => p.phone],
  [/linkedin/i, (p) => p.linkedin],
  [/github/i, (p) => p.github],
  [/portfolio|website|personal site/i, (p) => p.website],
  [/current (company|employer)|^company$|organization/i, (p) => p.currentCompany],
  [/school|university|college/i, (p) => p.schoolName],
  [/degree|program|major|discipline/i, (p) => p.program],
  [/graduation|grad(uation)? (date|year)/i, (p) => p.gradDate],
  [/^location|current location|city/i, (p) => p.location],
  [/pronouns/i, (p) => p.pronouns],
  [/how did you hear/i, () => "Company careers page"],
];

export async function autofill(page, job, profile, draft) {
  const filled = [];
  const unfilled = [];

  // Lever and Greenhouse have stable field names; try them first.
  const direct = {
    'input[name="name"]': profile.name,
    'input[name="email"]': profile.email,
    'input[name="phone"]': profile.phone,
    'input[name="org"]': profile.currentCompany,
    'input[name="urls[LinkedIn]"]': profile.linkedin,
    'input[name="urls[GitHub]"]': profile.github,
    'input[name="urls[Portfolio]"]': profile.website,
    "#first_name": profile.firstName,
    "#last_name": profile.lastName,
    "#email": profile.email,
    "#phone": profile.phone,
    "#_systemfield_name": profile.name,
    "#_systemfield_email": profile.email,
  };
  for (const [sel, value] of Object.entries(direct)) {
    if (!value) continue;
    const el = page.locator(sel).first();
    if ((await el.count()) && (await el.isVisible().catch(() => false)) && !(await el.inputValue().catch(() => "x"))) {
      await el.fill(value);
      filled.push(sel);
      await pause(150, 400);
    }
  }

  // Resume upload.
  const resumePath = profile.resumePdfPath && path.resolve(ROOT, profile.resumePdfPath);
  if (resumePath && fs.existsSync(resumePath)) {
    const fileInputs = page.locator('input[type="file"]');
    const n = await fileInputs.count();
    for (let i = 0; i < n; i++) {
      const input = fileInputs.nth(i);
      const ctx = (await describe(input)).toLowerCase();
      if (/cover/.test(ctx)) continue;
      if (/resume|cv/.test(ctx) || n === 1 || i === 0) {
        await input.setInputFiles(resumePath);
        filled.push("resume upload");
        break;
      }
    }
  } else {
    unfilled.push("resume (set resumePdfPath in config/profile.json)");
  }

  // Cover letter: textarea if there is one, otherwise upload as a .txt file.
  if (draft?.coverLetter) {
    const ta = page.locator('textarea[name="comments"], textarea#cover_letter_text, textarea[name*="cover" i]').first();
    if ((await ta.count()) && (await ta.isVisible().catch(() => false))) {
      await ta.fill(draft.coverLetter);
      filled.push("cover letter (text)");
    } else {
      const coverInput = await findFileInput(page, /cover/i);
      if (coverInput) {
        const dir = path.join(DATA_DIR, "cover-letters");
        fs.mkdirSync(dir, { recursive: true });
        const f = path.join(dir, `${slug(profile.name)}-${slug(job.company)}-cover-letter.txt`);
        fs.writeFileSync(f, draft.coverLetter);
        await coverInput.setInputFiles(f);
        filled.push("cover letter (file)");
      }
    }
  }

  // Generic label-driven pass for everything else (custom questions, Ashby, other ATSs).
  const controls = page.locator("input:visible, textarea:visible");
  const count = await controls.count();
  for (let i = 0; i < count; i++) {
    const el = controls.nth(i);
    const type = ((await el.getAttribute("type")) || "text").toLowerCase();
    if (!["text", "email", "tel", "url", "search", "textarea"].includes(type)) continue;
    if (await el.inputValue().catch(() => "x")) continue;
    if ((await el.getAttribute("role")) === "combobox") continue;
    const label = await describe(el);
    if (!label) continue;
    const value = answerFor(label, profile, draft);
    if (value) {
      await el.fill(value);
      filled.push(label.slice(0, 60));
      await pause(120, 300);
    }
  }

  // Dropdowns and yes/no radios, answered from profile.screeningAnswers.
  const selects = page.locator("select:visible");
  for (let i = 0, n = await selects.count(); i < n; i++) {
    const el = selects.nth(i);
    if (await el.evaluate((s) => s.selectedIndex > 0 && s.value)) continue;
    const label = await describe(el);
    const want = screeningAnswer(label, profile);
    if (!want) continue;
    const options = await el.evaluate((s) => [...s.options].map((o) => ({ v: o.value, t: o.text.trim() })));
    const hit = pickOption(options.map((o) => o.t), want);
    if (hit >= 0) { await el.selectOption(options[hit].v); filled.push(label.slice(0, 60)); }
  }
  const radioGroups = await page.evaluate(() => [...new Set([...document.querySelectorAll('input[type="radio"]')].filter((r) => r.offsetParent).map((r) => r.name))]);
  for (const name of radioGroups) {
    const group = page.locator(`input[type="radio"][name="${name}"]`);
    if (await group.evaluateAll((rs) => rs.some((r) => r.checked))) continue;
    const label = await describe(group.first(), true);
    const want = screeningAnswer(label, profile);
    if (!want) continue;
    const texts = [];
    for (let i = 0, n = await group.count(); i < n; i++) texts.push(await describe(group.nth(i)));
    const hit = pickOption(texts, want);
    if (hit >= 0) { await group.nth(hit).check({ force: true }).catch(() => {}); filled.push(label.slice(0, 60)); }
  }

  unfilled.push(...(await requiredStillEmpty(page)));
  return { filled, unfilled: [...new Set(unfilled)] };
}

// ---------- answering ----------

const EEO = /gender|race|ethnic|hispanic|latino|disab|veteran|indigenous|aboriginal|visible minorit|sexual orientation|lgbt|transgender/i;

/** Maps a form question to one of your saved answers. Returns "" when it shouldn't be answered automatically. */
export function screeningAnswer(label = "", profile = {}) {
  const a = profile.screeningAnswers || {};
  const L = label.toLowerCase();
  if (EEO.test(L)) return a.declineDemographicQuestions ? "__decline__" : "";
  const us = /(u\.s\.|\bus\b|united states|america)/.test(L);
  if (/sponsor/.test(L)) return us ? a.needsSponsorshipUS : a.needsSponsorshipCanada;
  if (/(authori[sz]ed|eligible|legally (able|entitled)|right) to work/.test(L)) return us ? a.workAuthUS : a.workAuthCanada;
  if (/relocat/.test(L)) return a.willingToRelocate;
  if (/(co-?op|internship|work) term (length|duration)|how (many|long).*(months|term)|duration of (your )?(term|internship|co-?op)/.test(L)) return a.termLength;
  if (/start date|available to start|when can you start|availability/.test(L)) return a.startDate;
  if (/enrolled in (a )?co-?op|co-?op (program|student)/.test(L)) return a.coopProgram;
  if (/currently (enrolled|a student)|returning to (school|studies)|full[- ]time student/.test(L)) return a.currentlyEnrolled;
  if (/hear about|how did you find|referral source|source of application/.test(L)) return a.heardFrom;
  if (/salary|compensation|pay expectation|desired (pay|wage)/.test(L)) return a.salaryExpectation;
  return "";
}

function answerFor(label, profile, draft) {
  for (const [re, get] of FIELD_MAP) if (re.test(label)) return get(profile);
  const s = screeningAnswer(label, profile);
  if (s && s !== "__decline__") return s;
  if (!draft) return "";
  if (/why .*(role|position|team|fit|good candidate|qualified)|tell us about yourself|additional information|anything else/i.test(label)) return draft.whyRole;
  if (/why .*(want to (work|join)|company|\bus\b|join|work (here|at|for)|interested|excited)/i.test(label)) return draft.whyCompany;
  return "";
}

/** Index of the option that matches the wanted answer ("Yes", "January 2027", or "__decline__"). */
export function pickOption(texts, want) {
  const norm = (t) => t.toLowerCase().replace(/\s+/g, " ").trim();
  const opts = texts.map(norm);
  if (want === "__decline__") return opts.findIndex((t) => /decline|prefer not|do not wish|don.t wish|choose not/.test(t));
  const w = norm(want);
  let i = opts.findIndex((t) => t === w);
  if (i < 0 && /^(yes|no)$/.test(w)) i = opts.findIndex((t) => t.startsWith(w + " ") || t.startsWith(w + ",") || t.startsWith(w + "-") || t === w);
  if (i < 0) i = opts.findIndex((t) => t && !/^(select|choose|--)/.test(t) && (t.includes(w) || w.includes(t)));
  return i;
}

/** Labels of required fields that are still blank (text, selects, radios, files, checkboxes). */
async function requiredStillEmpty(page) {
  return page.evaluate(() => {
    const txt = (n) => (n?.innerText || n?.textContent || "").replace(/\s+/g, " ").trim();
    const labelOf = (el) => {
      if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return txt(l); }
      const f = el.closest("label, fieldset, .field, .application-question, [class*=field], [class*=question]");
      return (f && txt(f.querySelector("legend, label, .application-label, .text")) || txt(f)).slice(0, 90) || el.name || "(unnamed field)";
    };
    const req = (el) => el.required || el.getAttribute("aria-required") === "true";
    const out = [];
    const seenRadio = new Set();
    for (const el of document.querySelectorAll("input, select, textarea")) {
      if (!el.offsetParent || !req(el) || el.type === "hidden") continue;
      if (el.type === "radio") {
        if (seenRadio.has(el.name)) continue;
        seenRadio.add(el.name);
        if (![...document.getElementsByName(el.name)].some((r) => r.checked)) out.push(labelOf(el));
      } else if (el.type === "checkbox") { if (!el.checked) out.push(labelOf(el)); }
      else if (el.type === "file") { if (!el.files?.length) out.push(labelOf(el)); }
      else if (!el.value) out.push(labelOf(el));
    }
    return out;
  });
}

const CONFIRM = /thank(s| you) for (applying|your (application|interest))|application (has been |was )?(received|submitted|complete)|we('|’)ve received your application|successfully (applied|submitted)/i;
/** True once the page shows an application confirmation. */
export async function isConfirmed(page) {
  if (/\/confirmation|\/thank-?you|application-?submitted/i.test(page.url())) return true;
  const body = await page.locator("body").innerText({ timeout: 2000 }).catch(() => "");
  return CONFIRM.test(body.slice(0, 5000));
}

/** The visible text that labels a control: <label for>, wrapping label, aria-label, or nearby question text. */
async function describe(locator, group = false) {
  return locator
    .evaluate((el, group) => {
      const txt = (n) => (n?.innerText || n?.textContent || "").replace(/\s+/g, " ").trim();
      if (group) {
        const fs = el.closest("fieldset, [role=radiogroup], .field, .application-question, [class*=question]");
        const q = fs && (fs.querySelector("legend, .application-label, label:not(:has(input))") || fs);
        if (q) return txt(q).slice(0, 200);
      }
      if (el.id) {
        const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (l) return txt(l);
      }
      const wrap = el.closest("label");
      if (wrap) return txt(wrap);
      if (el.getAttribute("aria-label")) return el.getAttribute("aria-label");
      const by = el.getAttribute("aria-labelledby");
      if (by) return by.split(" ").map((i) => txt(document.getElementById(i))).join(" ");
      const field = el.closest(".field, .application-question, .form-field, fieldset, [class*=field]");
      if (field) return txt(field.querySelector("label, legend, .text, .application-label")) || "";
      return el.getAttribute("name") || el.getAttribute("placeholder") || "";
    }, group)
    .catch(() => "");
}

async function findFileInput(page, re) {
  const inputs = page.locator('input[type="file"]');
  const n = await inputs.count();
  for (let i = 0; i < n; i++) if (re.test(await describe(inputs.nth(i)))) return inputs.nth(i);
  return null;
}

export async function clickSubmit(page) {
  const btn = page
    .locator('button[type="submit"], input[type="submit"], button:has-text("Submit application"), button:has-text("Submit")')
    .first();
  await btn.scrollIntoViewIfNeeded();
  await pause(800, 1500);
  await btn.click();
}

export async function openApplication(page, job) {
  let url = job.applyUrl || job.url;
  if (job.source === "lever" && !/\/apply\/?$/.test(url)) url = url.replace(/\/?$/, "/apply");
  await page.goto(url, { waitUntil: "domcontentloaded" });
  // Some boards render an "Apply" button before the form.
  const applyBtn = page.locator('a:has-text("Apply for this job"), button:has-text("Apply for this job"), a:has-text("Apply now"), button:has-text("Apply")').first();
  if ((await page.locator("form input").count()) < 3 && (await applyBtn.count())) {
    await applyBtn.click().catch(() => {});
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  await pause();
}

const slug = (s = "") => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
