import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

try {
  process.loadEnvFile(".env");
} catch {}

const { isLive, MODEL } = await import("./lib/claude.js");
const store = await import("./lib/store.js");
const pipeline = await import("./lib/pipeline.js");

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4321);
const HOST = process.env.HOST || "127.0.0.1";
const PULSE_HOURS = Number(process.env.PULSE_HOURS || 24);

const app = express();
app.disable("x-powered-by");

// ---- public analytics endpoint (called by the generated apps) ----
app.options("/api/track/:id", (req, res) => {
  res.set({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" }).sendStatus(204);
});
app.post("/api/track/:id", express.text({ type: "*/*", limit: "2kb" }), (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  let body;
  try {
    body = JSON.parse(req.body || "{}");
  } catch {
    return res.sendStatus(400);
  }
  const allowed = ["pageview", "cta", "signup", "feature_use"];
  if (!allowed.includes(body.type)) return res.sendStatus(400);
  const props = {};
  if (typeof body.props?.feature === "string") props.feature = body.props.feature.slice(0, 60);
  const ok = store.appendEvent(req.params.id, {
    ts: new Date().toISOString(),
    type: body.type,
    sid: String(body.sid || "").slice(0, 32),
    path: String(body.path || "").slice(0, 200),
    ref: String(body.ref || "").slice(0, 300),
    props,
  });
  res.sendStatus(ok ? 204 : 404);
});

// ---- hosted apps ----
app.use("/apps/:id", (req, res, next) => {
  if (!store.getProject(req.params.id)) return res.sendStatus(404);
  express.static(store.appDir(req.params.id))(req, res, next);
});

// ---- studio API ----
app.use("/api", express.json({ limit: "100kb" }));

app.get("/api/status", (req, res) => {
  res.json({ live: isLive(), model: MODEL, vercel: Boolean(process.env.VERCEL_TOKEN), pulseHours: PULSE_HOURS });
});

app.get("/api/projects", (req, res) => {
  res.json(
    store.listProjects().map((p) => ({
      id: p.id, name: p.name, idea: p.idea, status: p.status, busy: p.busy, createdAt: p.createdAt,
      deployUrl: p.deployUrl, score: p.stages.analyze?.result?.scores?.overall?.score ?? null,
      verdict: p.stages.analyze?.result?.verdict ?? null, health: p.pulses.at(-1)?.result?.healthScore ?? null,
    }))
  );
});

app.post("/api/projects", (req, res) => {
  const idea = String(req.body?.idea || "").trim();
  if (idea.length < 10) return res.status(400).json({ error: "Describe the idea in at least a sentence." });
  const p = store.createProject(idea.slice(0, 2000));
  if (req.body.autorun !== false) pipeline.runFullPipeline(p.id).catch(() => {});
  res.status(201).json(p);
});

app.get("/api/projects/:id", (req, res) => {
  const p = store.getProject(req.params.id);
  if (!p) return res.sendStatus(404);
  res.json({ ...p, metrics: store.metrics(p.id) });
});

app.delete("/api/projects/:id", (req, res) => {
  store.deleteProject(req.params.id);
  res.sendStatus(204);
});

function kickoff(res, promise) {
  // Jobs run in the background; the UI polls the project for progress.
  promise.catch(() => {});
  res.status(202).json({ ok: true });
}
function guard(req, res) {
  const p = store.getProject(req.params.id);
  if (!p) return res.sendStatus(404), null;
  if (p.busy) return res.status(409).json({ error: "Already working on something" }), null;
  return p;
}

app.post("/api/projects/:id/run-all", (req, res) => {
  if (guard(req, res)) kickoff(res, pipeline.runFullPipeline(req.params.id));
});
app.post("/api/projects/:id/run/:stage", (req, res) => {
  if (!guard(req, res)) return;
  const feedback = typeof req.body?.feedback === "string" ? req.body.feedback.slice(0, 4000) : undefined;
  kickoff(res, pipeline.runStage(req.params.id, req.params.stage, { feedback }));
});
app.post("/api/projects/:id/apply", (req, res) => {
  if (guard(req, res)) kickoff(res, pipeline.applyRecommendations(req.params.id));
});

app.use(express.static(path.join(here, "public")));

// ---- monitoring scheduler: re-run the market pulse for live projects ----
function scheduler() {
  if (!PULSE_HOURS) return;
  const due = Date.now() - PULSE_HOURS * 3600_000;
  for (const p of store.listProjects()) {
    if (p.busy || !p.deployUrl) continue;
    const last = p.pulses.at(-1)?.at;
    if (!last || Date.parse(last) < due) {
      console.log(`[scheduler] market pulse for ${p.id}`);
      pipeline.runStage(p.id, "pulse").catch(() => {});
    }
  }
}
setInterval(scheduler, 15 * 60_000).unref();

// Clear "busy" flags left behind if the server stopped mid-job.
for (const p of store.listProjects()) {
  if (p.busy) store.updateProject(p.id, (q) => { q.busy = false; q.status = "error"; q.error = "Interrupted by a restart; run the step again."; });
}

app.listen(PORT, HOST, () => {
  console.log(`Venture Studio running at http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(isLive() ? `AI: live (${MODEL})` : "AI: demo mode (set ANTHROPIC_API_KEY in .env for real analysis)");
});
