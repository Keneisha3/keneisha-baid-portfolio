const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? esc(u) : "#");
const list = (items, fn = esc) => (items?.length ? `<ul>${items.map((i) => `<li>${fn(i)}</li>`).join("")}</ul>` : `<p class="muted">None</p>`);
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "");

let current = null;   // selected project id
let tab = "overview";
let pollTimer = null;
let status = {};

async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

// ---------------- sidebar ----------------
async function loadStatus() {
  status = await api("/status");
  const el = $("#mode");
  if (status.live) {
    el.textContent = `AI: live (${status.model})${status.vercel ? " · Vercel deploys on" : ""}`;
  } else {
    el.textContent = "Demo mode: sample data. Add ANTHROPIC_API_KEY to .env for real research and builds.";
    el.classList.add("demo");
  }
}

async function loadProjects() {
  const projects = await api("/projects");
  $("#projects").innerHTML = projects.length
    ? projects.map((p) => `<li><button data-id="${esc(p.id)}" class="${p.id === current ? "active" : ""}">
        <span class="pname">${esc(p.name)}</span>
        <span class="pmeta">${p.busy ? "Working…" : esc(p.status)}${p.score != null ? ` · ${p.score}/10` : ""}${p.health != null ? ` · health ${p.health}` : ""}</span>
      </button></li>`).join("")
    : `<li class="muted">No ventures yet.</li>`;
}

$("#projects").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (btn) select(btn.dataset.id);
});

