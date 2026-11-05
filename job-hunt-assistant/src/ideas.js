// "Pitch them something real": research a company's public signals (blog,
// changelog, docs, job posts, reviews, founder posts), find problems with
// evidence, propose builds that fit your skills, and write a one-page proposal
// you can link from a cold email. Everything is framed as an outside-in
// hypothesis, never as insider knowledge.
import fs from "node:fs";
import path from "node:path";
import * as z from "zod/v4";
import * as db from "./db.js";
import { DATA_DIR, ROOT } from "./paths.js";
import { engineFor, runClaudeCode, getClient, profileBlurb, jsonSchemaOf } from "./ai.js";
import { collectSignals, ruleIdeas, signalsBlock } from "./research.js";

export const IdeaDraft = z.object({
  oneLiner: z.string().describe("What the company does, in one plain sentence"),
  signals: z.array(z.object({
    type: z.enum(["blog", "changelog", "docs", "jobs", "reviews", "news", "social", "pricing", "other"]),
    finding: z.string().describe("What it says, in one sentence"),
    source: z.string().describe("The exact URL you read"),
  })).describe("4-8 concrete things you found, newest first, each from a page you actually opened"),
  problems: z.array(z.object({
    problem: z.string().describe("A problem or opportunity they likely have, as a hypothesis"),
    evidence: z.string().describe("Why you think so, pointing at the signals"),
  })).describe("2-4 problems, strongest evidence first"),
  ideas: z.array(z.object({
    title: z.string().describe("Short name for the build, e.g. 'Churn early-warning dashboard for CS'"),
    kind: z.enum(["feature", "internal tool", "analysis", "growth experiment", "sales/GTM play", "financial model"]),
    pitch: z.string().describe("2-3 sentences: what it is and who it helps"),
    weekPlan: z.string().describe("How SHE could build or test a first version in about a week, with tools she knows"),
    metric: z.string().describe("The one number that would show it worked"),
    impact: z.number().describe("1-5"),
    feasibility: z.number().describe("1-5: can a strong intern ship v1 in a week from outside the company?"),
  })).describe("3 ideas that use her real skills (data/BI, automation, Python/TypeScript/React, forecasting, finance models, sales ops/CRM, process design)"),
  bestIdea: z.string().describe("Title of the idea to lead with"),
  onePager: z.string().describe("Markdown, under 450 words: '# <idea title> for <company>', then sections: The problem (with evidence and links), The idea, How it would work (bullets), A one-week plan, How we'd know it worked, Why me (2 lines, real facts only), and a closing line that this is built from public information and she'd love to be told what she got wrong."),
  emailHook: z.string().describe("1-2 sentences for a cold email that name the problem and the idea, specific enough to prove she did the work"),
});

const LOOK_AT = `Research it like a sharp new hire would before day one. Open and read (prefer the last 6 months):
- their blog / engineering blog / changelog or release notes / docs
- their careers page and open roles (what they're hiring for reveals priorities and pain)
- customer reviews and complaints (G2, Capterra, App Store/Google Play, Reddit, Hacker News, Trustpilot)
- founder or exec posts, podcasts, interviews; funding or expansion news; pricing page
Then find problems or opportunities with evidence, and propose builds that a strong intern could ship a first version of in about a week from the outside (public data, a prototype, an analysis, a model, a GTM experiment). Prefer ideas that use her real skills. Be specific and honest: these are hypotheses from public info, never claims of insider knowledge; never invent numbers or sources. Only cite URLs you actually opened.`;

