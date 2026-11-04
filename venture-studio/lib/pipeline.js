// The venture pipeline: analyze -> plan -> build -> deploy, then monitor (market pulse).
import fs from "node:fs";
import path from "node:path";
import { research, structured, isLive } from "./claude.js";
import { AnalysisSchema, PlanSchema, BuildSchema, PulseSchema } from "./schemas.js";
import { getProject, updateProject, appDir, metrics } from "./store.js";
import { deploy } from "./deploy.js";
import * as demo from "./demo.js";

const ANALYST = `You are a sharp, honest venture analyst. You research markets on the live web,
name real competitors with real URLs, and give candid scores. You'd rather tell a founder
an idea is weak than flatter them. Today is ${new Date().toDateString()}.`;

const PRODUCT = `You are a product lead who turns validated ideas into tight MVP plans
a solo founder can ship in a weekend and market on a small budget.`;

const ENGINEER = `You are a senior front-end engineer. You build polished, working, self-contained
static web apps with plain HTML, CSS and JavaScript (no build step, no frameworks, no external
APIs or keys). Data lives in localStorage. Apps look good on phones and desktops.`;

function log(id, msg) {
  updateProject(id, (p) => {
    p.log.push({ at: new Date().toISOString(), msg });
    p.log = p.log.slice(-200);
  });
}

function setStage(id, stage, data) {
  updateProject(id, (p) => {
    p.stages[stage] = { ...(p.stages[stage] || {}), ...data, at: new Date().toISOString() };
  });
}

// One job at a time per project.
async function withJob(id, status, fn) {
  const p = getProject(id);
  if (!p) throw new Error("Project not found");
  if (p.busy) throw new Error("This project is already working on something");
  updateProject(id, (q) => {
    q.busy = true;
    q.status = status;
    q.error = null;
  });
  try {
    await fn();
  } catch (err) {
    console.error(`[${id}]`, err);
    log(id, `Error: ${err.message}`);
    updateProject(id, (q) => {
      q.status = "error";
      q.error = err.message;
    });
    throw err;
  } finally {
    updateProject(id, (q) => {
      q.busy = false;
    });
  }
}

// ---------------- stages ----------------

export async function analyze(id) {
  const { idea } = getProject(id);
  setStage(id, "analyze", { status: "running" });
  let result, sources = [];
  if (!isLive()) {
    log(id, "Demo mode: generating sample analysis (add an API key for real research).");
    result = demo.analysis(idea);
  } else {
    log(id, "Researching the market, customers and competitors on the web...");
    const r = await research(
      ANALYST,
      `Research this business idea thoroughly:\n\n"${idea}"\n\n` +
        `Find: who has this problem and how badly, market size signals, the main existing ` +
        `competitors and alternatives (with URLs), recent trends, pricing in the space, and risks. ` +
        `Write detailed research notes with concrete facts and numbers where you can find them.`
    );
    sources = r.sources;
    log(id, `Research done (${sources.length} sources). Scoring the idea...`);
    result = await structured(
      ANALYST,
      `Idea: "${idea}"\n\nResearch notes:\n${r.notes}\n\n` +
        `Turn this into a structured analysis. Scores are 0-10. Only list competitors that ` +
        `appear in the research, with their real URLs.`,
      AnalysisSchema
    );
  }
  setStage(id, "analyze", { status: "done", result, sources });
  updateProject(id, (p) => {
    p.name = result.oneLiner.slice(0, 80);
  });
  log(id, `Analysis complete: overall ${result.scores.overall.score}/10, verdict "${result.verdict}".`);
}

export async function plan(id) {
  const p = getProject(id);
  const analysis = p.stages.analyze?.result;
  if (!analysis) throw new Error("Run the analysis first");
  setStage(id, "plan", { status: "running" });
  log(id, "Writing the MVP plan and go-to-market...");
  const result = isLive()
    ? await structured(
        PRODUCT,
        `Idea: "${p.idea}"\n\nAnalysis:\n${JSON.stringify(analysis, null, 2)}\n\n` +
          `Write the MVP plan. If the verdict was "pivot", plan the pivoted version. Keep the MVP ` +
          `to what can be built as a single static web app (landing page + working core feature, ` +
          `data saved in the browser). Go-to-market tactics must be cheap and specific.`,
        PlanSchema
      )
    : demo.plan(p.idea, analysis);
  setStage(id, "plan", { status: "done", result });
  updateProject(id, (q) => {
    q.name = result.productName;
  });
  log(id, `Plan ready: "${result.productName}" with ${result.mvpFeatures.length} features.`);
}

