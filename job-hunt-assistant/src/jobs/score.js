// Cheap, transparent relevance filter so you only spend AI calls and attention
// on roles that plausibly fit. Tune the lists in config/targets.json.
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text, term) => new RegExp(`(^|[^a-z0-9])${esc(term)}($|[^a-z0-9])`, "i").test(text || "");

/** Title-only check, used to skip fetching full descriptions for obvious misses. */
export function titlePasses(title, filters = {}) {
  const { titleRequire = [], titleInclude = [], titleExclude = [], termExclude = [] } = filters;
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
