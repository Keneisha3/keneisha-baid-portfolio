// Turns any job-posting link into a tracked job. Most career sites (Workday,
// SuccessFactors, Greenhouse, Lever, iCIMS, Phenom, Taleo...) embed a
// schema.org JobPosting block for Google Jobs, which is what this reads.
import { htmlToText } from "./sources.js";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

function findPosting(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) { for (const n of node) { const f = findPosting(n); if (f) return f; } return null; }
  const type = [].concat(node["@type"] || []);
  if (type.includes("JobPosting")) return node;
  return findPosting(node["@graph"]) || findPosting(Object.values(node).filter((v) => typeof v === "object"));
}

const meta = (html, prop) => (html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)`, "i")) || [])[1];

export function parseJobPage(html, url) {
  for (const [, raw] of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(raw.trim()); } catch { continue; }
    const p = findPosting(data);
    if (!p) continue;
    const locs = [].concat(p.jobLocation || []).map((l) => {
      const a = l.address || {};
      return typeof a === "string" ? a : [a.addressLocality, a.addressRegion, a.addressCountry?.name || a.addressCountry].filter(Boolean).join(", ");
    });
    if (/TELECOMMUTE/i.test(p.jobLocationType || "")) locs.push("Remote");
    const org = p.hiringOrganization;
    return {
      title: htmlToText(p.title || ""),
      company: (typeof org === "string" ? org : org?.name) || "",
      location: [...new Set(locs.filter(Boolean))].join(" · "),
      description: htmlToText(p.description || ""),
      postedAt: p.datePosted, closesAt: p.validThrough, url: p.url || url,
    };
  }
  const title = meta(html, "og:title") || (html.match(/<title>([^<]*)/i) || [])[1] || "";
  return { title: htmlToText(title), company: meta(html, "og:site_name") || "", location: "", description: htmlToText(meta(html, "description") || meta(html, "og:description") || ""), url };
}

export function sourceFor(url) {
  const h = new URL(url).hostname;
  for (const [re, s] of [[/greenhouse\.io$/, "greenhouse"], [/lever\.co$/, "lever"], [/ashbyhq\.com$/, "ashby"], [/myworkdayjobs\.com$/, "workday"],
    [/workable\.com$/, "workable"], [/smartrecruiters\.com$/, "smartrecruiters"], [/recruitee\.com$/, "recruitee"]]) if (re.test(h)) return s;
  return "link";
}

/** Fetches and parses one URL. If the server-rendered page has nothing useful, renders it with Playwright when available. */
export async function importJobUrl(url) {
  if (/(^|\.)linkedin\.com$/i.test(new URL(url).hostname)) throw new Error("LinkedIn links need your logged-in browser: run `npm run jha -- add-job <link>` (or import-jobs linkedin.txt) in Terminal");
  let job = null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow" });
    if (res.ok) job = parseJobPage(await res.text(), res.url || url);
  } catch {}
  if (!job?.description || job.description.length < 200) {
    try {
      const { chromium } = await import("playwright");
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage({ userAgent: UA });
        await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
        const rendered = parseJobPage(await page.content(), page.url());
        if (!rendered.description || rendered.description.length < 200) rendered.description = (await page.locator("main, body").first().innerText()).slice(0, 15000);
        job = rendered;
      } finally { await browser.close(); }
    } catch (e) { if (!job) throw new Error(`couldn't read ${url}: ${e.message}`); }
  }
  const source = sourceFor(url);
  return { ...job, source, externalId: job.url || url, applyUrl: url, url: job.url || url, manualApply: !["greenhouse", "lever", "ashby", "workable", "recruitee", "smartrecruiters"].includes(source) };
}