$("#new-idea").addEventListener("submit", async (e) => {
  e.preventDefault();
  const idea = $("#idea").value.trim();
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  try {
    const p = await api("/projects", { method: "POST", body: { idea } });
    $("#idea").value = "";
    tab = "overview";
    await select(p.id);
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
});

// ---------------- project view ----------------
async function select(id) {
  current = id;
  clearTimeout(pollTimer);
  await refresh();
}

async function refresh() {
  if (!current) return;
  let p;
  try {
    p = await api(`/projects/${current}`);
  } catch {
    current = null;
    return loadProjects();
  }
  render(p);
  loadProjects();
  clearTimeout(pollTimer);
  pollTimer = setTimeout(refresh, p.busy ? 2500 : 30000);
}

const STEPS = [
  ["analyze", "Analyze", "Market & competitors"],
  ["plan", "Plan", "MVP & go-to-market"],
  ["build", "Build", "Working web app"],
  ["deploy", "Launch", "Hosted & tracked"],
  ["pulse", "Monitor", "Metrics & market"],
];

function stepState(p, key) {
  if (key === "pulse") {
    if (p.busy && p.log.at(-1)?.msg.startsWith("Running market pulse")) return "running";
    return p.pulses.length ? "done" : "";
  }
  const s = p.stages[key];
  if (!s) return "";
  if (s.status === "running") return p.busy ? "running" : "error";
  return s.status;
}

function render(p) {
  const a = p.stages.analyze?.result;
  const plan = p.stages.plan?.result;
  const last = p.log.at(-1);
  const main = $("#main");
  main.innerHTML = `
    <div class="head">
      <div>
        <h1>${esc(plan?.productName || p.name)}</h1>
        <p class="idea">${esc(p.idea)}</p>
      </div>
      <div class="actions">
        ${p.deployUrl ? `<a class="btn" href="${safeUrl(p.deployUrl)}" target="_blank" rel="noopener">Open live app ↗</a>` : ""}
        <button class="btn" data-act="run-all" ${p.busy ? "disabled" : ""}>Run everything again</button>
        <button class="btn danger" data-act="delete" ${p.busy ? "disabled" : ""}>Delete</button>
      </div>
    </div>
    ${p.busy ? `<div class="banner working">Working: ${esc(last?.msg || "starting…")}</div>` : ""}
    ${!p.busy && p.error ? `<div class="banner error">${esc(p.error)}</div>` : ""}
    <div class="steps">
      ${STEPS.map(([k, label, sub]) => `
        <div class="step ${stepState(p, k)}">
          <div class="label"><span class="dot"></span>${label}</div>
          <div class="sub">${sub}</div>
          <button class="btn small" style="margin-top:6px" data-stage="${k}" ${p.busy ? "disabled" : ""}>${stepState(p, k) === "done" ? "Redo" : "Run"}</button>
        </div>`).join("")}
    </div>
    <nav class="tabs">
      ${[["overview", "Analysis"], ["plan", "Plan"], ["app", "App"], ["monitor", "Monitor"], ["log", "Activity"]]
        .map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? "active" : ""}">${l}</button>`).join("")}
    </nav>
    <div id="tab"></div>`;

  const body = $("#tab");
  if (tab === "overview") body.innerHTML = a ? renderAnalysis(a, p.stages.analyze.sources) : waiting(p, "analysis");
  if (tab === "plan") body.innerHTML = plan ? renderPlan(plan) : waiting(p, "plan");
  if (tab === "app") body.innerHTML = renderApp(p);
  if (tab === "monitor") { body.innerHTML = renderMonitor(p); drawChart(p.metrics.daily); }
  if (tab === "log") body.innerHTML = `<div class="log">${p.log.slice().reverse().map((l) => `${esc(fmt(l.at))}  ${esc(l.msg)}`).join("\n") || "Nothing yet."}</div>`;
}

const waiting = (p, what) => `<p class="muted">${p.busy ? `Working on the ${what}…` : `No ${what} yet. Use the steps above to run it.`}</p>`;

function renderAnalysis(a, sources = []) {
  const s = a.scores;
  const row = (label, x) => `<div class="score-row" title="${esc(x.why)}"><span>${label}</span><div class="meter"><span style="width:${Math.max(0, Math.min(10, x.score)) * 10}%"></span></div><span class="n">${esc(x.score)}</span></div>`;
  return `
    <div class="grid">
      <div class="card">
        <h3>Verdict <span class="verdict ${esc(a.verdict)}">${esc(a.verdict.toUpperCase())}</span></h3>
        <p>${esc(a.verdictReason)}</p>
        ${row("Overall", s.overall)}${row("Demand", s.demand)}${row("Competition", s.competition)}${row("Feasibility", s.feasibility)}${row("Monetization", s.monetization)}
        <p class="muted" style="font-size:.8rem">Hover a score for the reasoning. Competition: higher = easier to win.</p>
      </div>
      <div class="card"><h3>Problem</h3><p>${esc(a.problem)}</p>
        <h3>Market size</h3><p><b>${esc(a.marketSize.estimate)}</b><br>${esc(a.marketSize.reasoning)}</p></div>
      <div class="card"><h3>Target customers</h3>${list(a.targetCustomers, (c) => `<b>${esc(c.segment)}:</b> ${esc(c.pain)}`)}</div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Competitors</h3>
      <table><thead><tr><th>Name</th><th>What they do</th><th>Weakness</th></tr></thead><tbody>
      ${a.competitors.map((c) => `<tr><td><a href="${safeUrl(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a></td><td>${esc(c.whatTheyDo)}</td><td>${esc(c.weakness)}</td></tr>`).join("")}
      </tbody></table></div>
    <div class="grid" style="margin-top:14px">
      <div class="card"><h3>Opportunities</h3>${list(a.opportunities)}</div>
      <div class="card"><h3>Risks</h3>${list(a.risks)}</div>
      <div class="card"><h3>Trends</h3>${list(a.trends)}</div>
      <div class="card"><h3>Pricing ideas</h3>${list(a.pricingIdeas)}</div>
    </div>
    ${sources.length ? `<div class="card sources" style="margin-top:14px"><h3>Sources</h3>${list(sources, (s) => `<a href="${safeUrl(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a>`)}</div>` : ""}`;
}

