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

  // Generic label-driven pass for everything else (custom questions, Ashby, Workday-lite forms).
  const controls = page.locator("input:visible, textarea:visible");
  const count = await controls.count();
  for (let i = 0; i < count; i++) {
    const el = controls.nth(i);
    const type = (await el.getAttribute("type")) || "text";
    if (!["text", "email", "tel", "url", "search", null].includes(type) && (await el.evaluate((n) => n.tagName)) !== "TEXTAREA") continue;
    if (await el.inputValue().catch(() => "x")) continue;
    const label = await describe(el);
    if (!label) continue;
    let value;
    for (const [re, get] of FIELD_MAP) if (re.test(label)) { value = get(profile); break; }
    if (!value && draft) {
      if (/why .*(role|position|team|fit|good candidate|qualified)|tell us about yourself|additional information/i.test(label)) value = draft.whyRole;
      else if (/why .*(want to (work|join)|company|\bus\b|join|work (here|at|for)|interested|excited)/i.test(label)) value = draft.whyCompany;
    }
    if (value) {
      await el.fill(value);
      filled.push(label.slice(0, 60));
      await pause(150, 400);
    } else if (await el.evaluate((n) => n.required || n.getAttribute("aria-required") === "true")) {
      unfilled.push(label.slice(0, 80));
    }
  }

  return { filled, unfilled };
}

/** The visible text that labels a control: <label for>, wrapping label, aria-label, or nearby question text. */
async function describe(locator) {
  return locator
    .evaluate((el) => {
      const txt = (n) => (n?.innerText || n?.textContent || "").replace(/\s+/g, " ").trim();
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
    })
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
