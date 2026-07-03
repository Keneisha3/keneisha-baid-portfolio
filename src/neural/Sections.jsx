/* DOM layer of the neural experience — designed as museum wall-text and
   bench instruments, not web cards. Asymmetric, typographic, hairline rules.
   Every project is a different artifact with its own interaction. */
import { useMemo, useRef, useState } from "react";
import { PROFILE, PROJECTS, TOOLKIT, EXPERIENCE, PLAYLIST } from "../data/portfolio";

/* ---------- shared type primitives ---------- */
const BONE = "text-[#e8e4dc]";
const DIM = "text-[#8b8fa3]";
const FAINT = "text-[#4a4f60]";
const CY = "text-[#37d6f5]";
const CU = "text-[#d98a4a]";
const RULE = "border-t border-[#ffffff14]";

function Kicker({ children, className = "" }) {
  return (
    <p className={`font-mono text-[10px] uppercase tracking-[0.4em] ${CY} ${className}`}>
      {children}
    </p>
  );
}

function Links({ links }) {
  if (!links?.length)
    return (
      <span className={`font-mono text-[11px] ${FAINT}`}>no external record — in formation</span>
    );
  return (
    <span className="flex flex-wrap gap-x-6 gap-y-1">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`font-mono text-[11px] uppercase tracking-[0.2em] ${DIM} underline decoration-[#ffffff2a] underline-offset-4 transition-colors hover:text-[#37d6f5] hover:decoration-[#37d6f5]`}
        >
          {l.label} ↗
        </a>
      ))}
    </span>
  );
}

/* =====================================================================
   LANDING — a museum wall label in the dark, bottom-left. The bust is
   the composition; the type only annotates it.
===================================================================== */
export function Landing({ onSkip }) {
  return (
    <section className="relative h-screen">
      <div className="rise absolute bottom-16 left-6 max-w-xs sm:left-12 sm:max-w-sm">
        <p className={`font-mono text-[10px] uppercase tracking-[0.4em] ${FAINT}`}>
          collection № 01
        </p>
        <h1 className={`mt-4 font-display text-2xl font-medium leading-snug sm:text-3xl ${BONE}`}>
          Portrait of a working mind
        </h1>
        <p className={`mt-3 font-display text-sm italic ${DIM}`}>
          Keneisha Baid — Management Engineering, University of Waterloo.
          <br />
          Marble, copper, and current. 2022–present.
        </p>
        <div className={`mt-6 w-16 ${RULE}`} />
        <p className={`mt-4 font-mono text-[10px] uppercase tracking-[0.3em] ${DIM}`}>
          scroll to descend
        </p>
      </div>
      <button
        onClick={onSkip}
        className={`rise absolute bottom-16 right-6 font-mono text-[10px] uppercase tracking-[0.3em] sm:right-12 ${FAINT} transition-colors hover:text-[#37d6f5]`}
      >
        skip the descent →
      </button>
    </section>
  );
}

/* =====================================================================
   PROJECT ARTIFACTS — six different instruments
===================================================================== */