function renderPlan(pl) {
  return `
    <div class="grid">
      <div class="card"><h3>${esc(pl.productName)}</h3><p><i>${esc(pl.tagline)}</i></p><p>${esc(pl.valueProposition)}</p>
        <p class="muted">Brand: ${esc(pl.brand.tone)} · ${esc(pl.brand.primaryColor)}</p></div>
      <div class="card"><h3>MVP features</h3>${list(pl.mvpFeatures, (f) => `<b>${esc(f.name)}</b> <span class="muted">(${esc(f.priority)})</span>: ${esc(f.description)}`)}</div>
      <div class="card"><h3>KPIs</h3>${list(pl.kpis, (k) => `${esc(k.name)}: <b>${esc(k.target)}</b>`)}</div>
      <div class="card"><h3>Go-to-market</h3>${list(pl.goToMarket, (g) => `<b>${esc(g.channel)}:</b> ${esc(g.tactic)}`)}</div>
      <div class="card"><h3>First 30 days</h3>${list(pl.first30Days)}</div>
    </div>`;
}

function renderApp(p) {
  const b = p.stages.build;
  if (!b || b.status !== "done") return waiting(p, "app");
  return `
    <div class="card" style="margin-bottom:14px">
      <h3>Version ${esc(b.version)}</h3><p>${esc(b.summary)}</p>
      <p class="muted">Files: ${b.files.map(esc).join(", ")}</p>
      <form id="feedback-form" style="display:grid;gap:8px;margin-top:8px">
        <label for="feedback"><b>Ask for changes</b></label>
        <textarea id="feedback" rows="2" placeholder="e.g. Add a pricing section and make the headline about saving time"></textarea>
        <div><button class="btn primary" ${p.busy ? "disabled" : ""}>Rebuild &amp; relaunch</button></div>
      </form>
    </div>
    <iframe class="preview" src="/apps/${esc(p.id)}/?v=${esc(b.version)}" title="App preview"></iframe>`;
}

function renderMonitor(p) {
  const m = p.metrics;
  const latest = p.pulses.at(-1);
  return `
    <div class="tiles">
      <div class="tile"><div class="v">${m.visitors}</div><div class="k">Visitors</div></div>
      <div class="tile"><div class="v">${m.pageviews}</div><div class="k">Pageviews</div></div>
      <div class="tile"><div class="v">${m.ctaClicks}</div><div class="k">CTA clicks</div></div>
      <div class="tile"><div class="v">${m.signups}</div><div class="k">Signups</div></div>
      <div class="tile"><div class="v">${m.conversionRate}%</div><div class="k">Visitor → signup</div></div>
      <div class="tile"><div class="v">${latest ? esc(latest.result.healthScore) + "/10" : "–"}</div><div class="k">Health (latest pulse)</div></div>
    </div>
    <div class="grid">
      <div class="card chart"><h3>Daily visitors</h3><div id="chart"></div></div>
      <div class="card"><h3>Top referrers</h3>${kv(m.referrers)}<h3 style="margin-top:12px">Feature usage</h3>${kv(m.features)}</div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="head" style="margin:0 0 8px">
        <h3>Market pulse</h3>
        <div class="actions">
          <button class="btn" data-stage="pulse" ${p.busy ? "disabled" : ""}>Run pulse now</button>
          ${latest ? `<button class="btn primary" data-act="apply" ${p.busy ? "disabled" : ""}>Apply recommendations &amp; relaunch</button>` : ""}
        </div>
      </div>
      <p class="muted" style="margin-top:0">Runs automatically every ${esc(status.pulseHours || 24)}h for launched ventures while the studio is running.</p>
      ${p.pulses.length ? p.pulses.slice().reverse().map(renderPulse).join("") : `<p class="muted">No pulses yet.</p>`}
    </div>`;
}

function kv(obj) {
  const rows = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return rows.length ? `<table><tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:right">${v}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No data yet.</p>`;
}

