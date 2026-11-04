// Tiny file-based store: one folder per project under data/projects/<id>/.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const DATA_DIR = path.resolve(process.env.STUDIO_DATA_DIR || "data");
const PROJECTS_DIR = path.join(DATA_DIR, "projects");
fs.mkdirSync(PROJECTS_DIR, { recursive: true });

export const projectDir = (id) => path.join(PROJECTS_DIR, id);
export const appDir = (id) => path.join(projectDir(id), "app");
const projectFile = (id) => path.join(projectDir(id), "project.json");
const eventsFile = (id) => path.join(projectDir(id), "events.jsonl");

const isId = (id) => /^[a-z0-9-]{4,64}$/.test(id);

export function createProject(idea) {
  const id = crypto.randomBytes(5).toString("hex");
  const project = {
    id,
    idea,
    name: idea.slice(0, 60),
    createdAt: new Date().toISOString(),
    status: "queued",
    busy: false,
    stages: {},
    pulses: [],
    log: [],
    deployUrl: null,
  };
  fs.mkdirSync(projectDir(id), { recursive: true });
  saveProject(project);
  return project;
}

export function getProject(id) {
  if (!isId(id)) return null;
  try {
    return JSON.parse(fs.readFileSync(projectFile(id), "utf8"));
  } catch {
    return null;
  }
}

export function saveProject(project) {
  const tmp = projectFile(project.id) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(project, null, 2));
  fs.renameSync(tmp, projectFile(project.id));
}

export function updateProject(id, fn) {
  const p = getProject(id);
  if (!p) throw new Error(`No project ${id}`);
  fn(p);
  saveProject(p);
  return p;
}

export function listProjects() {
  return fs
    .readdirSync(PROJECTS_DIR)
    .map(getProject)
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteProject(id) {
  if (!isId(id)) return;
  fs.rmSync(projectDir(id), { recursive: true, force: true });
}

// ---- analytics events ----
export function appendEvent(id, event) {
  if (!getProject(id)) return false;
  fs.appendFileSync(eventsFile(id), JSON.stringify(event) + "\n");
  return true;
}

export function readEvents(id) {
  try {
    return fs
      .readFileSync(eventsFile(id), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function metrics(id) {
  const events = readEvents(id);
  const sessions = new Set();
  const byType = {};
  const byDay = {};
  const referrers = {};
  const features = {};
  for (const e of events) {
    if (e.sid) sessions.add(e.sid);
    byType[e.type] = (byType[e.type] || 0) + 1;
    const day = (e.ts || "").slice(0, 10);
    byDay[day] ??= { pageviews: 0, signups: 0, visitors: new Set() };
    if (e.type === "pageview") byDay[day].pageviews++;
    if (e.type === "signup") byDay[day].signups++;
    if (e.sid) byDay[day].visitors.add(e.sid);
    if (e.type === "pageview" && e.ref) {
      let host = e.ref;
      try {
        host = new URL(e.ref).host;
      } catch {}
      referrers[host] = (referrers[host] || 0) + 1;
    }
    if (e.type === "feature_use" && e.props?.feature) {
      features[e.props.feature] = (features[e.props.feature] || 0) + 1;
    }
  }
  const visitors = sessions.size;
  const signups = byType.signup || 0;
  return {
    totalEvents: events.length,
    visitors,
    pageviews: byType.pageview || 0,
    ctaClicks: byType.cta || 0,
    signups,
    conversionRate: visitors ? +(100 * signups / visitors).toFixed(1) : 0,
    byType,
    referrers,
    features,
    daily: Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([day, d]) => ({ day, pageviews: d.pageviews, signups: d.signups, visitors: d.visitors.size })),
  };
}
