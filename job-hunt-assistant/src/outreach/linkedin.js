// LinkedIn "assisted send".
//
// LinkedIn's User Agreement forbids bots that send messages or invitations on
// your behalf, and accounts that do it get restricted. So this module does all
// the tedious parts (opens the profile, opens the Connect dialog, pastes your
// personalised note) and then YOU press Send. That one click keeps your account
// safe and lets you sanity-check every message.
import { pause } from "../browser.js";

export async function ensureLoggedIn(page) {
  await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });
  if (/login|checkpoint|authwall|signup/.test(page.url())) {
    console.log("\n  Log in to LinkedIn in the browser window (only needed once; the session is saved).");
    await page.waitForURL(/linkedin\.com\/(feed|in\/|mynetwork)/, { timeout: 5 * 60_000 });
  }
}

/** Opens the profile and the connect-with-note dialog, pastes the note. Returns what happened. */
export async function prepareConnect(page, profileUrl, note) {
  await page.goto(profileUrl, { waitUntil: "domcontentloaded" });
  await pause(1500, 3000);
  const main = page.locator("main").first();

  let connect = main.locator('button[aria-label*="to connect" i], a[aria-label*="to connect" i]').first();
  if (!(await connect.isVisible().catch(() => false))) {
    // Hidden behind the "More" menu on many profiles.
    const more = main.locator('button[aria-label="More actions"], button:has-text("More")').first();
    if (await more.isVisible().catch(() => false)) {
      await more.click();
      await pause(400, 900);
      connect = page.locator('[role="menu"] [aria-label*="connect" i], div[role="button"]:has-text("Connect")').first();
    }
  }
  if (!(await connect.isVisible().catch(() => false))) {
    const pending = await main.locator('button:has-text("Pending")').count();
    const message = await main.locator('button:has-text("Message"), a:has-text("Message")').count();
    return { ok: false, reason: pending ? "invitation already pending" : message ? "already connected (use `message` instead)" : "no Connect button found" };
  }

  await connect.click();
  await pause(600, 1200);
  const addNote = page.locator('button[aria-label="Add a note"], button:has-text("Add a note")').first();
  if (await addNote.isVisible().catch(() => false)) {
    await addNote.click();
    await pause(400, 900);
  }
  const box = page.locator('textarea[name="message"], textarea#custom-message, [role="dialog"] textarea').first();
  if (!(await box.isVisible().catch(() => false))) {
    return { ok: false, reason: "no note box: free LinkedIn accounts only get a few personalised notes a month. Click \"Send without a note\", and send the coffee-chat ask with `message` once they accept" };
  }
  await box.fill(note);
  return { ok: true };
}

/** For people already connected: opens a message thread and types the follow-up (you press Send). */
export async function prepareMessage(page, profileUrl, text) {
  await page.goto(profileUrl, { waitUntil: "domcontentloaded" });
  await pause(1500, 3000);
  const btn = page.locator('main button[aria-label^="Message"], main a[aria-label^="Message"]').first();
  if (!(await btn.isVisible().catch(() => false))) return { ok: false, reason: "no Message button (not connected yet?)" };
  await btn.click();
  await pause(800, 1500);
  const box = page.locator('.msg-form__contenteditable[contenteditable="true"]').last();
  if (!(await box.isVisible().catch(() => false))) return { ok: false, reason: "message box didn't open" };
  await box.click();
  await page.keyboard.insertText(text);
  return { ok: true };
}

/** Search links for finding the right people at a company. You browse; you pick. */
export function searchLinks(company, { roles = [], school, schoolSlug } = {}) {
  const q = (s) => encodeURIComponent(s.trim().replace(/\s+/g, " "));
  const links = [];
  if (schoolSlug) links.push({ label: `${school || "Your school"} alumni at ${company}`, url: `https://www.linkedin.com/school/${schoolSlug}/people/?keywords=${q(company)}` });
  for (const r of roles) links.push({ label: `${r} at ${company}`, url: `https://www.linkedin.com/search/results/people/?keywords=${q(`${r} ${company}`)}` });
  links.push({ label: `Recruiters at ${company}`, url: `https://www.linkedin.com/search/results/people/?keywords=${q(`recruiter ${company}`)}` });
  if (school) links.push({ label: `${school} + ${company} (any role)`, url: `https://www.linkedin.com/search/results/people/?keywords=${q(`${company} ${school}`)}` });
  return links;
}

// ---------- LinkedIn jobs ----------
// LinkedIn doesn't allow automated crawling, so: the tool builds the searches,
// you browse and pick, and for each job you pick it follows the "Apply" button
// to the company's own posting (which the rest of the tool can read and autofill).

/** Job searches: internship experience level, posted in the last week, newest first. */
export function jobSearchLinks(roles = [], locations = []) {
  const q = encodeURIComponent;
  const out = [];
  for (const loc of locations) for (const r of roles)
    out.push({ label: `${r} · ${loc}`, url: `https://www.linkedin.com/jobs/search/?keywords=${q(r)}&location=${q(loc)}&f_E=1&f_TPR=r604800&sortBy=DD` });
  return out;
}

export const isLinkedInJob = (u) => /linkedin\.com\/jobs\/(view|collections|search)/i.test(u) || /linkedin\.com\/.*currentJobId=/i.test(u);
export function linkedInJobUrl(u) {
  const id = (u.match(/currentJobId=(\d+)/) || u.match(/jobs\/view\/(?:[^/]*?-)?(\d+)/) || [])[1];
  return id ? `${new URL(u).origin}/jobs/view/${id}/` : u;
}

/** Opens one LinkedIn job (in your logged-in browser) and returns its basics plus the company's apply link, if it has one. */
export async function resolveLinkedInJob(context, page, url) {
  await page.goto(linkedInJobUrl(url), { waitUntil: "domcontentloaded" });
  await pause(1500, 2500);
  const top = await page.evaluate(() => {
    const t = (sel) => document.querySelector(sel)?.innerText?.trim() || "";
    return {
      title: t("h1") || document.title.split(" | ")[0],
      company: t(".job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, a[href*='/company/']"),
      location: t(".job-details-jobs-unified-top-card__primary-description-container span, .jobs-unified-top-card__bullet"),
      description: t("#job-details, .jobs-description__content, .jobs-box__html-content").slice(0, 15000),
    };
  });
  const apply = page.locator('button.jobs-apply-button, button:has-text("Apply"), a:has-text("Apply")').first();
  const label = (await apply.innerText().catch(() => "")) || "";
  if (!label || /easy apply/i.test(label)) return { ...top, easyApply: /easy apply/i.test(label), externalUrl: null };
  // Clicking Apply opens the company site in a new tab (sometimes after a "Continue" dialog).
  const popup = context.waitForEvent("page", { timeout: 8000 }).catch(() => null);
  await apply.click().catch(() => {});
  const cont = page.locator('button:has-text("Continue")').first();
  if (await cont.isVisible({ timeout: 1500 }).catch(() => false)) await cont.click().catch(() => {});
  const ext = await popup;
  let externalUrl = null;
  if (ext) {
    await ext.waitForLoadState("domcontentloaded").catch(() => {});
    externalUrl = ext.url();
    await ext.close().catch(() => {});
  }
  return { ...top, easyApply: false, externalUrl };
}
