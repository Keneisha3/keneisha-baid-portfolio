// Pulls open roles from the public job-board APIs that most startups and many
// large companies use. These are official, unauthenticated endpoints meant for
// exactly this, so no scraping is involved.
const UA = { "User-Agent": "job-hunt-assistant/1.0" };

const decodeEntities = (s = "") =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
export const htmlToText = (html = "") =>
  decodeEntities(decodeEntities(html).replace(/<\/(p|li|h\d|div|br)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/\n{3,}/g, "\n\n")
    .trim();

async function getJson(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

export async function greenhouse(board, company) {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
  return data.jobs.map((j) => ({
    source: "greenhouse",
    externalId: String(j.id),
    company,
    title: j.title,
    location: j.location?.name || "",
    url: j.absolute_url,
    applyUrl: j.absolute_url,
    description: htmlToText(j.content),
    postedAt: j.updated_at,
  }));
}

export async function lever(site, company) {
  const data = await getJson(`https://api.lever.co/v0/postings/${site}?mode=json`);
  return data.map((j) => ({
    source: "lever",
    externalId: j.id,
    company,
    title: j.text,
    location: [j.categories?.location, j.workplaceType].filter(Boolean).join(" · "),
    url: j.hostedUrl,
    applyUrl: j.applyUrl || `${j.hostedUrl}/apply`,
    description: [j.descriptionPlain, ...(j.lists || []).map((l) => `${l.text}\n${htmlToText(l.content)}`), j.additionalPlain]
      .filter(Boolean)
      .join("\n\n"),
    postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : undefined,
  }));
}

export async function ashby(board, company) {
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${board}?includeCompensation=true`);
  return data.jobs.map((j) => ({
    source: "ashby",
    externalId: j.id,
    company,
    title: j.title,
    location: [j.location, j.isRemote ? "Remote" : ""].filter(Boolean).join(" · "),
    url: j.jobUrl,
    applyUrl: j.applyUrl || j.jobUrl,
    description: j.descriptionPlain || htmlToText(j.descriptionHtml),
    postedAt: j.publishedAt,
  }));
}

const FETCHERS = { greenhouse, lever, ashby };

/** targets.companies: [{ name, ats: "greenhouse"|"lever"|"ashby", board }] */
export async function fetchAll(companies, { onError = console.warn } = {}) {
  const results = await Promise.allSettled(
    companies.map((c) => {
      const fn = FETCHERS[c.ats];
      if (!fn) return Promise.reject(new Error(`Unknown ATS "${c.ats}" for ${c.name}`));
      return fn(c.board, c.name);
    }),
  );
  const jobs = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") jobs.push(...r.value);
    else onError(`  ! ${companies[i].name}: ${r.reason.message}`);
  });
  return jobs;
}
