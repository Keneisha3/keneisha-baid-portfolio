/* DOM layer of the neural experience — designed as museum wall-text and
   bench instruments, not web cards. Asymmetric, typographic, hairline rules.
   Every project is a different artifact with its own interaction. */
import { useEffect, useMemo, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";
import { PROFILE, PROJECTS, TOOLKIT, EXPERIENCE, PLAYLIST, INTERESTS, FAVE_SONGS } from "../data/portfolio";

/* The eleven stations of the walk: six project paintings, five rooms. */
export const STATION_COUNT = () => PROJECTS.length + EXPERIENCE.length;

/* ---------- horizontal gallery rail with an honest, visible scroll bar.
   Browsing sideways is optional: scroll the bar (or swipe/drag) to walk the
   room, or simply continue down the page past it. ---------- */
function Rail({ children, id }) {
  return (
    <section id={id} className="relative py-20">
      <div className="rail flex items-start gap-12 overflow-x-auto px-[7vw] pb-6">
        {children}
      </div>
      <p className="mt-3 px-[7vw] font-mono text-[10px] uppercase tracking-[0.3em] text-[#a09a8c]">
        ⟷ slide to browse — or keep scrolling down
      </p>
    </section>
  );
}

/* Pulls real material into a project's box: a Figma embed, the actual
   presentation PDF, or the repository's own preview card. */
function ProjectMedia({ p }) {
  const figma = p.figma || p.links?.find((l) => /figma/i.test(l.label))?.href;
  if (figma)
    return (
      <div className="w-full bg-white">
        <iframe
          title={`${p.title} — Figma`}
          src={`https://www.figma.com/embed?embed_host=portfolio&url=${encodeURIComponent(figma)}`}
          className="h-80 w-full rounded-t-md border-b border-[#1c1a1712] bg-white"
          loading="lazy"
          allowFullScreen
        />
        {/famflow/i.test(p.title) && (
          <p className="px-3 pb-3 pt-2 font-sans text-[10px] italic tracking-[0.12em] text-[#6b6459]">
            hover to load if the prototype does not appear automatically
          </p>
        )}
      </div>
    );
  const pdf = p.links?.find((l) => /pdf|presentation/i.test(l.label))?.href;
  if (pdf)
    return (
      <iframe
        title={`${p.title} — presentation, first page`}
        src={`${pdf}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        className="pointer-events-none h-44 w-full rounded-t-md border-b border-[#1c1a1712] bg-white"
        loading="lazy"
      />
    );
  const gh = p.links?.find((l) => /github\.com\//.test(l.href || ""));
  const m = gh && /github\.com\/([^/]+\/[^/.]+)/.exec(gh.href);
  if (m)
    return (
      <a
        href={gh.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 border-b border-[#1c1a1712] bg-[#f3efe6] px-4 py-3 transition-colors hover:bg-[#efe9dc]"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 fill-[#5d5749]" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
        </svg>
        <span className="truncate font-mono text-[12px] text-[#3a352c]">{m[1]}</span>
        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[#a09a8c] group-hover:text-[#a4622e]">
          open ↗
        </span>
      </a>
    );
  return null;
}

/* ---------- a framed painting, hung on the museum wall ---------- */
function Painting({ children, plaque }) {
  return (
    <figure>
      <div className="painting-frame">
        <div className="painting-mat">{children}</div>
      </div>
      {plaque && (
        <figcaption className="mt-3 flex justify-center">
          <span className="painting-plaque rounded-sm px-3.5 py-1 font-mono text-[9px] uppercase tracking-[0.28em] text-[#4a4234]">
            {plaque}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

/* ---------- shared type primitives ---------- */
const BONE = "text-[#171411]";
const DIM = "text-[#5d5749]";
const FAINT = "text-[#a09a8c]";
const CY = "text-[#a4622e]";
const CU = "text-[#d98a4a]";
const RULE = "border-t border-[#1c1a1714]";

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
          className={`font-mono text-[11px] uppercase tracking-[0.2em] ${DIM} underline decoration-[#1c1a172a] underline-offset-4 transition-colors hover:text-[#a4622e] hover:decoration-[#a4622e]`}
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
  // Name and credentials at the top of the gallery wall, set in ink.
  return (
    <section className="relative h-screen">
      <div className="rise absolute left-6 top-20 max-w-sm sm:left-12 sm:top-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#a09a8c]">
          collection № 01
        </p>
        <h1 className="mt-3 font-sans text-3xl font-medium leading-snug text-[#1c1a17] sm:text-4xl">
          Keneisha Baid
        </h1>
        <p className="mt-2 font-sans text-sm text-[#6b6459]">
          Management Engineering, University of Waterloo.
          <br />
          Portrait of a working mind — marble and light, 2022–present.
        </p>
        <div className="mt-5 w-16 border-t border-[#1c1a1720]" />
      </div>

      <p className="rise absolute bottom-16 left-6 font-mono text-[10px] uppercase tracking-[0.3em] text-[#6b6459] sm:left-12">
        scroll — the stone is cracking
      </p>
      <button
        onClick={onSkip}
        className="rise absolute bottom-16 right-6 font-mono text-[10px] uppercase tracking-[0.3em] text-[#a09a8c] transition-colors hover:text-[#a4622e] sm:right-12"
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
        <line x1="0" y1="160" x2="560" y2="160" stroke="#1c1a1714" />
        <path d={path} fill="none" stroke="#6b6459" strokeWidth="1" />
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
            <line x1={(cursor / 63) * 560} y1="0" x2={(cursor / 63) * 560} y2="160" stroke="#a4622e" strokeWidth="0.5" />
            <circle cx={(cursor / 63) * 560} cy={160 - pts[cursor]} r="2.5" fill="#a4622e" />
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
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {BENCH.map(([name], i) => (
          <button
            key={name}
            onClick={(e) => {
              e.stopPropagation();
              setSel(i);
            }}
            className={`font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
              sel === i ? CY : FAINT
            } hover:text-[#6b6459]`}
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
          <span className={`font-sans text-3xl ${sel === 3 ? BONE : DIM}`}>
            R² = {BENCH[sel][1].toFixed(3)}
          </span>
        </div>
        <div className="mt-2 h-px w-full bg-[#1c1a1714]">
          <div
            className="h-px bg-[#a4622e] transition-all duration-700 ease-out"
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
    <g><rect x="200" y="24" width="160" height="10" rx="2" fill="#6b6459" opacity=".5"/><rect x="220" y="46" width="120" height="6" rx="2" fill="#a09a8c"/><rect x="235" y="70" width="90" height="16" rx="8" fill="none" stroke="#a4622e"/></g>
  )},
  { k: "household", draw: (
    <g><rect x="24" y="20" width="70" height="70" rx="4" fill="none" stroke="#6b6459"/><rect x="104" y="20" width="70" height="70" rx="4" fill="none" stroke="#6b6459"/><rect x="184" y="20" width="70" height="70" rx="4" fill="none" stroke="#a4622e"/><rect x="264" y="20" width="70" height="70" rx="4" fill="none" stroke="#6b6459"/><circle cx="219" cy="42" r="8" fill="#a4622e" opacity=".6"/></g>
  )},
  { k: "schedule", draw: (
    <g>{[0,1,2,3,4].map(i=>(<line key={i} x1={40+i*64} y1="18" x2={40+i*64} y2="92" stroke="#1c1a1714"/>))}<rect x="46" y="30" width="52" height="14" rx="2" fill="#a4622e" opacity=".35"/><rect x="110" y="52" width="116" height="14" rx="2" fill="#d98a4a" opacity=".4"/><rect x="238" y="26" width="52" height="14" rx="2" fill="#6b6459" opacity=".3"/></g>
  )},
  { k: "tasks", draw: (
    <g>{[0,1,2].map(i=>(<g key={i}><rect x="30" y={24+i*24} width="12" height="12" rx="2" fill="none" stroke={i===0?"#a4622e":"#a09a8c"}/><rect x="54" y={27+i*24} width={180-i*40} height="6" rx="2" fill="#a09a8c"/></g>))}<path d="M33 30 l3 3 5 -6" stroke="#a4622e" fill="none"/></g>
  )},
  { k: "shared care", draw: (
    <g><circle cx="150" cy="55" r="26" fill="none" stroke="#6b6459"/><circle cx="210" cy="55" r="26" fill="none" stroke="#a4622e"/><path d="M150 55 h60" stroke="#d98a4a" strokeDasharray="3 3"/></g>
  )},
];
function ArtifactStoryboard() {
  const [f, setF] = useState(0);
  return (
    <div>
      <svg viewBox="0 0 380 110" className="w-full rounded-sm border border-[#1c1a1714] bg-[#faf7f1]">
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
              } hover:text-[#6b6459]`}
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

function ArtifactSlides() {
  return (
    <div className="rounded-sm border border-[#1c1a1714] bg-[#faf7f1] p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className={`font-mono text-[10px] uppercase tracking-[0.3em] ${DIM}`}>
          presentation deck
        </span>
        <span className={`font-mono text-[10px] uppercase tracking-[0.25em] ${FAINT}`}>
          5 slides
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {FRAMES.map((fr, i) => (
          <div key={fr.k} className="rounded-sm border border-[#1c1a1714] bg-white p-2">
            <svg viewBox="0 0 380 110" className="w-full rounded-sm border border-[#1c1a1714] bg-[#faf7f1]">
              {fr.draw}
            </svg>
            <span className={`mt-2 block font-mono text-[9px] uppercase tracking-[0.18em] ${FAINT}`}>
              {String(i + 1).padStart(2, "0")} · {fr.k}
            </span>
          </div>
        ))}
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
          <div className="h-px bg-[#1c1a1714]">
            <div className="h-px bg-[#a4622e] transition-all duration-300" style={{ width: `${100 - w}%` }} />
          </div>
          <p className={`mt-1.5 font-mono text-[10px] ${DIM}`}>policy: yield-curve control era</p>
        </div>
        <div className="text-right">
          <div className="h-px bg-[#1c1a1714]">
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
        <path d="M104 42 H266" stroke="#1c1a1722" />
        <path d="M92 60 L166 106" stroke="#1c1a1722" />
        <path d="M288 60 L212 106" stroke="#1c1a1722" />
        {STATES.map((st, i) => (
          <g key={st.k}>
            <circle
              cx={st.x} cy={st.y} r="26"
              fill={s === i ? "rgba(55,214,245,0.08)" : "none"}
              stroke={s === i ? "#a4622e" : "#a09a8c"}
              strokeWidth={s === i ? 1.5 : 1}
            />
            <text x={st.x} y={st.y + 3} textAnchor="middle" fontSize="9" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" fill={s === i ? "#1c1a17" : "#6b6459"} style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {st.k}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={step}
          className={`font-mono text-[11px] uppercase tracking-[0.25em] ${CY} underline decoration-[#a4622e]/40 underline-offset-4 hover:decoration-[#a4622e]`}
        >
          advance the chain ▸
        </button>
        <span className="flex gap-1.5">
          {hist.map((h, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: ["#a4622e", "#d98a4a", "#6b6459"][h],
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
            fill="#f2efe8"
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

/* ---------- a clean-cut horizontal filmstrip of cards ---------- */
/* Ornate frames — white-background JPGs. `mix-blend-multiply` on a white page
   drops the white surround + window, leaving only the coloured frame; the
   artwork shows through the transparent-looking centre. `inset` is the % from
   each edge to the frame's window (tuned per image's border thickness). */
/* Images are normalized to identical 800x1000 canvases with the frame filling
   edge-to-edge; each inset is that frame's measured window (top right bottom left). */
const ART_FRAMES = [
  { src: "/frames/frame-1.jpg", inset: "21.3% 26.3% 21% 25.9%" }, // green baroque
  { src: "/frames/frame-2.jpg", inset: "13.2% 17.4% 13.4% 17.4%" }, // periwinkle
  { src: "/frames/frame-3.jpg", inset: "16.6% 20% 16.1% 19.8%" }, // sky blue
  { src: "/frames/frame-4.jpg", inset: "20% 21.6% 19.7% 20.4%" }, // antique white
  { src: "/frames/frame-5.jpg", inset: "12% 17% 12.4% 16.8%" }, // navy + gold
];

/* Puts `children` inside an ornate frame image; the artwork sits in the
   frame's window. */
function FramedThumb({ frame, children }) {
  const [framed, setFramed] = useState(Boolean(frame));
  return (
    <div className="relative h-full w-full">
      {/* the canvas sits inside the frame's window, with a small white mat so
          the ornate frame clearly surrounds — and is larger than — the artwork */}
      <div
        className="absolute overflow-hidden"
        style={{ inset: framed ? frame.inset : "6%" }}
      >
        <div
          className={`flex h-full w-full items-center justify-center overflow-hidden bg-white ${
            framed ? "p-[6%]" : "ring-1 ring-[#00000014]"
          }`}
        >
          {children}
        </div>
      </div>
      {/* the frame on top — white multiplies away, leaving the ornament */}
      {framed && (
        <img
          src={frame.src}
          alt=""
          aria-hidden="true"
          onError={() => setFramed(false)}
          className="pointer-events-none absolute inset-0 h-full w-full object-fill mix-blend-multiply"
        />
      )}
    </div>
  );
}

function Filmstrip({ id, corner, caption, items }) {
  const [open, setOpen] = useState(null);
  return (
    <section id={id} className="relative min-h-screen bg-white py-16">
      {/* section heading */}
      <div className="flex items-baseline justify-between px-8 sm:px-14">
        <h2 className="font-sans text-4xl font-semibold tracking-tight text-[#171411] sm:text-5xl">
          {corner}
        </h2>
        <span className="font-sans text-[11px] font-normal uppercase tracking-[0.25em] text-[#b9b2a4]">
          {String(items.length).padStart(2, "0")} works
        </span>
      </div>

      {/* the strip, centred in the white */}
      <div className="flex min-h-[62vh] items-center">
        <div className="no-scrollbar flex w-full items-stretch gap-5 overflow-x-auto px-8 py-6 sm:px-14">
          {items.map((it, i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => setOpen(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen(i);
                }
              }}
              className="group relative w-[86vw] shrink-0 cursor-pointer text-left sm:w-[58vw] lg:w-[40vw]"
            >
              <div className="relative aspect-[4/5] transition-transform duration-300 group-hover:-translate-y-1.5">
                {it.thumb}
              </div>
              <p className="mt-4 font-sans text-[11px] font-medium uppercase leading-snug tracking-[0.12em] text-[#171411]">
                <span className="text-[#b9b2a4]">{String(i + 1).padStart(2, "0")} — </span>
                {it.title}
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[#a09a8c]">
                {it.meta}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* footer caption, like the reference */}
      <p className="px-8 font-mono text-[10px] uppercase leading-relaxed tracking-[0.2em] text-[#8a8578] sm:px-14">
        {caption}
      </p>

      {/* expanded view */}
      {open !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-white/90 p-4 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto border border-[#00000012] bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.14)] sm:p-9"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#a09a8c]">
                {corner} · {String(open + 1).padStart(2, "0")}
              </span>
              <button
                onClick={() => setOpen(null)}
                className="font-mono text-sm text-[#5d5749] hover:text-[#171411]"
              >
                ✕
              </button>
            </div>
            {items[open].detail}
          </div>
        </div>
      )}
    </section>
  );
}

export function ProjectNeurons() {
  const items = PROJECTS.map((p, i) => {
    const art = ARTIFACTS.find((a) => a.match.test(p.title));
    return {
      title: p.title,
      meta: p.status ? "In progress" : p.tech.slice(0, 2).join(" · "),
      thumb: (
        <FramedThumb frame={ART_FRAMES[i % ART_FRAMES.length]}>
          {/* a filled mini-poster: title, the live artifact, and tech tags */}
          <div className="flex h-full w-full flex-col bg-gradient-to-br from-[#f8f6f1] to-[#ece7dd] p-4 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#a09a8c]">
              {p.status ? "in progress" : art?.label ?? "project"}
            </p>
            <p className="mt-1 line-clamp-2 font-display text-xl font-medium leading-tight text-[#171411] sm:text-2xl">
              {p.title}
            </p>
            <div className="my-2.5 flex flex-1 items-center justify-center overflow-hidden rounded-[3px] bg-white/70 p-1.5 ring-1 ring-black/[0.06]">
              <div className="flex h-full w-full scale-[0.9] items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full">
                {art?.el}
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {p.tech.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-black/[0.04] px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-[#5d5749]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </FramedThumb>
      ),
      detail: (
        <div>
          <h3 className="font-display text-2xl font-medium text-[#171411]">{p.title}</h3>
          <p className="mt-2 text-[15px] leading-[1.7] text-[#48423a]">{p.description}</p>
          <div className="mt-6 overflow-hidden rounded-md border border-[#1c1a1714] bg-[#faf8f2]">
            <ProjectMedia p={p} />
            {!/famflow/i.test(p.title) && <div className="p-5">{art?.el}</div>}
          </div>
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <Links links={p.links} />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#a09a8c]">
              {p.tech.join(" · ")}
            </span>
          </div>
        </div>
      ),
    };
  });
  return (
    <Filmstrip
      id="projects"
      corner="Projects"
      caption="Selected projects — click any piece to open it. Data, machine learning, and product work, 2023–2026."
      items={items}
    />
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
          <Kicker>the toolkit</Kicker>
          <h2 className={`mt-4 font-sans text-3xl font-medium leading-tight ${BONE}`}>
            Tools & Skills
          </h2>
        </div>
      </header>

      <div>
        {TOOLKIT.map((cat, ci) => (
          <div key={cat.group} className={`${RULE} grid gap-3 py-6 md:grid-cols-12`}>
            <div className="md:col-span-4">
              <span className={`font-mono text-[10px] uppercase tracking-[0.35em] ${DIM}`}>
                {String(ci + 1).padStart(2, "0")} · {cat.group}
              </span>
            </div>
            <ul className="md:col-span-7 flex flex-wrap gap-2">
              {cat.items.map((tool) => (
                <li key={tool}>
                  <span className="inline-flex rounded-full border border-black/15 bg-white px-2.5 py-1 font-sans text-[13px] leading-none text-black transition-colors hover:border-black/40">
                    {tool}
                  </span>
                </li>
              ))}
            </ul>
            <span className={`hidden font-mono text-[10px] md:col-span-1 md:block md:text-right ${FAINT}`}>
              {cat.items.length}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =====================================================================
   EXPERIENCE — wall labels beside invisible artifacts
===================================================================== */
/* A photograph from the room itself — hides quietly if the file isn't there yet. */
function JobPhoto({ src, alt }) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) return null;
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setOk(false)}
      loading="lazy"
      className="mb-4 h-44 w-full rounded-sm object-cover"
    />
  );
}

function JobThumbnail({ src, alt, company, period }) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-white p-3 text-center">
        <span className="font-sans text-[13px] font-medium leading-tight text-[#171411]">{company}</span>
        <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.2em] text-[#a09a8c]">{period}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setOk(false)}
      loading="lazy"
      className="h-full w-full object-cover"
    />
  );
}

export function MuseumExhibit() {
  const chronological = [...EXPERIENCE]; // newest → oldest (newest at top)
  // newest role open by default; click a node/row to expand another
  const [active, setActive] = useState(0);
  return (
    <section id="experience" className="relative min-h-screen bg-white py-16">
      {/* section heading */}
      <div className="flex items-baseline justify-between px-8 sm:px-14">
        <h2 className="font-sans text-4xl font-semibold tracking-tight text-[#171411] sm:text-5xl">
          Experience
        </h2>
        <span className="font-sans text-[11px] font-normal uppercase tracking-[0.25em] text-[#b9b2a4]">
          {String(chronological.length).padStart(2, "0")} roles · tap to expand
        </span>
      </div>

      <div className="mx-auto mt-16 max-w-3xl px-8 sm:px-14">
        <ol className="relative border-l border-black/15">
          {chronological.map((e, i) => {
            const open = active === i;
            return (
              <li key={`${e.company}-${e.role}`} className="relative pb-8 pl-6 last:pb-0">
                {/* node on the line — fills when active */}
                <span
                  className={`absolute -left-[6.5px] top-1.5 h-3 w-3 rounded-full border-2 border-black transition-colors duration-300 ${
                    open ? "bg-black" : "bg-white"
                  }`}
                />
                <span className="absolute -left-[28px] top-1 hidden font-mono text-[9px] tabular-nums text-black/40 sm:block">
                  {String(chronological.length - i).padStart(2, "0")}
                </span>
                {/* number: newest = highest, oldest = 01 */}

                {/* the always-visible header row toggles this entry */}
                <button
                  type="button"
                  onClick={() => setActive(open ? -1 : i)}
                  className="group block w-full text-left"
                  aria-expanded={open}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-black/50">
                    {e.period}
                  </p>
                  <h3
                    className={`mt-1.5 flex items-center gap-2 font-sans text-xl font-medium transition-colors ${
                      open ? "text-black" : "text-black/55 group-hover:text-black"
                    }`}
                  >
                    <span>
                      {e.role}
                      <span className="text-black/40"> · {e.company}</span>
                    </span>
                    <span
                      className={`ml-auto font-mono text-sm text-black/40 transition-transform duration-300 ${
                        open ? "rotate-45" : "rotate-0 group-hover:text-black"
                      }`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </h3>
                </button>

                {/* the expanding detail */}
                <div
                  className="grid transition-all duration-500 ease-out"
                  style={{
                    gridTemplateRows: open ? "1fr" : "0fr",
                    opacity: open ? 1 : 0,
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="pt-4">
                      {e.img && <JobPhoto src={e.img} alt={e.company} />}
                      <ul className="space-y-2.5">
                        {e.bullets.map((b, j) => (
                          <li key={j} className="flex gap-3 text-[14.5px] leading-[1.7] text-black/70">
                            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-black/40" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="mt-10 px-8 font-mono text-[10px] uppercase leading-relaxed tracking-[0.2em] text-[#8a8578] sm:px-14">
        Capital Power · Greenhouse Juice · Pratt &amp; Whitney · Creospark — 2023 to 2026.
      </p>
    </section>
  );
}

/* =====================================================================
   ABOUT — a short bio, an interactive music player, and the things
   that fill the hours outside the desk.
===================================================================== */

/* Optional real images — drop these files in and they replace the CSS discs:
   public/music/turntable.png  → the record player shown at the top
   public/music/vinyl.png      → the record peeking behind each album cover */
const TURNTABLE_IMG = "/music/turntable.png";
const VINYL_IMG = "/music/vinyl.png";

/* Top piece: the wooden player photo (static housing) with a real record
   spinning on its platter. Falls back to a plain spinning CSS disc if the
   images are missing. The overlay position is tuned to the photo's platter. */
const PLATTER = { x: "50.5%", y: "47.5%", size: "61%" }; // measured from the photo's label centroid
function TopTurntable() {
  const [ok, setOk] = useState(true);
  if (!ok) return <Vinyl spin />;
  return (
    <div className="relative h-full w-full">
      <img
        src={TURNTABLE_IMG}
        alt=""
        aria-hidden="true"
        onError={() => setOk(false)}
        className="h-full w-full object-contain"
      />
      {/* the record, spinning on the platter */}
      <div
        className="absolute"
        style={{
          left: PLATTER.x,
          top: PLATTER.y,
          width: PLATTER.size,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="vinyl-spin aspect-square">
          <img src={VINYL_IMG} alt="" aria-hidden="true" className="h-full w-full object-contain" />
        </div>
      </div>
    </div>
  );
}

/* The disc behind an album cover: the vinyl photo if present, else CSS disc. */
function AlbumDisc({ spin }) {
  const [ok, setOk] = useState(true);
  if (ok)
    return (
      <img
        src={VINYL_IMG}
        alt=""
        aria-hidden="true"
        onError={() => setOk(false)}
        className={`h-full w-full object-contain ${spin ? "vinyl-spin" : ""}`}
      />
    );
  return <Vinyl spin={spin} />;
}

/* A vinyl record: grooved black disc, a sheen sweep, an album-art centre
   label, and a spindle hole. Fills its parent; spins when `spin`. */
function Vinyl({ art, spin = false }) {
  return (
    <div className={`absolute inset-0 rounded-full ${spin ? "vinyl-spin" : ""}`}>
      {/* grooves */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "repeating-radial-gradient(circle at 50% 50%, #050505 0px, #050505 1.4px, #1b1b1b 2.8px, #131313 4.2px)",
          boxShadow:
            "inset 0 0 26px rgba(0,0,0,0.9), 0 12px 26px rgba(0,0,0,0.6)",
        }}
      />
      {/* light sheen */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 210deg, rgba(255,255,255,0.10), transparent 22%, rgba(255,255,255,0.12) 50%, transparent 74%, rgba(255,255,255,0.10))",
        }}
      />
      {/* centre label = album art */}
      <div
        className="absolute overflow-hidden rounded-full ring-1 ring-black/40"
        style={{
          inset: "33%",
          backgroundImage: art ? `url(${art})` : "none",
          backgroundColor: art ? "transparent" : "#1a1a1a",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* spindle hole */}
      <div
        className="absolute rounded-full bg-[#0b0b0d] ring-1 ring-white/15"
        style={{ inset: "47.5%" }}
      />
    </div>
  );
}

/* A scrollable 3D stack of real album covers (art + previews baked from the
   Spotify playlist). Each cover is a slab with visible thickness; hover lifts
   and squares it up, click plays the 30-second preview. */
function AlbumStack({ songs }) {
  const [active, setActive] = useState(null);
  const [playing, setPlaying] = useState(null);
  const audioRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnd = () => setPlaying(null);
    a.addEventListener("ended", onEnd);
    return () => a.removeEventListener("ended", onEnd);
  }, []);

  // Which card is under a given pointer Y? The front-most (highest index) whose
  // box contains Y wins — this is what the eye reads as "the card here", and it
  // works regardless of the 3D transforms that break normal hover hit-testing.
  const cardAt = (clientY) => {
    let hit = null;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) hit = i;
    });
    return hit;
  };

  const play = (i) => {
    const a = audioRef.current;
    const t = songs[i];
    if (i == null) return;
    if (playing === i) {
      a?.pause();
      setPlaying(null);
      return;
    }
    if (a && t?.preview) {
      a.src = t.preview;
      a.play().catch(() => {});
      setPlaying(i);
    }
  };

  const cleanTitle = (s) => s.replace(/\s*-\s*.*$/i, "");

  return (
    <div>
      <div
        className="album-scroll h-[440px] overflow-y-auto overflow-x-hidden px-2 py-5"
        style={{ perspective: "900px", perspectiveOrigin: "50% 40%" }}
        onMouseMove={(e) => setActive(cardAt(e.clientY))}
        onMouseLeave={() => setActive(null)}
        onClick={(e) => play(cardAt(e.clientY))}
      >
        <div
          className="flex flex-col items-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          {songs.map((t, i) => {
            const isActive = active === i;
            const isPlaying = playing === i;
            return (
              <div
                key={t.title + i}
                ref={(el) => (cardRefs.current[i] = el)}
                className="group relative w-full max-w-[320px] shrink-0 cursor-pointer"
                style={{
                  transformStyle: "preserve-3d",
                  transform: isActive
                    ? "rotateX(6deg) translateZ(60px) scale(1.05)"
                    : "rotateX(48deg)",
                  transformOrigin: "center bottom",
                  transition: "transform 480ms cubic-bezier(0.22,1,0.36,1)",
                  // fixed overlap — never reflows on hover, so hit-mapping stays stable
                  marginBottom: "-215px",
                  zIndex: isActive ? 50 : i + 1,
                }}
              >
                {/* the slab: a square cover with a thick side edge for depth */}
                <div className="relative aspect-square w-full" style={{ transformStyle: "preserve-3d" }}>
                  {/* the CD, peeking from the right of the sleeve — slides out
                      and spins when the card is active */}
                  <div
                    className="absolute aspect-square"
                    style={{
                      top: "7%",
                      height: "86%",
                      right: isActive ? "-30%" : "-15%",
                      transition: "right 500ms cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    <AlbumDisc spin={isActive} />
                  </div>
                  {/* thickness — an extruded edge sitting just behind the face */}
                  <div
                    className="absolute inset-0 rounded-[5px] bg-black/70"
                    style={{ transform: "translateZ(-14px)" }}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-[14px] rounded-b-[5px] bg-black/80"
                    style={{ transform: "rotateX(-90deg)", transformOrigin: "bottom" }}
                  />
                  {/* the cover face */}
                  <div
                    className="absolute inset-0 overflow-hidden rounded-[5px] ring-1 ring-white/10"
                    style={{
                      backgroundImage: t.art ? `url(${t.art})` : "none",
                      backgroundColor: t.art ? "transparent" : "#1c1c22",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      boxShadow: isActive
                        ? "0 40px 70px rgba(0,0,0,0.65)"
                        : "0 24px 40px rgba(0,0,0,0.6)",
                      filter: isActive ? "brightness(1.05)" : "brightness(0.8)",
                      transition: "filter 400ms ease, box-shadow 400ms ease",
                    }}
                  >
                    {/* sheen sweep on hover */}
                    <span
                      className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                      style={{
                        opacity: isActive ? 1 : 0,
                        background:
                          "linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.22) 50%, transparent 68%)",
                      }}
                    />
                    {/* title bar — at the TOP, the part that peeks above the next card */}
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/85 to-transparent px-3 pb-8 pt-2.5">
                      <span className="min-w-0">
                        <span className="block truncate font-sans text-[13px] font-semibold leading-tight text-white">
                          {cleanTitle(t.title)}
                        </span>
                        <span className="block truncate font-sans text-[11px] text-white/70">
                          {t.artist.split(",")[0]}
                        </span>
                      </span>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-[11px] text-black shadow">
                        {isPlaying ? "❚❚" : t.preview ? "▶" : "♪"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <audio ref={audioRef} preload="none" />
      <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-black/35">
        scroll the stack · hover to lift · click to play
      </p>
    </div>
  );
}

/* ===== "Welcome to my brain" — a flow-field brain hero =====
   Ported from a v0-generated prototype. A glowing brain image is used as a
   luminance mask: hundreds of particles drift through a simplex-noise flow
   field, staying inside the brain's silhouette and tracing its brightness,
   colour cycling cyan (top) -> violet (base). The cursor locally swirls the
   field; four anatomical hotspots (frontal lobe/crown/occipital/cerebellum)
   pull particles toward them and open that category's photos below. */

const BRAIN_IMAGE = "/brain-base.png";

// hotspot centre + radius in NORMALIZED image space (0..1), tuned to
// brain-base.png's anatomy; hue is the iridescent colour that region leans
// toward. Real photos are pulled live from INTERESTS by category.
const BRAIN_CATEGORIES = [
  { id: "Travel", nx: 0.22, ny: 0.5, nr: 0.13, hue: 200 }, // frontal lobe (left)
  { id: "Food", nx: 0.5, ny: 0.3, nr: 0.13, hue: 300 }, // crown (top)
  { id: "TV", nx: 0.78, ny: 0.48, nr: 0.13, hue: 190 }, // occipital (back/right)
  { id: "Hobbies", nx: 0.6, ny: 0.72, nr: 0.12, hue: 265 }, // cerebellum / stem
];

// fit a square image into a w x h box (object-contain), with helpers mapping
// normalized image coords (0..1) to CSS pixel coords inside the container
function fitContain(w, h) {
  const containerAspect = w / h;
  let drawW, drawH;
  if (containerAspect > 1) {
    drawH = h;
    drawW = h;
  } else {
    drawW = w;
    drawH = w;
  }
  const offsetX = (w - drawW) / 2;
  const offsetY = (h - drawH) / 2;
  return {
    drawW,
    drawH,
    offsetX,
    offsetY,
    toX: (nx) => offsetX + nx * drawW,
    toY: (ny) => offsetY + ny * drawH,
    toR: (nr) => nr * drawW,
  };
}

/* the flow-field canvas: particles constrained to a luminance mask built
   from BRAIN_IMAGE, drifting through simplex noise, swirling around the
   cursor, and pulled toward `activeId`'s hotspot */
function BrainFlowField({ activeId, imgRef }) {
  const canvasRef = useRef(null);
  const activeRef = useRef(activeId);
  activeRef.current = activeId;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const noise3D = createNoise3D();
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0, wd = 0, hd = 0;
    let fit = fitContain(1, 1);
    let particles = [];
    let ready = false;
    let mask = null;

    // Reuse the already-rendered visible <img> as the mask source. Loading a
    // separate new Image() for the same URL proved unreliable (it silently
    // never fired start(), leaving the canvas blank); the on-page img is
    // same-origin and readable, so build the luminance mask from it directly.
    const img = imgRef?.current;
    if (!img) return;
    const mouse = { x: -9999, y: -9999, active: false };

    const inBrain = (x, y) => {
      if (!mask) return false;
      const dx = Math.floor(x * dpr);
      const dy = Math.floor(y * dpr);
      if (dx < 0 || dy < 0 || dx >= wd || dy >= hd) return false;
      return mask[dy * wd + dx] > 26;
    };
    const brightAt = (x, y) => {
      if (!mask) return 0;
      const dx = Math.floor(x * dpr);
      const dy = Math.floor(y * dpr);
      if (dx < 0 || dy < 0 || dx >= wd || dy >= hd) return 0;
      return mask[dy * wd + dx] / 255;
    };

    const buildMask = () => {
      if (!img.complete || img.naturalWidth === 0) return;
      const m = document.createElement("canvas");
      m.width = wd;
      m.height = hd;
      const mctx = m.getContext("2d", { willReadFrequently: true });
      if (!mctx) return;
      mctx.clearRect(0, 0, wd, hd);
      mctx.drawImage(img, fit.offsetX * dpr, fit.offsetY * dpr, fit.drawW * dpr, fit.drawH * dpr);
      const data = mctx.getImageData(0, 0, wd, hd).data;
      const lum = new Uint8ClampedArray(wd * hd);
      for (let i = 0; i < wd * hd; i++) {
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        lum[i] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
      }
      mask = lum;
    };

    const spawn = (p) => {
      for (let i = 0; i < 60; i++) {
        const x = fit.offsetX + Math.random() * fit.drawW;
        const y = fit.offsetY + Math.random() * fit.drawH;
        if (inBrain(x, y)) {
          p.x = x; p.y = y; p.px = x; p.py = y;
          p.life = 0; p.maxLife = 50 + Math.random() * 150; p.seed = Math.random() * 1000;
          return;
        }
      }
      p.x = fit.toX(0.5); p.y = fit.toY(0.45); p.px = p.x; p.py = p.y;
      p.life = 0; p.maxLife = 100; p.seed = Math.random() * 1000;
    };

    const PARTICLE_TARGET = 2100;
    const makeParticles = () => {
      const count = Math.round(PARTICLE_TARGET * Math.min(1.5, Math.max(0.5, (w * h) / (900 * 600))));
      particles = new Array(count).fill(0).map(() => {
        const p = { x: 0, y: 0, px: 0, py: 0, life: 0, maxLife: 0, seed: 0 };
        spawn(p);
        p.life = Math.random() * p.maxLife;
        return p;
      });
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      wd = Math.floor(w * dpr);
      hd = Math.floor(h * dpr);
      canvas.width = wd;
      canvas.height = hd;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      fit = fitContain(w, h);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      buildMask();
      if (ready) makeParticles();
    };

    const hotspot = (id) => {
      const c = BRAIN_CATEGORIES.find((cat) => cat.id === id);
      return { x: fit.toX(c.nx), y: fit.toY(c.ny), r: fit.toR(c.nr) };
    };

    const noiseScale = 0.006;
    let time = 0;

    const step = () => {
      if (!ready) return;
      const active = activeRef.current;

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      const act = active ? hotspot(active) : null;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.px = p.x; p.py = p.y;

        const n = noise3D(p.x * noiseScale, p.y * noiseScale, time);
        let angle = n * Math.PI * 3;
        angle += Math.sin(time * 0.6 + p.seed) * 0.15;
        const speed = 1.0;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;

        if (mouse.active) {
          const mdx = p.x - mouse.x, mdy = p.y - mouse.y;
          const md = Math.hypot(mdx, mdy);
          const R = 130;
          if (md < R && md > 0.001) {
            const f = (1 - md / R) ** 2;
            vx += (-mdy / md) * f * 3.4;
            vy += (mdx / md) * f * 3.4;
            vx += (mdx / md) * f * 1.2;
            vy += (mdy / md) * f * 1.2;
          }
        }

        let boost = 0;
        if (act) {
          const adx = act.x - p.x, ady = act.y - p.y;
          const ad = Math.hypot(adx, ady);
          if (ad < act.r * 2.6 && ad > 0.001) {
            const f = 1 - ad / (act.r * 2.6);
            vx += (adx / ad) * f * 0.8;
            vy += (ady / ad) * f * 0.8;
            boost = f;
          }
        }

        p.x += vx; p.y += vy; p.life++;

        if (p.life > p.maxLife || !inBrain(p.x, p.y)) {
          spawn(p);
          continue;
        }

        const b = brightAt(p.x, p.y);
        const ny = (p.y - fit.offsetY) / Math.max(1, fit.drawH);
        let hue = 190 + Math.min(1, Math.max(0, ny)) * 120;
        hue += Math.sin(angle * 2 + p.seed * 0.5) * 26;
        const sat = 92 - boost * 16;
        // vivid + saturated so the streaks read clearly over the bright brain
        const light = 46 + boost * 20;
        const alpha = 0.34 + b * 0.4 + boost * 0.45;

        ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${Math.min(1, alpha)})`;
        ctx.lineWidth = 1.5 + boost * 1.8;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        if ((i & 3) === 0 && (Math.sin(time * 8 + p.seed) > 0.6 || boost > 0.2)) {
          ctx.fillStyle = `hsla(${hue}, ${sat}%, ${58 + boost * 16}%, ${0.5 + boost * 0.4})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.1 + boost * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      time += 0.0028;
    };

    let raf = 0;
    const loop = () => { step(); raf = requestAnimationFrame(loop); };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onLeave = () => { mouse.active = false; mouse.x = -9999; mouse.y = -9999; };

    const start = () => {
      resize();
      ready = true;
      makeParticles();
      if (reduceMotion) {
        for (let i = 0; i < 600; i++) step();
      } else {
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerleave", onLeave);
        raf = requestAnimationFrame(loop);
      }
    };

    // the visible <img> already carries its src from JSX — just wait for it
    let onImgLoad = null;
    if (img.complete && img.naturalWidth > 0) start();
    else {
      onImgLoad = () => start();
      img.addEventListener("load", onImgLoad);
    }

    const ro = new ResizeObserver(() => {
      if (!ready) return;
      resize();
      if (reduceMotion) for (let i = 0; i < 600; i++) step();
    });
    ro.observe(parent);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (onImgLoad) img.removeEventListener("load", onImgLoad);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
  );
}

/* group INTERESTS by category, keyed to BRAIN_CATEGORIES order */
function groupInterestsByCategory(items) {
  const byCat = {};
  items.forEach((it) => {
    (byCat[it.category] ??= []).push(it);
  });
  return byCat;
}

/* "Welcome to my brain" — the flow-field hero + hotspot buttons + a small
   circular arc of photos that fans out from whichever region is selected. */
function NeuralMap({ items }) {
  const byCategory = useMemo(() => groupInterestsByCategory(items), [items]);
  const stageRef = useRef(null);
  const brainImgRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const active = hovered ?? selected;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = fitContain(size.w || 1, size.h || 1);
  const selectedMeta = BRAIN_CATEGORIES.find((c) => c.id === selected) ?? null;
  const selectedPhotos = selectedMeta ? byCategory[selectedMeta.id] : null;

  // circular photos fan outward from whichever hotspot is selected, away
  // from the brain's centre, instead of sitting in a boxed grid below
  const arcPositions = useMemo(() => {
    if (!selectedMeta || !selectedPhotos || !size.w) return [];
    const cx = fit.toX(selectedMeta.nx);
    const cy = fit.toY(selectedMeta.ny);
    const centerX = fit.toX(0.5);
    const centerY = fit.toY(0.45);
    const baseAngle = Math.atan2(cy - centerY, cx - centerX);
    const count = selectedPhotos.length;
    const spread = count > 1 ? 0.55 : 0;
    const photoR = fit.toR(0.09);
    const dist = fit.toR(selectedMeta.nr) + photoR + 22;
    return Array.from({ length: count }, (_, i) => {
      const a = baseAngle + (i - (count - 1) / 2) * spread;
      return { x: cx + Math.cos(a) * dist, y: cy + Math.sin(a) * dist, size: photoR * 2 };
    });
  }, [selectedMeta, selectedPhotos, size.w, fit]);

  return (
    <div className="w-full">
      {/* elegant serif title in Yale Blue, sitting above the brain */}
      <div className="mb-1 text-center">
        <h2 className="font-serifDisplay text-2xl font-semibold uppercase leading-none tracking-[0.14em] text-[#0D3B66] sm:text-4xl sm:tracking-[0.18em]">
          Welcome to
          <br />
          <span className="text-[2.4em] leading-[1.05] tracking-[0.06em]">my brain</span>
        </h2>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.4em] text-[#0D3B66]/45">
          #0D3B66
        </p>
      </div>

      <div ref={stageRef} className="relative -mt-2 aspect-square w-full overflow-visible">
        <img
          ref={brainImgRef}
          src={BRAIN_IMAGE}
          alt="A glowing neural simulation of a human brain"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />

        <BrainFlowField activeId={active} imgRef={brainImgRef} />

        {size.w > 0 &&
          BRAIN_CATEGORIES.filter((c) => byCategory[c.id]?.length).map((c) => {
            const cx = fit.toX(c.nx);
            const cy = fit.toY(c.ny);
            const d = fit.toR(c.nr) * 2;
            const isActive = active === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-label={c.id}
                aria-pressed={selected === c.id}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(c.id)}
                onBlur={() => setHovered(null)}
                onClick={() => setSelected((prev) => (prev === c.id ? null : c.id))}
                className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none"
                style={{ left: cx, top: cy, width: d, height: d, zIndex: isActive ? 30 : 10 }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border transition duration-500"
                  style={{
                    borderColor: isActive ? `hsl(${c.hue} 80% 45% / 0.6)` : "transparent",
                    boxShadow: isActive ? `0 0 34px hsl(${c.hue} 85% 55% / 0.3)` : "none",
                  }}
                />
                <span
                  className="pointer-events-none absolute left-1/2 top-full flex -translate-x-1/2 translate-y-2 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold tracking-wide backdrop-blur-sm transition-all duration-300"
                  style={{
                    color: isActive ? `hsl(${c.hue} 65% 32%)` : "rgba(23,20,17,0.75)",
                    backgroundColor: isActive ? `hsl(${c.hue} 85% 94% / 0.95)` : "rgba(255,255,255,0.85)",
                    border: `1px solid ${isActive ? `hsl(${c.hue} 70% 55% / 0.5)` : "rgba(23,20,17,0.14)"}`,
                    boxShadow: isActive ? `0 4px 16px hsl(${c.hue} 70% 45% / 0.25)` : "0 2px 8px rgba(0,0,0,0.06)",
                    transform: isActive ? "translate(-50%, 0.75rem) scale(1.06)" : "translate(-50%, 0.5rem) scale(1)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: `hsl(${c.hue} 75% 50%)`, boxShadow: `0 0 6px hsl(${c.hue} 75% 45% / 0.7)` }}
                  />
                  {c.id}
                </span>
              </button>
            );
          })}

        {selectedMeta &&
          selectedPhotos.map((it, i) => (
            <BrainArcPhoto key={it.title} item={it} pos={arcPositions[i]} hue={selectedMeta.hue} />
          ))}

      </div>

      <div className="mt-8 flex min-h-[2rem] items-center justify-center gap-3 text-center">
        {selectedMeta ? (
          <>
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: `hsl(${selectedMeta.hue} 75% 50%)` }}
            />
            <p className="text-sm font-medium text-black/70">{selectedMeta.id}</p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-black/40 transition-colors hover:text-black"
            >
              close ✕
            </button>
          </>
        ) : (
          <p className="text-sm text-black/30">Select a region above to open its collection.</p>
        )}
      </div>
    </div>
  );
}

function BrainArcPhoto({ item, pos, hue }) {
  const [ok, setOk] = useState(true);
  if (!pos) return null;
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full ring-2 ring-white transition-all duration-500"
      style={{
        left: pos.x,
        top: pos.y,
        width: pos.size,
        height: pos.size,
        boxShadow: `0 10px 28px hsl(${hue} 55% 30% / 0.35)`,
        zIndex: 25,
      }}
    >
      {ok ? (
        <img
          src={item.img}
          alt={item.title}
          loading="lazy"
          onError={() => setOk(false)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-black/10 to-black/25" />
      )}
    </div>
  );
}

export function AboutMe() {
  return (
    <section id="about" className="relative min-h-screen bg-white py-5">
      {/* corner labels */}
      <div className="flex items-start justify-between px-8 sm:px-14">
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-[#171411]">
          About Me
        </span>
        <span className="font-sans text-[11px] font-normal uppercase tracking-[0.25em] text-[#b9b2a4]">
          Off the clock
        </span>
      </div>

      <div className="mx-auto mt-4 max-w-6xl px-8 sm:px-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.45fr] lg:items-center">
          {/* interactive music — a 3D stack of favourite covers */}
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#a09a8c]">
                ♪ what's spinning in my ears
              </p>
              <a
                href={`https://open.spotify.com/playlist/${PLAYLIST.spotifyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/50 underline decoration-black/20 underline-offset-4 transition-colors hover:text-black"
              >
                full playlist ↗
              </a>
            </div>
            <AlbumStack songs={FAVE_SONGS} />
          </div>

          {/* welcome to my brain — flow-field hero with one hotspot per part of my life */}
          <div className="mx-auto w-full max-w-2xl">
            <NeuralMap items={INTERESTS} />
          </div>
        </div>
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
  { t: "  something cool - listening · builiding · reading · creating" },
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
          <Kicker>Contact Me — Terminal</Kicker>
        </header>

        <div className="md:col-span-8" ref={onEnter}>
          <div className="border-l border-[#1c1a1714] pl-6 font-mono text-[13px] leading-8 sm:pl-10">
            {TERM.slice(0, booted).map((l, i) =>
              l.href ? (
                <a
                  key={i}
                  href={l.href}
                  target={l.href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className={`block whitespace-pre ${DIM} transition-colors hover:text-[#a4622e]`}
                >
                  {l.t} <span className={FAINT}>↗</span>
                </a>
              ) : (
                <div key={i} className={`whitespace-pre ${l.c ? CY : "text-[#3a352c]"}`}>
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

      <footer className={`mt-28 ${RULE} pt-6`}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className={`font-mono text-[10px] uppercase tracking-[0.3em] ${FAINT}`}>
            © {new Date().getFullYear()} {PROFILE.name}
          </span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className={`font-mono text-[10px] uppercase tracking-[0.3em] ${DIM} transition-colors hover:text-[#a4622e]`}
          >
            surface again ↑
          </button>
        </div>
      </footer>
    </section>
  );
}

/* =====================================================================
   THE WALK — one wall label per painting, shown beside the 3D frame as
   the visitor passes it. Stations 0–5 are projects, 6–10 the rooms.
===================================================================== */
export function StationPanel({ index }) {
  const jobs = [...EXPERIENCE].reverse();
  if (index < PROJECTS.length) {
    const p = PROJECTS[index];
    const art = ARTIFACTS.find((a) => a.match.test(p.title));
    return (
      <div className="max-h-[78vh] overflow-y-auto rounded-md bg-[#f6f2e8]/95 p-5 shadow-[0_18px_50px_rgba(28,26,23,0.22)] backdrop-blur-sm">
        <div className={`flex items-baseline justify-between ${RULE} pt-2`}>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#a09a8c]">
            mem.{String(index + 1).padStart(2, "0")} · {art?.label ?? "a plain record"}
          </span>
          <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${p.status ? CU : "text-[#8a7a5f]"}`}>
            {p.status ? "◈ forming" : "consolidated"}
          </span>
        </div>
        <h3 className="mt-3 font-sans text-xl font-medium leading-snug text-[#171411]">
          {p.title}
        </h3>
        <p className="mt-2 text-[13.5px] leading-[1.65] text-[#48423a]">{p.description}</p>
        <div className="mt-4 overflow-hidden rounded-sm border border-[#1c1a1714] bg-[#faf8f2]">
          <ProjectMedia p={p} />
          <div className="p-4">{art?.el}</div>
        </div>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
          <Links links={p.links} />
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#a09a8c]">
            {p.tech.slice(0, 3).join(" · ")}
          </span>
        </div>
      </div>
    );
  }
  const i = index - PROJECTS.length;
  const e = jobs[i];
  if (!e) return null;
  return (
    <div className="max-h-[78vh] overflow-y-auto rounded-md bg-[#f6f2e8]/95 p-5 shadow-[0_18px_50px_rgba(28,26,23,0.22)] backdrop-blur-sm">
      <div className={`flex items-baseline justify-between ${RULE} pt-2`}>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#a09a8c]">
          acq.{String(i + 1).padStart(2, "0")} · {e.company}
        </span>
        <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${CU}`}>{e.period}</span>
      </div>
      <h3 className="mt-3 font-sans text-xl font-medium leading-snug text-[#171411]">
        {e.role}
        <span className="block text-base text-[#5d5749]">at {e.company}</span>
      </h3>
      <div className="mt-4">
        <JobPhoto src={e.img} alt={`${e.company} — from my time there`} />
      </div>
      <ul className="space-y-3 border-l-2 border-[#d98a4a]/40 pl-4">
        {e.bullets.map((b, j) => (
          <li key={j} className="text-[13.5px] leading-[1.65] text-[#3f3930]">
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
