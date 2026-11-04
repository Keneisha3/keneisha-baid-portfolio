// Cheap, transparent relevance filter so you only spend AI calls and attention
// on roles that plausibly fit. Tune the lists in config/targets.json.
const has = (text, term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);

export function scoreJob(job, filters) {
  const { titleInclude = [], titleExclude = [], locations = [], keywords = [] } = filters;
  const title = job.title || "";
  const reasons = [];

  if (titleExclude.some((t) => has(title, t))) return { score: 0, reasons: ["excluded title"] };
  const titleHits = titleInclude.filter((t) => has(title, t));
  if (titleInclude.length && !titleHits.length) return { score: 0, reasons: ["title not a match"] };

  if (locations.length) {
    const ok = locations.some((l) => has(job.location || "", l));
    if (!ok) return { score: 0, reasons: [`location "${job.location}" not in target list`] };
  }

  let score = 40 + Math.min(titleHits.length, 2) * 10;
  reasons.push(`title: ${titleHits.join(", ") || "any"}`);
  const kwHits = keywords.filter((k) => has(job.description || "", k));
  score += Math.min(kwHits.length * 5, 40);
  if (kwHits.length) reasons.push(`skills: ${kwHits.slice(0, 8).join(", ")}`);
  return { score: Math.min(score, 100), reasons };
}
