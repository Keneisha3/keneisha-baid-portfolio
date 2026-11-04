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
    return { ok: false, reason: "couldn't open the note box (you may be out of personalised invites this month); note copied below" };
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