/* MEM — the market watcher: a scrubable price viewport */
function ArtifactViewport() {
  const [cursor, setCursor] = useState(null);
  const svgRef = useRef(null);
  const { pts, path, markers } = useMemo(() => {
    // seeded random walk so the trace is identical every visit
    let x = 913;
    const rnd = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
    const pts = [];
    let v = 80;
    for (let i = 0; i < 64; i++) {
      v += (rnd() - 0.48) * 9;
      v = Math.max(30, Math.min(130, v));
      pts.push(v);
    }
    const X = (i) => (i / 63) * 560;
    const Y = (v) => 160 - v;
    const path = pts.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
    return { pts, path, markers: [11, 29, 46, 58] };
  }, []);
  const onMove = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * 63);
    setCursor(Math.max(0, Math.min(63, i)));
  };
  const nearSignal = cursor !== null && markers.some((m) => Math.abs(m - cursor) <= 1);
  return (
    <div>
      <svg
        ref={svgRef}
        viewBox="0 0 560 170"
        className="w-full cursor-crosshair select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setCursor(null)}
      >
        <line x1="0" y1="160" x2="560" y2="160" stroke="#ffffff14" />
        <path d={path} fill="none" stroke="#8b8fa3" strokeWidth="1" />
        {markers.map((m) => (
          <g key={m}>
            <circle cx={(m / 63) * 560} cy={160 - pts[m]} r="3" fill="none" stroke="#d98a4a" />
            <line
              x1={(m / 63) * 560} y1={160 - pts[m] + 6}
              x2={(m / 63) * 560} y2="160"
              stroke="#d98a4a" strokeWidth="0.5" strokeDasharray="2 3"
            />
          </g>
        ))}
        {cursor !== null && (
          <g>
            <line x1={(cursor / 63) * 560} y1="0" x2={(cursor / 63) * 560} y2="160" stroke="#37d6f5" strokeWidth="0.5" />
            <circle cx={(cursor / 63) * 560} cy={160 - pts[cursor]} r="2.5" fill="#37d6f5" />
          </g>
        )}
      </svg>
      <div className="mt-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.2em]">
        <span className={DIM}>
          {cursor === null
            ? "run your cursor along the tape"
            : `t+${cursor} · ${pts[cursor].toFixed(1)}`}
        </span>
        <span className={nearSignal ? CU : FAINT}>
          {nearSignal ? "◈ volatility signal fired" : "◇ 4 signals on record"}
        </span>
      </div>
    </div>
  );
}

/* MEM — the model bench: compare four fitted models */
const BENCH = [
  ["k-nearest neighbours", 0.612],
  ["support vector machine", 0.655],
  ["gradient boosting", 0.718],
  ["random forest", 0.779],
];
function ArtifactBench() {
  const [sel, setSel] = useState(3);
  return (
    <div>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {BENCH.map(([name], i) => (
          <button
            key={name}
            onClick={() => setSel(i)}
            className={`font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
              sel === i ? CY : FAINT
            } hover:text-[#8b8fa3]`}
          >
            {sel === i ? "▸ " : ""}
            {name}
          </button>
        ))}
      </div>
      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className={`font-mono text-[10px] uppercase tracking-[0.3em] ${DIM}`}>
            coefficient of determination
          </span>
          <span className={`font-display text-3xl ${sel === 3 ? BONE : DIM}`}>
            R² = {BENCH[sel][1].toFixed(3)}
          </span>
        </div>
        <div className="mt-2 h-px w-full bg-[#ffffff14]">
          <div
            className="h-px bg-[#37d6f5] transition-all duration-700 ease-out"
            style={{ width: `${BENCH[sel][1] * 100}%` }}
          />
        </div>
        <p className={`mt-2 text-right font-mono text-[10px] ${sel === 3 ? CU : FAINT}`}>
          {sel === 3 ? "◈ best fit — the memory kept this one" : "an earlier attempt, retained for honesty"}
        </p>
      </div>
    </div>
  );
}