function analyticsSnippet(id) {
  const endpoint = `${(process.env.STUDIO_PUBLIC_URL || `http://localhost:${process.env.PORT || 4321}`).replace(/\/$/, "")}/api/track/${id}`;
  return `<script>window.__VS=${JSON.stringify({ id, endpoint })};</script>\n<script src="vs-analytics.js"></script>`;
}

const ANALYTICS_JS = `// Venture Studio analytics: pageviews, CTA clicks, signups, feature usage.
(function () {
  var cfg = window.__VS || {};
  var sid;
  try { sid = sessionStorage.getItem("vs_sid") || Math.random().toString(36).slice(2); sessionStorage.setItem("vs_sid", sid); }
  catch (e) { sid = Math.random().toString(36).slice(2); }
  function send(type, props) {
    if (!cfg.endpoint) return;
    var body = JSON.stringify({ type: type, props: props || {}, sid: sid, path: location.pathname, ref: document.referrer || "" });
    try { if (navigator.sendBeacon && navigator.sendBeacon(cfg.endpoint, body)) return; } catch (e) {}
    try { fetch(cfg.endpoint, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "text/plain" } }); } catch (e) {}
  }
  // Previews inside the studio's iframe aren't counted.
  var inPreview = false;
  try { inPreview = window.top !== window; } catch (e) { inPreview = true; }
  window.vsTrack = inPreview ? function () {} : send;
  if (!inPreview) send("pageview");
})();
`;

export async function build(id, { feedback } = {}) {
  const p = getProject(id);
  const planResult = p.stages.plan?.result;
  if (!planResult) throw new Error("Write the plan first");
  setStage(id, "build", { status: "running" });

  let result;
  if (!isLive()) {
    log(id, "Demo mode: generating a template app.");
    result = demo.build(planResult);
  } else {
    let previous = "";
    if (feedback && fs.existsSync(appDir(id))) {
      previous = "\n\nCurrent app source (improve it, don't start from zero):\n" +
        fs.readdirSync(appDir(id))
          .filter((f) => f !== "vs-analytics.js")
          .map((f) => `--- ${f} ---\n${fs.readFileSync(path.join(appDir(id), f), "utf8")}`)
          .join("\n\n");
    }
    log(id, feedback ? "Rebuilding the app with the recommended changes..." : "Building the app (this can take a few minutes)...");
    result = await structured(
      ENGINEER,
      `Build this MVP as a static web app.\n\nPlan:\n${JSON.stringify(planResult, null, 2)}\n\n` +
        `Requirements:\n` +
        `- Files: index.html, styles.css, app.js (more files only if truly needed). Relative links only.\n` +
        `- A landing section (headline, value prop, primary call-to-action) AND the working core feature(s).\n` +
        `- A waitlist / signup form that collects an email.\n` +
        `- Analytics: a global function window.vsTrack(type, props) is available. Call\n` +
        `  vsTrack("cta") when the primary call-to-action is clicked, vsTrack("signup") when the\n` +
        `  signup form is submitted (do NOT send the email itself), and vsTrack("feature_use", {feature: "<name>"})\n` +
        `  when someone uses a core feature. Guard every call: if (window.vsTrack) vsTrack(...).\n` +
        `- Do not include analytics script tags yourself; they are injected for you.\n` +
        `- Use the brand color ${planResult.brand.primaryColor}.` +
        (feedback ? `\n\nChanges to make in this version:\n${feedback}` : "") +
        previous,
      BuildSchema,
      { effort: "high", maxTokens: 128000 }
    );
  }

  // Write files safely inside the app folder.
  const dir = appDir(id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const file of result.files) {
    const target = path.resolve(dir, file.path);
    if (!target.startsWith(dir + path.sep)) {
      log(id, `Skipped unsafe path ${file.path}`);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content);
  }
  fs.writeFileSync(path.join(dir, "vs-analytics.js"), ANALYTICS_JS);
  const indexPath = path.join(dir, "index.html");
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, "utf8");
    const snippet = analyticsSnippet(id);
    html = html.includes("</body>") ? html.replace("</body>", `${snippet}\n</body>`) : html + "\n" + snippet;
    fs.writeFileSync(indexPath, html);
  }

  const version = (p.stages.build?.version || 0) + 1;
  setStage(id, "build", {
    status: "done",
    version,
    summary: result.summary,
    files: result.files.map((f) => f.path).concat("vs-analytics.js"),
  });
  log(id, `Built v${version}: ${result.files.length} files. Preview at /apps/${id}/`);
}