export function ideaPrompt(profile, target) {
  return `You're helping ${profile.name}, a student, prepare a genuinely useful idea to pitch to ${target.company}.

## About her
${profileBlurb(profile)}

## The company
${target.company}${target.title ? ` (she's interested in: ${target.title})` : ""}${target.region === "uk" ? " · London/UK" : ""}${target.companySize ? ` · ${target.companySize}` : ""}
${target.notes ? `Notes: ${target.notes}` : ""}
${target.research ? `Earlier research:\n${target.research}` : ""}
${target.description ? `Job posting excerpt:\n${String(target.description).slice(0, 2500)}` : ""}
${signalsBlock(target.collected || [])}

## Task
${LOOK_AT}${(target.collected || []).length >= 5 ? "\nStart from the gathered signals above. Only search or fetch to fill clear gaps (reviews, founder posts), at most 4 lookups." : ""}`;
}

/**
 * Research + ideation for one company.
 * 1. Code gathers public signals (free, ~10s).
 * 2. engine "template" (or --rules): rules turn signals into ideas. No AI.
 *    engine "claude-code"/"api": Claude reasons over the signals, browsing only to fill gaps.
 *    --fast: Claude gets the signals but no browsing at all (one quick turn).
 */
export async function generateIdea(profile, target, { rules = false, fast = false, log = () => {} } = {}) {
  const { signals } = await collectSignals(target, { log });
  const engine = rules ? "template" : engineFor(profile);
  if (!["claude-code", "api"].includes(engine)) return ruleIdeas(profile, target, signals);
  const prompt = ideaPrompt(profile, { ...target, collected: signals });
  try {
    return await claudeIdea(engine, prompt, fast);
  } catch (e) {
    log(`  (Claude unavailable: ${e.message.slice(0, 120)}. Using rules instead.)`);
    return ruleIdeas(profile, target, signals);
  }
}

async function claudeIdea(engine, prompt, fast) {
  if (engine === "claude-code") {
    const out = await runClaudeCode(prompt, { schema: jsonSchemaOf(IdeaDraft), tools: fast ? "" : "WebSearch,WebFetch" });
    return { ...IdeaDraft.parse(out.structured_output ?? JSON.parse(out.result)), by: "claude-code", at: db.now() };
  }
  if (engine === "api") {
    const msg = await getClient().messages.create({
      model: process.env.JHA_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium" },
      ...(fast ? {} : { tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }, { type: "web_fetch_20260209", name: "web_fetch", max_uses: 4 }] }),
      messages: [{ role: "user", content: `${prompt}\n\nReply with ONLY one JSON object with these fields:\n${JSON.stringify(jsonSchemaOf(IdeaDraft).properties)}` }],
    });
    if (msg.stop_reason === "refusal") throw new Error("Claude declined this request");
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return { ...parseIdea(text), by: "api", at: db.now() };
  }
  throw new Error(`unknown engine ${engine}`);
}

export function parseIdea(text) {
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s < 0) throw new Error("no JSON object found");
  return IdeaDraft.parse(JSON.parse(text.slice(s, e + 1)));
}

/** Copy-paste version for claude.ai (turn on web search in the chat). */
export async function ideaPackPromptWithSignals(profile, target) {
  const { signals } = await collectSignals(target);
  return ideaPackPrompt(profile, { ...target, collected: signals });
}
export function ideaPackPrompt(profile, target) {
  return `${ideaPrompt(profile, target)}\n\nUse web search. Reply with ONLY one JSON object (no markdown) with exactly these fields:\n${JSON.stringify(jsonSchemaOf(IdeaDraft).properties, null, 1)}`;
}

export const slug = (s = "") => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Saves the idea on the contact or job and as data/pitches/<company>.md. */
export function saveIdea(kind, id, idea) {
  const rec = db.read()[kind].find((x) => x.id === id);
  const file = path.join(DATA_DIR, "pitches", `${slug(rec.company || rec.name)}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sources = idea.signals.map((s) => `- ${s.finding} (${s.source})`).join("\n");
  fs.writeFileSync(file, `${idea.onePager}\n\n---\n\n<!-- research notes (not published) -->\n## Signals\n${sources}\n\n## Other ideas\n${idea.ideas.map((i) => `- **${i.title}** (${i.kind}, impact ${i.impact}/5, feasibility ${i.feasibility}/5): ${i.pitch}`).join("\n")}\n`);
  const patch = { idea: { ...idea, file, approved: false } };
  return kind === "jobs" ? db.updateJob(id, patch) : db.updateContact(id, patch);
}

// ---------- publishing to the portfolio site ----------

const escHtml = (s = "") => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function inline(s) {
  return escHtml(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener" target="_blank">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g, '$1<a href="$2" rel="noopener" target="_blank">$2</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>").replace(/`([^`]+)`/g, "<code>$1</code>");
}
/** Small Markdown → HTML for the one-pager (headings, lists, paragraphs, links, bold/italic). */
export function mdToHtml(md) {
  const out = [];
  let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)/))) { close(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); }
    else if ((m = line.match(/^\s*[-*]\s+(.*)/))) { if (list !== "ul") { close(); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== "ol") { close(); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if (!line.trim()) close();
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return out.join("\n");
}

export function pitchPage(profile, company, onePager) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${escHtml(company)}: an idea from ${escHtml(profile.name)}</title>
<style>
:root{--bg:#faf9f6;--ink:#1d1d1f;--muted:#6b6b70;--line:#e6e3dc;--accent:#3b5bdb}
@media (prefers-color-scheme:dark){:root{--bg:#151517;--ink:#ededee;--muted:#9a9aa1;--line:#2e2e33;--accent:#8ea2ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:720px;margin:0 auto;padding:48px 20px 64px}h1{font-size:28px;line-height:1.25;letter-spacing:-.01em;margin:0 0 8px}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:32px 0 8px}a{color:var(--accent)}
li{margin:4px 0}code{background:var(--line);padding:1px 5px;border-radius:4px;font-size:14px}
footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:14px}
</style></head><body><main>
${mdToHtml(onePager)}
<footer>${escHtml(profile.name)} · <a href="${escHtml(profile.website || profile.linkedin || "#")}">${escHtml((profile.website || profile.linkedin || "").replace(/^https?:\/\//, ""))}</a> · <a href="mailto:${escHtml(profile.email || "")}">${escHtml(profile.email || "")}</a></footer>
</main></body></html>
`;
}