/* MEM — the storyboard: walk the UX flow frame by frame */
const FRAMES = [
  { k: "onboarding", draw: (
    <g><rect x="200" y="24" width="160" height="10" rx="2" fill="#8b8fa3" opacity=".5"/><rect x="220" y="46" width="120" height="6" rx="2" fill="#4a4f60"/><rect x="235" y="70" width="90" height="16" rx="8" fill="none" stroke="#37d6f5"/></g>
  )},
  { k: "household", draw: (
    <g><rect x="24" y="20" width="70" height="70" rx="4" fill="none" stroke="#8b8fa3"/><rect x="104" y="20" width="70" height="70" rx="4" fill="none" stroke="#8b8fa3"/><rect x="184" y="20" width="70" height="70" rx="4" fill="none" stroke="#37d6f5"/><rect x="264" y="20" width="70" height="70" rx="4" fill="none" stroke="#8b8fa3"/><circle cx="219" cy="42" r="8" fill="#37d6f5" opacity=".6"/></g>
  )},
  { k: "schedule", draw: (
    <g>{[0,1,2,3,4].map(i=>(<line key={i} x1={40+i*64} y1="18" x2={40+i*64} y2="92" stroke="#ffffff14"/>))}<rect x="46" y="30" width="52" height="14" rx="2" fill="#37d6f5" opacity=".35"/><rect x="110" y="52" width="116" height="14" rx="2" fill="#d98a4a" opacity=".4"/><rect x="238" y="26" width="52" height="14" rx="2" fill="#8b8fa3" opacity=".3"/></g>
  )},
  { k: "tasks", draw: (
    <g>{[0,1,2].map(i=>(<g key={i}><rect x="30" y={24+i*24} width="12" height="12" rx="2" fill="none" stroke={i===0?"#37d6f5":"#4a4f60"}/><rect x="54" y={27+i*24} width={180-i*40} height="6" rx="2" fill="#4a4f60"/></g>))}<path d="M33 30 l3 3 5 -6" stroke="#37d6f5" fill="none"/></g>
  )},
  { k: "shared care", draw: (
    <g><circle cx="150" cy="55" r="26" fill="none" stroke="#8b8fa3"/><circle cx="210" cy="55" r="26" fill="none" stroke="#37d6f5"/><path d="M150 55 h60" stroke="#d98a4a" strokeDasharray="3 3"/></g>
  )},
];
function ArtifactStoryboard() {
  const [f, setF] = useState(0);
  return (
    <div>
      <svg viewBox="0 0 380 110" className="w-full rounded-sm border border-[#ffffff14] bg-[#05070a]">
        {FRAMES[f].draw}
      </svg>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-4">
          {FRAMES.map((fr, i) => (
            <button
              key={fr.k}
              onClick={() => setF(i)}
              className={`font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                f === i ? CY : FAINT
              } hover:text-[#8b8fa3]`}
            >
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
        <span className={`font-mono text-[10px] uppercase tracking-[0.25em] ${DIM}`}>
          frame — {FRAMES[f].k}
        </span>
      </div>
    </div>
  );
}

/* MEM — the two-market instrument: weigh Tokyo against New York */
function ArtifactSeesaw() {
  const [w, setW] = useState(50);
  const rho = (0.31 + Math.abs(w - 50) * 0.006).toFixed(2);
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.25em]">
        <span className={w <= 50 ? CY : FAINT}>nikkei 225</span>
        <span className={FAINT}>÷</span>
        <span className={w > 50 ? CU : FAINT}>dow jones</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={w}
        onChange={(e) => setW(Number(e.target.value))}
        className="seesaw mt-3 w-full"
        aria-label="Weight between the Nikkei 225 and the Dow Jones"
      />
      <div className="mt-3 grid grid-cols-2 gap-6">
        <div>
          <div className="h-px bg-[#ffffff14]">
            <div className="h-px bg-[#37d6f5] transition-all duration-300" style={{ width: `${100 - w}%` }} />
          </div>
          <p className={`mt-1.5 font-mono text-[10px] ${DIM}`}>policy: yield-curve control era</p>
        </div>
        <div className="text-right">
          <div className="h-px bg-[#ffffff14]">
            <div className="ml-auto h-px bg-[#d98a4a] transition-all duration-300" style={{ width: `${w}%` }} />
          </div>
          <p className={`mt-1.5 font-mono text-[10px] ${DIM}`}>policy: tightening cycle</p>
        </div>
      </div>
      <p className={`mt-3 font-mono text-[10px] uppercase tracking-[0.2em] ${FAINT}`}>
        simulated divergence · ρ ≈ {rho} — drag the balance
      </p>
    </div>
  );
}

/* MEM — the automaton: step the Markov chain by hand */
const STATES = [
  { k: "own fleet", x: 70, y: 42 },
  { k: "3pl", x: 300, y: 42 },
  { k: "hybrid", x: 185, y: 118 },
];
const P = [
  [0.6, 0.25, 0.15],
  [0.3, 0.55, 0.15],
  [0.35, 0.35, 0.3],
];
function ArtifactAutomaton() {
  const [s, setS] = useState(0);
  const [hist, setHist] = useState([0]);
  const step = () => {
    const r = Math.random();
    const row = P[s];
    const next = r < row[0] ? 0 : r < row[0] + row[1] ? 1 : 2;
    setS(next);
    setHist((h) => [...h.slice(-17), next]);
  };
  return (
    <div>
      <svg viewBox="0 0 380 150" className="w-full select-none">
        <path d="M104 42 H266" stroke="#ffffff22" />
        <path d="M92 60 L166 106" stroke="#ffffff22" />
        <path d="M288 60 L212 106" stroke="#ffffff22" />
        {STATES.map((st, i) => (
          <g key={st.k}>
            <circle
              cx={st.x} cy={st.y} r="26"
              fill={s === i ? "rgba(55,214,245,0.08)" : "none"}
              stroke={s === i ? "#37d6f5" : "#4a4f60"}
              strokeWidth={s === i ? 1.5 : 1}
            />
            <text x={st.x} y={st.y + 3} textAnchor="middle" fontSize="9" fontFamily="IBM Plex Mono" fill={s === i ? "#e8e4dc" : "#8b8fa3"} style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {st.k}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={step}
          className={`font-mono text-[11px] uppercase tracking-[0.25em] ${CY} underline decoration-[#37d6f5]/40 underline-offset-4 hover:decoration-[#37d6f5]`}
        >
          advance the chain ▸
        </button>
        <span className="flex gap-1.5">
          {hist.map((h, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: ["#37d6f5", "#d98a4a", "#8b8fa3"][h],
                opacity: 0.25 + (i / hist.length) * 0.75,
              }}
            />
          ))}
        </span>
      </div>
      <p className={`mt-2 font-mono text-[10px] uppercase tracking-[0.2em] ${FAINT}`}>
        p(stay | own fleet) = 0.60 · each step is a quarter
      </p>
    </div>
  );
}

/* MEM — the forming memory: hover to stimulate the growing network */
function ArtifactForming() {
  const { nodes, edges } = useMemo(() => {
    let x = 5;
    const rnd = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
    const nodes = Array.from({ length: 13 }).map(() => ({
      x: 24 + rnd() * 332,
      y: 18 + rnd() * 104,
      r: 2 + rnd() * 2.5,
    }));
    const edges = [];
    nodes.forEach((n, i) => {
      const near = nodes
        .map((m, j) => ({ j, d: Math.hypot(n.x - m.x, n.y - m.y) }))
        .filter((e) => e.j > i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      near.forEach((e) => edges.push([i, e.j]));
    });
    return { nodes, edges };
  }, []);
  return (
    <div className="group">
      <svg viewBox="0 0 380 140" className="w-full">
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
            stroke="#d98a4a"
            strokeWidth="0.6"
            strokeDasharray="60"
            strokeDashoffset="60"
            className="transition-all duration-[1400ms] ease-out group-hover:[stroke-dashoffset:0]"
            opacity="0.6"
          />
        ))}
        {nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.x} cy={n.y} r={n.r}
            fill="#0a0703"
            stroke="#d98a4a"
            strokeWidth="0.8"
            className="transition-all duration-700 group-hover:fill-[#d98a4a]"
            style={{ transitionDelay: `${i * 60}ms` }}
          />
        ))}
      </svg>
      <p className={`mt-2 font-mono text-[10px] uppercase tracking-[0.25em] ${CU}`}>
        ◈ memory still forming — hold your cursor here to stimulate growth
      </p>
    </div>
  );
}