export async function ship(id) {
  setStage(id, "deploy", { status: "running" });
  const out = await deploy(id, appDir(id), (m) => log(id, m));
  setStage(id, "deploy", { status: "done", ...out });
  updateProject(id, (p) => {
    p.deployUrl = out.url;
    p.status = "live";
  });
  log(id, `Live at ${out.url}`);
}

export async function pulse(id) {
  const p = getProject(id);
  const analysis = p.stages.analyze?.result;
  if (!analysis) throw new Error("Run the analysis first");
  const m = metrics(id);
  const last = p.pulses.at(-1);
  log(id, "Running market pulse: checking competitors, news and your metrics...");

  let result, sources = [];
  if (!isLive()) {
    result = demo.pulse(analysis, m);
  } else {
    const r = await research(
      ANALYST,
      `Venture: "${p.stages.plan?.result?.productName || p.name}" - ${p.idea}\n` +
        `Known competitors: ${analysis.competitors.map((c) => c.name).join(", ") || "none yet"}.\n` +
        `${last ? `Last check was ${last.at}.` : "This is the first check."}\n\n` +
        `Search for what's changed in this market recently: new competitors, launches, funding, ` +
        `pricing changes, notable news or shifts in demand. Write concise notes with URLs.`,
      { maxSearches: 6, effort: "medium" }
    );
    sources = r.sources;
    result = await structured(
      ANALYST,
      `Market notes:\n${r.notes}\n\nThe app's analytics so far:\n${JSON.stringify(m, null, 2)}\n\n` +
        `KPIs we set: ${JSON.stringify(p.stages.plan?.result?.kpis || [])}\n\n` +
        `Produce a market + performance pulse. Be specific about what to change in the product or ` +
        `marketing next, based on both the market and the numbers (if traffic is ~0, say the problem ` +
        `is distribution and recommend concrete channels).`,
      PulseSchema,
      { effort: "medium" }
    );
  }
  updateProject(id, (q) => {
    q.pulses.push({ at: new Date().toISOString(), result, sources, metrics: m });
    q.pulses = q.pulses.slice(-50);
  });
  log(id, `Pulse done: health ${result.healthScore}/10 - ${result.headline}`);
}

// ---------------- orchestration ----------------

export function runFullPipeline(id) {
  return withJob(id, "working", async () => {
    await analyze(id);
    await plan(id);
    await build(id);
    await ship(id);
    await pulse(id);
  });
}

export function runStage(id, stage, opts) {
  const fns = { analyze, plan, build: (i) => build(i, opts), deploy: ship, pulse };
  if (!fns[stage]) throw new Error(`Unknown stage ${stage}`);
  return withJob(id, "working", async () => {
    await fns[stage](id);
    // A rebuilt app that was already launched gets relaunched.
    if (stage === "build" && getProject(id).deployUrl) await ship(id);
    updateProject(id, (p) => {
      p.status = p.deployUrl ? "live" : "ready";
    });
  });
}

export function applyRecommendations(id) {
  const p = getProject(id);
  const latest = p.pulses.at(-1);
  if (!latest) throw new Error("Run a market pulse first");
  const feedback = latest.result.recommendedActions
    .filter((a) => a.effort !== "large")
    .map((a) => `- ${a.action} (${a.why})`)
    .join("\n");
  return withJob(id, "working", async () => {
    await build(id, { feedback });
    await ship(id);
  });
}
