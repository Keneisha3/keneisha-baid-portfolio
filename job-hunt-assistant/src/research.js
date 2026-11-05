// Research without an AI model: plain code gathers public signals about a company
// (its blog/news feed, changelog, careers page, open roles, Hacker News mentions),
// then rules turn those signals into build ideas sized to your skills. Free and
// fast. With Claude on, these signals are handed to Claude so it starts from
// evidence instead of browsing from scratch.
import { htmlToText, mapLimit } from "./jobs/sources.js";
import * as db from "./db.js";

const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36" };
const NOT_COMPANY = /greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs|workable\.com|smartrecruiters|recruitee|linkedin\.com|indeed\.|glassdoor|builtin|ziprecruiter|wellfound|ycombinator\.com|workatastartup|careerbeacon|jobs\.ca|iagora|talent\.com|simplyhired|employbl|jobleads|standout|mediabistro|tealhq|expertini|scoutify|wizbii|outscal|aijobs|news\.ycombinator|google\.|gmail\.com|outlook\.com|hotmail|yahoo|uwaterloo|a16z|speedrun|techstars|offcycle|wallstreetfriends|theinterna|jobs\.y-axis|startup\.jobs|trueup/i;

async function fetchText(url, ms = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { headers: UA, redirect: "follow", signal: ctl.signal });
    if (!res.ok) return null;
    const type = res.headers.get?.("content-type") || "";
    if (type && !/html|xml|rss|atom|json|text/.test(type)) return null;
    return { url: res.url || url, body: (await res.text()).slice(0, 600_000) };
  } catch { return null; } finally { clearTimeout(t); }
}

/** Best guess at the company's own website. */
export function companyDomain(rec = {}) {
  const urls = [rec.website, rec.url, rec.applyUrl, rec.notes, rec.email && `https://${rec.email.split("@")[1]}`].filter(Boolean).join(" ");
  for (const m of urls.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
    const host = m[1].toLowerCase().replace(/^(www|jobs|careers|apply|boards|job-boards)\./, "");
    if (!NOT_COMPANY.test(host)) return host;
  }
  const name = (rec.company || rec.name || "").toLowerCase().replace(/\(.*?\)|\b(inc|ltd|llc|corp|group|team|hiring)\b/g, "").replace(/[^a-z0-9]/g, "");
  return name ? `${name}.com` : "";
}