/* ---------- artifact registry ---------- */
const ARTIFACTS = [
  { match: /patent/i, label: "a forming memory", el: <ArtifactForming /> },
  { match: /atr|signal/i, label: "a scrubbable tape", el: <ArtifactViewport /> },
  { match: /election/i, label: "a model bench", el: <ArtifactBench /> },
  { match: /famflow/i, label: "a storyboard", el: <ArtifactStoryboard /> },
  { match: /financial|market|nikkei/i, label: "a balance instrument", el: <ArtifactSeesaw /> },
  { match: /markov/i, label: "an automaton", el: <ArtifactAutomaton /> },
];

export function ProjectNeurons() {
  return (
    <section id="projects" className="relative mx-auto max-w-5xl px-6 py-32 sm:px-12">
      <header className="mb-20 max-w-md">
        <Kicker>wing II — the memory vault</Kicker>
        <h2 className={`mt-4 font-display text-3xl font-medium leading-tight ${BONE}`}>
          Six memories,
          <br />
          <span className="italic">recalled on request.</span>
        </h2>
        <p className={`mt-4 text-sm leading-relaxed ${DIM}`}>
          Each is stored differently, the way real memories are. Touch them.
        </p>
      </header>

      <div className="space-y-24">
        {PROJECTS.map((p, i) => {
          const art = ARTIFACTS.find((a) => a.match.test(p.title));
          const even = i % 2 === 0;
          return (
            <article
              key={p.title}
              className={`grid gap-8 md:grid-cols-12 ${RULE} pt-10`}
            >
              {/* catalog rail */}
              <div className={`md:col-span-3 ${even ? "" : "md:order-last md:text-right"}`}>
                <p className={`font-mono text-[10px] uppercase tracking-[0.35em] ${FAINT}`}>
                  mem.{String(i + 1).padStart(2, "0")}
                </p>
                <p className={`mt-1 font-mono text-[10px] uppercase tracking-[0.2em] ${p.status ? CU : CY}`}>
                  {p.status ? "still forming" : "consolidated"}
                </p>
                <p className={`mt-4 font-display text-sm italic ${DIM}`}>
                  stored as {art?.label ?? "a plain record"}
                </p>
                <div className={`mt-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] ${FAINT} ${even ? "" : "md:justify-end"}`}>
                  {p.tech.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>

              {/* the artifact */}
              <div className="md:col-span-9">
                <h3 className={`font-display text-xl font-medium ${BONE}`}>{p.title}</h3>
                <p className={`mt-2 max-w-xl text-sm leading-relaxed ${DIM}`}>{p.description}</p>
                <div className="mt-6">{art?.el}</div>
                <div className="mt-5">
                  <Links links={p.links} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* =====================================================================
   SKILLS — a specimen index, set like a museum catalogue page
===================================================================== */
export function SkillTerminals() {
  return (
    <section id="skills" className="relative mx-auto max-w-5xl px-6 py-32 sm:px-12">
      <header className="mb-16 flex justify-end">
        <div className="max-w-xs text-right">
          <Kicker>wing III — the workshop</Kicker>
          <h2 className={`mt-4 font-display text-3xl font-medium leading-tight ${BONE}`}>
            Tools, catalogued
            <br />
            <span className="italic">without ceremony.</span>
          </h2>
        </div>
      </header>

      <div>
        {TOOLKIT.map((cat, ci) => (
          <div key={cat.group} className={`${RULE} grid gap-2 py-6 md:grid-cols-12`}>
            <div className="md:col-span-4">
              <span className={`font-mono text-[10px] uppercase tracking-[0.35em] ${DIM}`}>
                {String(ci + 1).padStart(2, "0")} · {cat.group}
              </span>
            </div>
            <p className={`md:col-span-7 font-display text-base leading-loose ${BONE}`}>
              {cat.items.map((tool, i) => (
                <span key={tool}>
                  <span className="cursor-default transition-colors hover:text-[#d98a4a]">{tool}</span>
                  {i < cat.items.length - 1 && <span className={FAINT}> · </span>}
                </span>
              ))}
            </p>
            <span className={`hidden font-mono text-[10px] md:col-span-1 md:block md:text-right ${FAINT}`}>
              {cat.items.length}
            </span>
          </div>
        ))}
      </div>
      <p className={`mt-8 font-mono text-[10px] uppercase tracking-[0.25em] ${FAINT}`}>
        an honest inventory — several still being learned
      </p>
    </section>
  );
}

/* =====================================================================
   EXPERIENCE — wall labels beside invisible artifacts
===================================================================== */
export function MuseumExhibit() {
  return (
    <section id="experience" className="relative mx-auto max-w-5xl px-6 py-32 sm:px-12">
      <header className="mb-20 max-w-md">
        <Kicker>wing IV — acquisitions</Kicker>
        <h2 className={`mt-4 font-display text-3xl font-medium leading-tight ${BONE}`}>
          Five rooms
          <br />
          <span className="italic">that shaped the mind.</span>
        </h2>
      </header>

      <div>
        {EXPERIENCE.map((e, i) => (
          <article key={`${e.company}-${e.role}`} className={`${RULE} grid gap-6 py-12 md:grid-cols-12`}>
            <div className="relative md:col-span-3">
              <span
                className="pointer-events-none select-none font-display text-7xl font-medium leading-none text-transparent"
                style={{ WebkitTextStroke: "1px #ffffff1e" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className={`mt-3 font-mono text-[10px] uppercase tracking-[0.3em] ${CU}`}>
                {e.period}
              </p>
            </div>
            <div className="md:col-span-8">
              <h3 className={`font-display text-xl font-medium ${BONE}`}>
                {e.role} <span className={`italic ${DIM}`}>at {e.company}</span>
              </h3>
              <ul className="mt-4 max-w-xl space-y-3">
                {e.bullets.map((b, j) => (
                  <li key={j} className={`flex gap-4 text-sm leading-relaxed ${DIM}`}>
                    <span className={`mt-px font-mono text-[10px] ${FAINT}`}>—</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* =====================================================================
   CONTACT — the core. A terminal carved into the dark, off-axis.
===================================================================== */
const TERM = [
  { t: "keneisha@core:~$ whoami", c: true },
  { t: "  the processor at the center of all of this" },
  { t: "keneisha@core:~$ contact --list", c: true },
  { t: "  email      kbaid@uwaterloo.ca", href: "mailto:kbaid@uwaterloo.ca" },
  { t: "  linkedin   /in/keneisha-baid", href: PROFILE.linkedin },
  { t: "  github     github.com/Keneisha3", href: PROFILE.github },
  { t: `  playlist   what this mind runs on ♪`, href: `https://open.spotify.com/playlist/${PLAYLIST.spotifyId}` },
  { t: "keneisha@core:~$ status", c: true },
  { t: "  listening — fintech · data · product" },
];

export function CoreTerminal() {
  const [booted, setBooted] = useState(0);
  const ref = useRef(null);
  const startedRef = useRef(false);

  const onEnter = (node) => {
    if (!node || startedRef.current) return;
    ref.current = node;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          let i = 0;
          const t = setInterval(() => {
            i++;
            setBooted(i);
            if (i >= TERM.length) clearInterval(t);
          }, 320);
          obs.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(node);
  };

  return (
    <section id="contact" className="relative mx-auto max-w-5xl px-6 py-32 pb-44 sm:px-12">
      <div className="grid gap-10 md:grid-cols-12">
        <header className="md:col-span-4">
          <Kicker>the core</Kicker>
          <h2 className={`mt-4 font-display text-3xl font-medium leading-tight ${BONE}`}>
            Every signal
            <br />
            <span className="italic">ends here.</span>
          </h2>
          <p className={`mt-4 text-sm leading-relaxed ${DIM}`}>
            The central processor takes external input. It responds quickly to
            interesting problems.
          </p>
        </header>

        <div className="md:col-span-8" ref={onEnter}>
          <div className="border-l border-[#ffffff14] pl-6 font-mono text-[13px] leading-8 sm:pl-10">
            {TERM.slice(0, booted).map((l, i) =>
              l.href ? (
                <a
                  key={i}
                  href={l.href}
                  target={l.href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className={`block whitespace-pre ${DIM} transition-colors hover:text-[#37d6f5]`}
                >
                  {l.t} <span className={FAINT}>↗</span>
                </a>
              ) : (
                <div key={i} className={`whitespace-pre ${l.c ? CY : "text-[#c6cbd8]"}`}>
                  {l.t}
                </div>
              )
            )}
            {booted >= TERM.length && (
              <div className={CY}>
                keneisha@core:~$ <span className="caret">█</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className={`mt-28 flex flex-wrap items-baseline justify-between gap-3 ${RULE} pt-5`}>
        <span className={`font-mono text-[10px] uppercase tracking-[0.3em] ${FAINT}`}>
          © {new Date().getFullYear()} {PROFILE.name}
        </span>
        <span className={`font-mono text-[10px] ${FAINT}`}>
          bust: “Marble Bust 01”, Poly Haven — CC0
        </span>
      </footer>
    </section>
  );
}
