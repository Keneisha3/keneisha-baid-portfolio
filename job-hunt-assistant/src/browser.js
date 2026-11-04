// Opens a real, visible Chrome window with its own persistent profile folder so
// you stay logged in (LinkedIn, ATS accounts) between runs. You can always see
// and override what it is doing.
import readline from "node:readline/promises";
import { BROWSER_PROFILE_DIR } from "./paths.js";

export async function openBrowser() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error("Playwright is not installed. Run:  npm install playwright && npx playwright install chromium");
  }
  const opts = { headless: false, viewport: null, args: ["--start-maximized"] };
  if (process.env.JHA_CHROME_PATH) opts.executablePath = process.env.JHA_CHROME_PATH;
  else if (process.env.JHA_USE_CHROME !== "0") opts.channel = "chrome"; // your installed Chrome, if present
  try {
    return await chromium.launchPersistentContext(BROWSER_PROFILE_DIR, opts);
  } catch (e) {
    if (!opts.channel) throw e;
    delete opts.channel; // fall back to Playwright's bundled Chromium
    return chromium.launchPersistentContext(BROWSER_PROFILE_DIR, opts);
  }
}

export async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Human-ish pause so actions are not machine-gunned. */
export const pause = (min = 600, max = 1600) => sleep(min + Math.random() * (max - min));