function renderPulse(x) {
  const r = x.result;
  return `<div class="pulse">
    <div class="when">${esc(fmt(x.at))} · health ${esc(r.healthScore)}/10</div>
    <h3>${esc(r.headline)}</h3>
    <p>${esc(r.metricsReadout)}</p>
    <b>Recommended next</b>${list(r.recommendedActions, (a) => `${esc(a.action)} <span class="muted">(${esc(a.effort)}): ${esc(a.why)}</span>`)}
    ${r.newCompetitorsOrMoves.length ? `<b>Market moves</b>${list(r.newCompetitorsOrMoves, (c) => `<a href="${safeUrl(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a>: ${esc(c.what)}`)}` : ""}
    ${r.threats.length ? `<b>Threats</b>${list(r.threats)}` : ""}
  </div>`;
}

// Single-series bar chart of daily visitors with hover tooltips.
function drawChart(daily) {
  const el = $("#chart");
  if (!daily.length) { el.innerHTML = `<p class="muted">No visits yet. Share your app link to start collecting data.</p>`; return; }
  const W = 600, H = 180, pad = { l: 28, r: 8, t: 10, b: 22 };
  const max = Math.max(1, ...daily.map((d) => d.visitors));
  const bw = (W - pad.l - pad.r) / daily.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, Math.ceil(max / 2), max];
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily visitors">
    ${ticks.map((t) => `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("")}
    ${daily.map((d, i) => {
      const x = pad.l + i * bw, h = H - pad.b - y(d.visitors), w = Math.max(2, Math.min(40, bw - 2));
      return `<g data-tip="${esc(d.day)}: ${d.visitors} visitors, ${d.pageviews} views, ${d.signups} signups">
        <rect class="hit" x="${x}" y="${pad.t}" width="${bw}" height="${H - pad.t - pad.b}"/>
        <rect class="bar" x="${x + 1}" y="${y(d.visitors)}" width="${w}" height="${Math.max(0, h)}" rx="${Math.min(4, w / 2)}"/>
      </g>`;
    }).join("")}
    <text class="axis" x="${pad.l}" y="${H - 6}">${esc(daily[0].day)}</text>
    <text class="axis" x="${W - pad.r}" y="${H - 6}" text-anchor="end">${esc(daily.at(-1).day)}</text>
  </svg>`;
  let tip = $(".tip");
  if (!tip) { tip = document.createElement("div"); tip.className = "tip"; document.body.appendChild(tip); }
  el.querySelectorAll("g[data-tip]").forEach((g) => {
    g.addEventListener("mousemove", (e) => { tip.textContent = g.dataset.tip; tip.style.display = "block"; tip.style.left = e.clientX + 12 + "px"; tip.style.top = e.clientY - 28 + "px"; });
    g.addEventListener("mouseleave", () => (tip.style.display = "none"));
  });
}

// ---------------- actions ----------------
$("#main").addEventListener("click", async (e) => {
  const t = e.target.closest("[data-tab],[data-stage],[data-act]");
  if (!t || !current) return;
  try {
    if (t.dataset.tab) { tab = t.dataset.tab; return refresh(); }
    if (t.dataset.stage) await api(`/projects/${current}/run/${t.dataset.stage}`, { method: "POST", body: {} });
    if (t.dataset.act === "run-all") await api(`/projects/${current}/run-all`, { method: "POST" });
    if (t.dataset.act === "apply") await api(`/projects/${current}/apply`, { method: "POST" });
    if (t.dataset.act === "delete") {
      if (!confirm("Delete this venture and its app and data?")) return;
      await api(`/projects/${current}`, { method: "DELETE" });
      current = null;
      location.reload();
      return;
    }
    refresh();
  } catch (err) {
    alert(err.message);
  }
});

$("#main").addEventListener("submit", async (e) => {
  if (e.target.id !== "feedback-form") return;
  e.preventDefault();
  const feedback = $("#feedback").value.trim();
  if (!feedback) return;
  try {
    await api(`/projects/${current}/run/build`, { method: "POST", body: { feedback } });
    refresh();
  } catch (err) {
    alert(err.message);
  }
});

await loadStatus();
await loadProjects();
