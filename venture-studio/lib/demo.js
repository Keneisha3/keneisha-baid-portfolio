// Canned output so the whole pipeline can be tried without an API key.
// Everything here is clearly labelled as sample data in the UI.

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
function nameFrom(idea) {
  const words = idea.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/)
    .filter((w) => w.length > 3 && !["that", "with", "which", "help", "helps", "people", "their", "app", "for", "from", "into", "about"].includes(w));
  return titleCase((words[0] || "venture") + (words[1] ? " " + words[1] : "")) + " Hub";
}

export function analysis(idea) {
  return {
    oneLiner: idea.length > 80 ? idea.slice(0, 77) + "..." : idea,
    problem: `[Sample] People who need "${idea}" currently patch together spreadsheets and generic tools.`,
    targetCustomers: [
      { segment: "Early adopters online", pain: "Wasting hours on manual workarounds" },
      { segment: "Small businesses", pain: "Existing tools are too expensive or complex" },
    ],
    marketSize: { estimate: "[Sample] ~$500M niche", reasoning: "Demo mode: add an API key for real web research." },
    competitors: [
      { name: "Generic Tool A", url: "https://example.com", whatTheyDo: "Broad all-in-one platform", weakness: "Not focused on this use case" },
      { name: "Spreadsheets", url: "https://example.com", whatTheyDo: "The DIY alternative", weakness: "Manual and error-prone" },
    ],
    trends: ["[Sample] Growing demand for niche, AI-assisted tools"],
    risks: ["[Sample] Low switching cost", "[Sample] Hard to reach customers cheaply"],
    opportunities: ["[Sample] Underserved segment", "[Sample] Community-led growth"],
    pricingIdeas: ["Free tier + $9/mo pro", "One-time $29 lifetime deal for early users"],
    scores: {
      demand: { score: 6, why: "Sample score" },
      competition: { score: 5, why: "Sample score" },
      feasibility: { score: 8, why: "Sample score" },
      monetization: { score: 5, why: "Sample score" },
      overall: { score: 6, why: "Sample score: real research needs an API key" },
    },
    verdict: "go",
    verdictReason: "[Sample] Cheap to test with a landing page and a simple MVP.",
  };
}

export function plan(idea, a) {
  const productName = nameFrom(idea);
  return {
    productName,
    tagline: "The simplest way to get it done.",
    valueProposition: a.problem.replace("[Sample] ", ""),
    mvpFeatures: [
      { name: "Quick add", description: "Add an item in one tap", priority: "must" },
      { name: "List & search", description: "See and filter everything you added", priority: "must" },
      { name: "Waitlist", description: "Collect emails for the full version", priority: "must" },
    ],
    pages: [{ name: "Home", purpose: "Landing + the working tool" }],
    brand: { primaryColor: "#6d5efc", tone: "Friendly and direct" },
    goToMarket: [
      { channel: "Reddit / niche communities", tactic: "Share the problem story and ask for feedback" },
      { channel: "Product Hunt", tactic: "Launch once 50 people are on the waitlist" },
    ],
    kpis: [
      { name: "Visitors", target: "200 in week 1" },
      { name: "Signup rate", target: "10%+" },
    ],
    first30Days: ["Post in 3 communities", "Talk to 10 potential users", "Ship 2 improvements from feedback"],
  };
}

export function build(plan) {
  const c = plan.brand.primaryColor;
  const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(plan.productName)}</title><link rel="stylesheet" href="styles.css"></head>
<body>
<header class="hero"><h1>${esc(plan.productName)}</h1><p>${esc(plan.tagline)}</p>
<a href="#tool" class="btn" id="cta">Try it now</a></header>
<main>
<section id="tool" class="card"><h2>Your list</h2>
<form id="add"><input id="item" placeholder="Add something..." required><button class="btn">Add</button></form>
<input id="search" placeholder="Search...">
<ul id="list"></ul></section>
<section class="card"><h2>Get early access</h2><p>${esc(plan.valueProposition)}</p>
<form id="signup"><input type="email" id="email" placeholder="you@email.com" required><button class="btn">Join the waitlist</button></form>
<p id="thanks" hidden>Thanks! You're on the list.</p></section>
</main>
<script src="app.js"></script>
</body></html>`;
  const css = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#f6f6fb;color:#1b1b2f}
.hero{background:${c};color:#fff;padding:64px 20px;text-align:center}.hero h1{font-size:2.4rem;margin:0 0 8px}
main{max-width:640px;margin:-32px auto 40px;padding:0 16px;display:grid;gap:16px}
.card{background:#fff;border-radius:14px;padding:20px;box-shadow:0 4px 20px #0001}
form{display:flex;gap:8px;margin:8px 0}input{flex:1;padding:10px 12px;border:1px solid #ddd;border-radius:10px;font:inherit;width:100%}
.btn{background:${c};color:#fff;border:0;border-radius:10px;padding:10px 16px;font:inherit;cursor:pointer;text-decoration:none;display:inline-block}
.hero .btn{background:#fff;color:${c};margin-top:16px}ul{padding-left:18px}li{padding:4px 0}`;
  const js = `const KEY="vs_items";let items=JSON.parse(localStorage.getItem(KEY)||"[]");
const list=document.getElementById("list"),search=document.getElementById("search");
function render(){const q=search.value.toLowerCase();list.innerHTML="";items.filter(i=>i.toLowerCase().includes(q)).forEach(i=>{const li=document.createElement("li");li.textContent=i;list.appendChild(li);});}
document.getElementById("add").onsubmit=e=>{e.preventDefault();const v=document.getElementById("item");items.unshift(v.value);localStorage.setItem(KEY,JSON.stringify(items));v.value="";render();if(window.vsTrack)vsTrack("feature_use",{feature:"Quick add"});};
search.oninput=()=>{render();if(window.vsTrack)vsTrack("feature_use",{feature:"List & search"});};
document.getElementById("cta").onclick=()=>{if(window.vsTrack)vsTrack("cta");};
document.getElementById("signup").onsubmit=e=>{e.preventDefault();e.target.hidden=true;document.getElementById("thanks").hidden=false;if(window.vsTrack)vsTrack("signup");};
render();`;
  return {
    summary: "[Sample] A template landing page with a working list tool and a waitlist form. Add an API key to have Claude build a custom app for your idea.",
    files: [
      { path: "index.html", content: html },
      { path: "styles.css", content: css },
      { path: "app.js", content: js },
    ],
  };
}

export function pulse(a, m) {
  return {
    headline: m.visitors ? `[Sample] ${m.visitors} visitors so far, ${m.conversionRate}% signed up` : "[Sample] No traffic yet: distribution is the bottleneck",
    newCompetitorsOrMoves: [],
    trends: a.trends,
    threats: a.risks.slice(0, 1),
    metricsReadout: `${m.pageviews} pageviews, ${m.ctaClicks} CTA clicks, ${m.signups} signups.`,
    recommendedActions: [
      { action: "Make the headline name the exact customer and pain", why: "Clearer landing pages convert better", effort: "small" },
      { action: "Post the app in two niche communities this week", why: "You need traffic before you can learn anything", effort: "small" },
    ],
    healthScore: m.signups ? 6 : 4,
  };
}
