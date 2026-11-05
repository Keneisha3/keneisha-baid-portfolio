// Pulls open roles from public job-board feeds. These are the official,
// unauthenticated endpoints companies' own career pages use, not scraping.
//   greenhouse / lever / ashby / workable / recruitee / smartrecruiters: board slug
//   workday: host + tenant + site (from a URL like https://HOST/SITE or https://HOST/en-US/SITE)
//   successfactors: host of a "jobs.company.com" career site built on SAP SuccessFactors (RSS feed)
const UA = { "User-Agent": "Mozilla/5.0 (job-hunt-assistant)", Accept: "application/json, text/xml, */*" };

const decodeEntities = (s = "") =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&");
export const htmlToText = (html = "") =>
  decodeEntities(decodeEntities(String(html)).replace(/<\/(p|li|h\d|div|br)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();

async function get(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...UA, ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return opts.text ? res.text() : res.json();
}

/** Runs fn over items with at most n in flight. */
export async function mapLimit(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

const base = (t, j) => ({ company: t.name, category: t.category, ...j });

export async function greenhouse(t) {
  const data = await get(`https://boards-api.greenhouse.io/v1/boards/${t.board}/jobs?content=true`);
  return data.jobs.map((j) => base(t, { source: "greenhouse", externalId: String(j.id), title: j.title, location: j.location?.name || "",
    url: j.absolute_url, applyUrl: j.absolute_url, description: htmlToText(j.content), postedAt: j.updated_at }));
}

export async function lever(t) {
  const data = await get(`https://api.lever.co/v0/postings/${t.board}?mode=json`);
  return data.map((j) => base(t, { source: "lever", externalId: j.id, title: j.text,
    location: [j.categories?.location, j.workplaceType].filter(Boolean).join(" · "), url: j.hostedUrl,
    applyUrl: j.applyUrl || `${j.hostedUrl}/apply`,
    description: [j.descriptionPlain, ...(j.lists || []).map((l) => `${l.text}\n${htmlToText(l.content)}`), j.additionalPlain].filter(Boolean).join("\n\n"),
    postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : undefined }));
}

export async function ashby(t) {
  const data = await get(`https://api.ashbyhq.com/posting-api/job-board/${t.board}?includeCompensation=true`);
  return data.jobs.map((j) => base(t, { source: "ashby", externalId: j.id, title: j.title,
    location: [j.location, j.isRemote ? "Remote" : ""].filter(Boolean).join(" · "), url: j.jobUrl, applyUrl: j.applyUrl || j.jobUrl,
    description: j.descriptionPlain || htmlToText(j.descriptionHtml), postedAt: j.publishedAt }));
}

export async function workable(t) {
  const data = await get(`https://apply.workable.com/api/v1/widget/accounts/${t.board}?details=true`);
  return (data.jobs || []).map((j) => base(t, { source: "workable", externalId: j.shortcode, title: j.title,
    location: [j.city, j.state, j.country, j.telecommuting ? "Remote" : ""].filter(Boolean).join(", "),
    url: j.url, applyUrl: j.application_url || j.url, description: htmlToText(j.description), postedAt: j.published_on }));
}

export async function recruitee(t) {
  const data = await get(`https://${t.board}.recruitee.com/api/offers/`);
  return (data.offers || []).map((j) => base(t, { source: "recruitee", externalId: String(j.id), title: j.title,
    location: j.location || [j.city, j.country].filter(Boolean).join(", "), url: j.careers_url, applyUrl: j.careers_apply_url || j.careers_url,
    description: htmlToText(`${j.description || ""}\n${j.requirements || ""}`), postedAt: j.published_at }));
}

export async function smartrecruiters(t, { titleOk = () => true } = {}) {
  const all = [];
  for (let offset = 0; offset < 1000; offset += 100) {
    const page = await get(`https://api.smartrecruiters.com/v1/companies/${t.board}/postings?limit=100&offset=${offset}`);
    all.push(...(page.content || []));
    if (!page.content?.length || all.length >= (page.totalFound ?? 0)) break;
  }
  const keep = all.filter((j) => titleOk(j.name));
  return mapLimit(keep, 4, async (j) => {
    const d = await get(`https://api.smartrecruiters.com/v1/companies/${t.board}/postings/${j.id}`).catch(() => ({}));
    const s = d.jobAd?.sections || {};
    return base(t, { source: "smartrecruiters", externalId: j.id, title: j.name,
      location: [j.location?.city, j.location?.region, j.location?.country?.toUpperCase(), j.location?.remote ? "Remote" : ""].filter(Boolean).join(", "),
      url: d.postingUrl || `https://jobs.smartrecruiters.com/${t.board}/${j.id}`, applyUrl: d.applyUrl || d.postingUrl || `https://jobs.smartrecruiters.com/${t.board}/${j.id}`,
      description: htmlToText([s.jobDescription?.text, s.qualifications?.text, s.additionalInformation?.text].filter(Boolean).join("\n")),
      postedAt: j.releasedDate });
  });
}

export async function workday(t, { titleOk = () => true } = {}) {
  const api = `https://${t.host}/wday/cxs/${t.tenant}/${t.site}`;
  const postings = [];
  for (let offset = 0; offset < 400; offset += 20) {
    const page = await get(`${api}/jobs`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText: t.search ?? "intern" }) });
    postings.push(...(page.jobPostings || []));
    if (!page.jobPostings?.length || postings.length >= (page.total ?? 0)) break;
  }
  const keep = postings.filter((j) => titleOk(j.title));
  return mapLimit(keep, 4, async (j) => {
    const d = await get(`${api}${j.externalPath}`).catch(() => ({}));
    const info = d.jobPostingInfo || {};
    const url = info.externalUrl || `https://${t.host}/${t.site}${j.externalPath}`;
    return base(t, { source: "workday", externalId: info.jobReqId || j.externalPath, title: j.title,
      location: info.location || j.locationsText || "", url, applyUrl: url, description: htmlToText(info.jobDescription),
      postedAt: info.startDate, manualApply: true });
  });
}