/** Parses RSS or Atom into [{title, link, date}]. */
export function parseFeed(xml) {
  const items = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(([block]) => {
    const tag = (n) => (block.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`, "i")) || [])[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() || "";
    const link = tag("link") || (block.match(/<link[^>]+href="([^"]+)"/i) || [])[1] || "";
    return { title: htmlToText(tag("title")), link, date: tag("pubDate") || tag("updated") || tag("published") };
  });
  return items.filter((i) => i.title);
}

const SECTION = { blog: /\/(blog|insights|stories|resources\/blog)\b/i, news: /\/(news|press|newsroom|media)\b/i, changelog: /\/(changelog|release-notes|releases|whats-new|updates|product-updates)\b/i, careers: /\/(careers|jobs|join-us|work-with-us)\b/i };

/** Gathers signals about one company. Returns { domain, signals: [{type, finding, source, date?}] }. */
export async function collectSignals(rec, { log = () => {} } = {}) {
  const domain = companyDomain(rec);
  const signals = [];
  const add = (type, finding, source, date) => { if (finding && !signals.some((s) => s.finding === finding)) signals.push({ type, finding: finding.slice(0, 220), source, ...(date ? { date } : {}) }); };
  if (domain) {
    const home = await fetchText(`https://${domain}`);
    const links = new Map();
    if (home) {
      const desc = (home.body.match(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']+)/i) || [])[1];
      if (desc) add("other", `How they describe themselves: ${htmlToText(desc)}`, home.url);
      for (const [, href] of home.body.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
        let u; try { u = new URL(href, home.url); } catch { continue; }
        if (!u.hostname.endsWith(domain.replace(/^www\./, ""))) continue;
        for (const [k, re] of Object.entries(SECTION)) if (re.test(u.pathname) && !links.has(k)) links.set(k, u.href.split("?")[0]);
      }
    }
    // Feeds: discovered sections first, then common paths.
    const feedUrls = [...new Set([
      ...(home ? [...home.body.matchAll(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+href=["']([^"']+)/gi)].map((m) => new URL(m[1], home.url).href) : []),
      ...["blog", "news", "changelog"].filter((k) => links.has(k)).flatMap((k) => [`${links.get(k).replace(/\/$/, "")}/rss.xml`, `${links.get(k).replace(/\/$/, "")}/feed`]),
      `https://${domain}/blog/rss.xml`, `https://${domain}/feed`, `https://${domain}/rss.xml`, `https://${domain}/changelog/rss.xml`,
    ])].slice(0, 8);
    let feedItems = 0;
    for (const f of feedUrls) {
      if (feedItems >= 8) break;
      const r = await fetchText(f, 8000);
      if (!r || !/<(rss|feed)\b/i.test(r.body)) continue;
      const type = /changelog|release|update/i.test(f) ? "changelog" : /news|press/i.test(f) ? "news" : "blog";
      for (const it of parseFeed(r.body).slice(0, 6)) { add(type, it.title, it.link || f, it.date); feedItems++; }
    }
    // Section pages without feeds: use their headings.
    for (const k of ["changelog", "blog", "news"]) {
      if (!links.has(k) || signals.some((s) => s.type === k)) continue;
      const r = await fetchText(links.get(k), 8000);
      if (!r) continue;
      const heads = [...r.body.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)].map((m) => htmlToText(m[1])).filter((h) => h.length > 15 && h.length < 140).slice(0, 4);
      heads.forEach((h) => add(k, h, links.get(k)));
    }
    // Careers page: role titles reveal priorities.
    if (links.has("careers")) {
      const r = await fetchText(links.get("careers"), 8000);
      if (r) {
        const roles = [...new Set([...r.body.matchAll(/>\s*([^<>]{0,70}?(?:Engineer|Manager|Sales|Account Executive|SDR|BDR|Analyst|Success|Operations|Marketing|Designer|Finance|Partnerships|Recruiter|Data)[^<>]{0,40}?)\s*</g)].map((m) => htmlToText(m[1])).filter((t) => t.length >= 6 && t.length <= 90))].slice(0, 12);
        if (roles.length) add("jobs", `Open roles include: ${roles.join("; ")}`, links.get("careers"));
      }
    }
  }
  // Roles we already track for this company (from job feeds, LinkedIn, your tracker).
  const tracked = db.read().jobs.filter((j) => j.company && rec.company && j.company.toLowerCase() === rec.company.toLowerCase()).map((j) => j.title);
  if (tracked.length) add("jobs", `Hiring for: ${[...new Set(tracked)].slice(0, 8).join("; ")}`, rec.url || rec.applyUrl || "");
  if (rec.description) add("jobs", `The role you're looking at: ${String(rec.description).split("\n").find((l) => l.length > 60)?.slice(0, 200) || rec.title}`, rec.url || "");
  // Hacker News mentions (public Algolia API).
  if (rec.company) {
    const hn = await fetchText(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(`"${rec.company}"`)}&tags=story&hitsPerPage=5`, 8000);
    try { for (const h of JSON.parse(hn?.body || "{}").hits || []) if (h.title && h.points >= 5) add("news", `On Hacker News: "${h.title}" (${h.points} points)`, `https://news.ycombinator.com/item?id=${h.objectID}`, h.created_at); } catch {}
  }
  log(`  ${rec.company || rec.name}: ${signals.length} signal(s)${domain ? ` from ${domain}` : ""}`);
  return { domain, signals };
}

// ---------- rule-based ideas ----------

const RULES = [
  { when: /\b(sdr|bdr|account executive|sales|business development|gtm|go-to-market|revenue|partnerships?)\b/i, idea: (co) => ({
    title: `Fit-scored target account list for ${co}'s sales team`, kind: "sales/GTM play",
    pitch: `A ranked list of 150 to 300 prospects scored on how closely they match ${co}'s recent customers, each with a one-line "why now" hook, so new reps start with their best calls.`,
    weekPlan: "Day 1: define the ideal-customer profile from public case studies. Days 2-3: build the prospect list in Python from public data. Day 4: weighted score, sanity-checked against known customers. Day 5: Power BI view and a top-25 sheet with hooks.",
    metric: "Meeting-booked rate on scored accounts vs. the usual list", problem: `${co} is investing in sales; picking which accounts to call next is usually the bottleneck` }) },
  { when: /\b(customer success|support|onboarding|implementation|churn|retention)\b|slow (support|response)|integration (issue|problem)s?/i, idea: (co) => ({
    title: `Onboarding and account-health dashboard for ${co}`, kind: "internal tool",
    pitch: `One view that joins CRM and support data to flag stalled onboardings and at-risk accounts early, so the team acts before customers churn.`,
    weekPlan: "Day 1: map the onboarding stages and data sources. Days 2-3: Python pipeline on sample/exported data. Day 4: health score and alerts. Day 5: Power BI dashboard and a short walkthrough.",
    metric: "Days to go live, and churn among flagged accounts", problem: `Scaling ${co}'s customer base usually strains onboarding and support first` }) },
  { when: /\b(launch(es|ed)?|introducing|new feature|release|changelog|beta|now available|ai agent)\b/i, idea: (co) => ({
    title: `Launch adoption tracker for ${co}'s newest features`, kind: "analysis",
    pitch: `A simple model and dashboard showing which customers adopt each new release, how fast, and which segments lag, to aim enablement and marketing where it moves the number.`,
    weekPlan: "Day 1: list recent launches and define adoption. Days 2-3: build the tracker on sample data in Python. Day 4: segment and cohort views. Day 5: dashboard plus three recommendations.",
    metric: "Adoption rate of the latest launch 30 days after release", problem: `${co} ships often; knowing which launches land, and with whom, is hard without a dedicated analyst` }) },
  { when: /\b(expan(d|sion|ding)|new (market|office|region)|launch(es|ed)? in|enters?|international|north america|europe|uk|london|canada)\b/i, idea: (co) => ({
    title: `Market-entry sizing for ${co}'s next region`, kind: "analysis",
    pitch: `A bottom-up market size and a prioritized list of cities or segments for ${co}'s expansion, with the assumptions laid out so the team can argue with them.`,
    weekPlan: "Day 1: pick the market and the unit of demand. Days 2-3: gather public data and build the bottom-up model. Day 4: sensitivity analysis. Day 5: one-page memo plus model.",
    metric: "Accuracy of the forecast vs. the first 90 days in-market", problem: `${co} is expanding, and every new region needs a defensible sizing and a where-first plan` }) },
  { when: /\b(fintech|payments?|lending|credit|banking|card|treasury|invest(ing|ment)?|wealth|insurance|mortgage|financ)/i, idea: (co) => ({
    title: `Unit economics and cohort model for ${co}`, kind: "financial model",
    pitch: `A driver-based model of revenue, CAC and payback by cohort, built so finance and growth can test "what if" scenarios in minutes.`,
    weekPlan: "Day 1: agree the drivers and data. Days 2-3: build the cohort model (Python + Excel). Day 4: scenario and sensitivity tabs. Day 5: walkthrough and the three levers that matter most.",
    metric: "Forecast error on next quarter's revenue", problem: `For a company like ${co}, unit economics by cohort decide where growth money goes` }) },
  { when: /\b(data|analytics|insights?|forecast|dashboard|reporting|bi)\b/i, idea: (co) => ({
    title: `Automated weekly metrics pack for ${co}`, kind: "internal tool",
    pitch: `Replace manual reporting with an automated pipeline and a single dashboard the leadership team reads every Monday.`,
    weekPlan: "Day 1: list the metrics and where they live. Days 2-3: automate extraction with Python. Day 4: Power BI dashboard. Day 5: schedule, document and hand off.",
    metric: "Hours of manual reporting saved per week", problem: `Fast-growing teams like ${co}'s often run on hand-built reports` }) },
];
const FALLBACK = (co) => ({ title: `Operations automation audit for ${co}`, kind: "internal tool",
  pitch: `Find the three most repetitive manual workflows on one team and automate the first one end to end.`,
  weekPlan: "Day 1: shadow and map workflows. Day 2: rank by hours saved. Days 3-4: build the automation (Power Automate or Python). Day 5: measure and document.",
  metric: "Hours saved per week", problem: `Every scaling company has manual workflows worth automating` });

/** Turns signals into an IdeaDraft-shaped object, no AI involved. */
export function ruleIdeas(profile, rec, signals) {
  const co = rec.company || rec.name;
  const text = [rec.title, rec.category, rec.description, ...signals.map((s) => s.finding)].filter(Boolean).join("\n");
  const scored = RULES.map((r) => {
    const hits = signals.filter((s) => r.when.test(s.finding));
    const roleHit = r.when.test(`${rec.title || ""} ${rec.category || ""}`);
    return { r, hits, score: hits.length + (roleHit ? 2 : 0) };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  const picks = (scored.length ? scored : []).slice(0, 3).map((x) => ({ ...x.r.idea(co), evidence: x.hits }));
  while (picks.length < 3) {
    const extra = [...RULES.map((r) => r.idea(co)), FALLBACK(co)].find((i) => !picks.some((p) => p.title === i.title) && (picks.length || true));
    picks.push({ ...extra, evidence: [] });
  }
  const ideas = picks.map((p) => ({ title: p.title, kind: p.kind, pitch: p.pitch, weekPlan: p.weekPlan, metric: p.metric,
    impact: Math.min(5, 3 + Math.min(2, p.evidence.length)), feasibility: 4 }));
  const best = picks[0];
  const ev = best.evidence.length ? best.evidence : signals.slice(0, 2);
  const why = (profile.highlights || []).slice(0, 2);
  const onePager = `# ${best.title}

## The problem
${best.problem}.${ev.length ? " What I'm seeing from the outside:" : ""}
${ev.map((s) => `- ${s.finding}${s.source ? ` ([source](${s.source}))` : ""}`).join("\n")}

## The idea
${best.pitch}

## A one-week plan
${best.weekPlan.split(/\.\s+(?=Day)/).map((d) => `- ${d.replace(/\.$/, "")}`).join("\n")}

## How we'd know it worked
${best.metric}.

## Why me
${why.map((h) => `- ${h}`).join("\n")}

*Built only from public information, so parts of it are surely wrong. I'd love to be told what.*`;
  return {
    oneLiner: signals.find((s) => s.finding.startsWith("How they describe"))?.finding.replace(/^How they describe themselves: /, "") || "",
    signals: signals.map(({ type, finding, source }) => ({ type, finding, source: source || "" })),
    problems: picks.map((p) => ({ problem: p.problem, evidence: p.evidence.map((e) => e.finding).join(" · ") || "pattern for companies like this" })),
    ideas, bestIdea: best.title, onePager,
    emailHook: ev[0] ? `I noticed ${ev[0].finding.replace(/^(Open roles include|Hiring for): /, "you're hiring for ").replace(/\.$/, "")}, so I sketched ${best.title.charAt(0).toLowerCase() + best.title.slice(1)}.` : `I sketched ${best.title.charAt(0).toLowerCase() + best.title.slice(1)}.`,
    by: "rules", at: db.now(),
  };
}

export const signalsBlock = (signals) => signals.length
  ? `Signals already gathered by code (verify or extend; cite these URLs):\n${signals.map((s) => `- [${s.type}] ${s.finding} (${s.source})`).join("\n")}`
  : "";
