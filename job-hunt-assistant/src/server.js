// Local-only dashboard: http://localhost:4321. Binds to 127.0.0.1 so nothing is exposed.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import * as db from "./db.js";
import { ROOT } from "./paths.js";
import { loadProfile, loadTargets } from "./config.js";
import { discover, draftJob, draftContact, importLinks, todayPlan, importLinkedIn, checkLinks } from "./commands.js";
import { isLinkedInJob } from "./outreach/linkedin.js";
import { searchLinks } from "./outreach/linkedin.js";
import { buildPack, applyPack, nextForPack } from "./manual.js";

const JOB_FIELDS = ["status", "notes", "followUpOn", "draft"];
const CONTACT_FIELDS = ["status", "notes", "followUpOn", "draft", "name", "title", "company", "reason", "linkedinUrl", "email", "jobId", "chatAt", "research"];
const pick = (obj, keys) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => keys.includes(k)));

async function body(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1e6) throw new Error("Body too large");
  }
  return raw ? JSON.parse(raw) : {};
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const send = (code, data) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, "http://localhost");
      const p = url.pathname;
      const m = (re) => p.match(re);
      let r;

      if (req.method === "GET" && (p === "/" || p === "/index.html")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(fs.readFileSync(path.join(ROOT, "public", "index.html")));
      }
      if (req.method === "GET" && p === "/api/state") {
        const state = db.read();
        return send(200, { ...state, stats: db.stats(state), due: db.dueFollowUps(state), today: todayPlan(loadTargets(), state), statuses: { jobs: db.APP_STATUSES, contacts: db.CONTACT_STATUSES } });
      }
      if (req.method === "GET" && p === "/api/people") {
        const t = loadTargets(), prof = loadProfile();
        return send(200, searchLinks(url.searchParams.get("company") || "", { roles: t.outreach?.roles, school: prof.schoolName, schoolSlug: t.outreach?.schoolSlug }));
      }
      if (req.method === "GET" && p === "/api/pack") {
        const kind = url.searchParams.get("kind") === "contacts" ? "contacts" : "jobs";
        const items = nextForPack(kind, Math.min(15, Number(url.searchParams.get("n") || 8)));
        return send(200, { count: items.length, text: items.length ? buildPack(kind, items, loadProfile()) : "" });
      }
      if (req.method !== "POST") return send(404, { error: "Not found" });

      // Simple CSRF guard: only accept JSON posts from this page.
      if (!String(req.headers["content-type"]).includes("application/json")) return send(415, { error: "JSON only" });

      if (p === "/api/discover") return send(200, await discover(loadProfile(), loadTargets(), { log: () => {} }));
      if (p === "/api/check-links") return send(200, await checkLinks({ log: () => {} }));
      if (p === "/api/pack") return send(200, applyPack(String((await body(req)).text || "")));
      if (p === "/api/import") {
        const { urls = [] } = await body(req);
        if (!Array.isArray(urls) || urls.length > 200) return send(400, { error: "send up to 200 urls" });
        const li = urls.filter(isLinkedInJob), rest = urls.filter((u) => !isLinkedInJob(u));
        const a = rest.length ? await importLinks(rest, loadTargets(), { log: () => {} }) : { added: 0, read: 0, failed: [] };
        // LinkedIn links open in your logged-in Chrome window on this Mac (the dashboard runs locally).
        const b = li.length ? await importLinkedIn(li, loadTargets(), { log: () => {} }) : { added: 0, read: 0, failed: [] };
        return send(200, { added: a.added + b.added, read: a.read + b.read, failed: [...a.failed, ...b.failed] });
      }
      if ((r = m(/^\/api\/jobs\/(\w+)$/))) return send(200, db.updateJob(r[1], pick(await body(req), JOB_FIELDS)));
      if ((r = m(/^\/api\/jobs\/(\w+)\/draft$/))) return send(200, await draftJob(loadProfile(), r[1]));
      if (p === "/api/jobs") {
        const b = await body(req);
        if (!b.title || !b.company) return send(400, { error: "title and company required" });
        db.upsertJobs([{ source: "manual", externalId: db.id(), title: b.title, company: b.company, location: b.location || "", url: b.url || "", applyUrl: b.url || "", description: b.description || "", matchScore: null }]);
        return send(200, { ok: true });
      }
      if (p === "/api/contacts") {
        const b = pick(await body(req), CONTACT_FIELDS);
        if (!b.name) return send(400, { error: "name required" });
        if (!b.linkedinUrl) delete b.linkedinUrl;
        if (!b.email) delete b.email;
        return send(200, db.addContact(b));
      }
      if ((r = m(/^\/api\/contacts\/(\w+)$/))) return send(200, db.updateContact(r[1], pick(await body(req), CONTACT_FIELDS)));
      if ((r = m(/^\/api\/contacts\/(\w+)\/draft$/))) return send(200, await draftContact(loadProfile(), r[1]));
      return send(404, { error: "Not found" });
    } catch (e) {
      send(400, { error: e.message });
    }
  });
}

export function startServer(port = 4321) {
  const server = createServer();
  server.listen(port, "127.0.0.1", () => console.log(`Tracker running at http://localhost:${port}`));
  return server;
}