export async function successfactors(t) {
  const xml = await get(`https://${t.host}/services/rss/job/?locale=en_US&keywords=(${encodeURIComponent(t.search ?? "intern")})`, { text: true });
  const tag = (s, n) => decodeEntities((s.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`)) || [])[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, "") || "");
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const rawTitle = tag(item, "title").trim();
    const loc = rawTitle.match(/\(([^()]*)\)\s*$/);
    const link = tag(item, "link").trim();
    return base(t, { source: "successfactors", externalId: link, title: loc ? rawTitle.slice(0, loc.index).trim() : rawTitle,
      location: loc?.[1] || "", url: link, applyUrl: link, description: htmlToText(tag(item, "description")),
      postedAt: tag(item, "pubDate") || undefined, manualApply: true });
  });
}

export const FETCHERS = { greenhouse, lever, ashby, workable, recruitee, smartrecruiters, workday, successfactors };

/** targets.companies: [{ name, ats, board | host/tenant/site, category }]. Entries with ats "careers" are opened by hand. */
export async function fetchAll(companies, { onError = console.warn, titleOk } = {}) {
  const feeds = companies.filter((c) => c.ats !== "careers" && !c.disabled);
  const results = await mapLimit(feeds, 6, async (c) => {
    const fn = FETCHERS[c.ats];
    if (!fn) return { error: `unknown ats "${c.ats}"` };
    try { return { jobs: await fn(c, { titleOk }) }; } catch (e) { return { error: e.message }; }
  });
  const jobs = [], failures = [];
  results.forEach((r, i) => {
    if (r.jobs) jobs.push(...r.jobs);
    else { failures.push({ company: feeds[i].name, error: r.error }); onError(`  ! ${feeds[i].name}: ${r.error}`); }
  });
  return { jobs, failures, checked: feeds.length };
}