/** Writes the approved one-pager into the portfolio's public/pitches/ (deploys with the site). Returns the URL. */
/** Where your portfolio site's code lives: profile.portfolioDir, or the folder next to this project. */
export function portfolioDirFor(profile) {
  const candidates = [profile.portfolioDir, "../keneisha-baid-portfolio", ".."].filter(Boolean).map((d) => path.resolve(ROOT, d));
  const found = candidates.find((d) => fs.existsSync(path.join(d, "public")) && fs.existsSync(path.join(d, "package.json")));
  if (!found) throw new Error(`Couldn't find your portfolio folder. Set "portfolioDir" in config/profile.json (tried: ${candidates.join(", ")})`);
  return found;
}

export function publishIdea(profile, kind, id, { portfolioDir = portfolioDirFor(profile) } = {}) {
  const rec = db.read()[kind].find((x) => x.id === id);
  if (!rec?.idea) throw new Error("No idea saved for that id yet. Run: idea <id>");
  const md = fs.existsSync(rec.idea.file) ? fs.readFileSync(rec.idea.file, "utf8").split("\n---\n")[0] : rec.idea.onePager;
  const name = `${slug(rec.company || rec.name)}-${Math.random().toString(36).slice(2, 7)}`;
  const dir = path.join(portfolioDir, "public", "pitches");
  fs.mkdirSync(dir, { recursive: true });
  const existing = rec.idea.publishedFile && fs.existsSync(rec.idea.publishedFile) ? rec.idea.publishedFile : null;
  const out = existing || path.join(dir, `${name}.html`);
  fs.writeFileSync(out, pitchPage(profile, rec.company || rec.name, md));
  const url = `${(profile.website || "").replace(/\/$/, "")}/pitches/${path.basename(out)}`;
  const patch = { idea: { ...rec.idea, onePager: md, approved: true, publishedFile: out, url } };
  if (kind === "jobs") db.updateJob(id, patch); else db.updateContact(id, patch);
  return { url, file: out };
}
