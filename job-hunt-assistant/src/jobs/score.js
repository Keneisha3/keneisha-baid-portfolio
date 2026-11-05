// Cheap, transparent relevance filter so you only spend AI calls and attention
// on roles that plausibly fit. Tune the lists in config/targets.json.
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text, term) => new RegExp(`(^|[^a-z0-9])${esc(term)}($|[^a-z0-9])`, "i").test(text || "");

/** Title-only check, used to skip fetching full descriptions for obvious misses. */
export function titlePasses(title, filters = {}) {
  const { titleRequire = [], titleInclude = [], titleExclude = [], termExclude = [], titleAlways = [], seniorityExclude = [] } = filters;
  // Founding / founder's-associate style roles at startups: kept even without "intern" in the title,
  // and even if they're engineering, as long as they aren't senior.
  if (titleAlways.some((t) => has(title, t))) {
    const t = title.replace(/chief of staff/gi, "");
    return !seniorityExclude.some((x) => has(t, x)) && !termExclude.some((x) => has(title, x));
  }
  if (titleExclude.some((t) => has(title, t))) return false;
  if (termExclude.some((t) => has(title, t))) return false;
  if (titleRequire.length && !titleRequire.some((t) => has(title, t))) return false;
  if (titleInclude.length && !titleInclude.some((t) => has(title, t))) return false;
  return true;
}

export function scoreJob(job, filters = {}) {
  const { titleInclude = [], locations = [], keywords = [], termExclude = [], termPrefer = [] } = filters;
  const title = job.title || "";
  const text = `${title}\n${job.description || ""}`;
  if (!titlePasses(title, filters)) return { score: 0, reasons: ["title not a match"] };
  if (termExclude.some((t) => has(job.description || "", t) && !termPrefer.some((p) => has(text, p))))
    return { score: 0, reasons: ["wrong term"] };
  if (job.closesAt && new Date(job.closesAt) < new Date()) return { score: 0, reasons: ["closed"] };
  if (locations.length && job.location && !locations.some((l) => has(job.location, l)))
    return { score: 0, reasons: [`location "${job.location}" not in target list`] };

  const reasons = [];
  const titleHits = titleInclude.filter((t) => has(title, t));
  let score = 40 + Math.min(titleHits.length, 2) * 5;
  reasons.push(`title: ${titleHits.join(", ") || "any"}`);
  const termHits = termPrefer.filter((t) => has(text, t));
  if (termHits.length) { score += 15; reasons.push(`term: ${termHits[0]}`); }
  const kwHits = keywords.filter((k) => has(job.description || "", k));
  score += Math.min(kwHits.length * 4, 40);
  if (kwHits.length) reasons.push(`skills: ${kwHits.slice(0, 8).join(", ")}`);
  return { score: Math.min(score, 100), reasons };
}

const LANES = [
  ["founding", /founding|founder'?s? associate|chief of staff|first (sales|gtm|ops|engineer|hire|employee)|employee #?\d\b|early[- ]stage generalist/i],
  ["tech sales", /sales|sdr|bdr|business development|account (exec|manag)|partnerships?|gtm|go-to-market|revenue|customer success|commercial/i],
  ["finance", /financ|fintech|invest|venture|valuation|fp&a|treasury|risk|credit|audit|bank|wealth|capital markets|equity|m&a|trading/i],
  ["consulting", /consult|advisory|strategy/i],
  ["project management", /project|program|pmo|coordinator/i],
  ["airlines", /airline|airport|aviation|aerospace|flight/i],
];
/** Which kind of role this is, from its title first, then the company's category. */
export function laneOf(job) {
  for (const src of [job.title, job.category])
    for (const [lane, re] of LANES) if (re.test(src || "")) return lane;
  return job.category || "";
}

/** Region from the job's own location (a Toronto role at a US company is "canada"). */
export function regionOf(location = "") {
  if (/london|united kingdom|\buk\b|england|scotland|manchester|edinburgh/i.test(location)) return "uk";
  if (/san francisco|bay area|palo alto|menlo park|mountain view|san mateo|los angeles|santa monica|culver city|burbank|anaheim|irvine|california|new york|seattle|boston|austin|united states|\busa?\b|, (ca|ny|wa|ma|tx)\b/i.test(location)) return "us";
  if (/canada|toronto|vancouver|montr[eé]al|calgary|ottawa|waterloo|mississauga|, (on|bc|qc|ab)\b/i.test(location)) return "canada";
  return "";
}

/** Adds lane, region and the priority boost from targets.priorities. Mutates and returns the job. */
export function applyPriorities(job, priorities = {}) {
  job.lane = laneOf(job);
  job.region = regionOf(job.location) || job.region || "";
  const { lanes = [], regions = [], locations = [], boost = 15 } = priorities;
  const inLane = lanes.includes(job.lane) || (job.lane === "fintech" && lanes.includes("finance"));
  const inPlace = locations.some((l) => has(job.location || "", l)) || (!job.location && regions.includes(job.region));
  job.priority = Boolean(inLane || inPlace);
  if (job.matchScore != null) job.matchScore = Math.min(100, job.matchScore + (inLane ? boost : 0) + (inPlace ? boost : 0));
  else if (job.priority) job.matchScore = (inLane ? boost : 0) + (inPlace ? boost : 0);
  if (job.priority) job.matchReasons = [...(job.matchReasons || []), `priority: ${[inLane && job.lane, inPlace && (job.region || "location")].filter(Boolean).join(" + ")}`];
  return job;
}
