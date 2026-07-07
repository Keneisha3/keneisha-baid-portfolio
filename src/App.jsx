import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Landing,
  ProjectNeurons,
  SkillTerminals,
  MuseumExhibit,
  CoreTerminal,
} from "./neural/Sections";
import { Sparks, useHum, MindNav } from "./neural/Fx";
import ChatWidget from "./components/ChatWidget";

// Three.js only loads for the full experience — lite mode never pays for it.
const NeuralCanvas = lazy(() => import("./neural/Scene"));

// Lite mode: weak/failed WebGL, reduced-motion users, small mobile devices,
// or an explicit ?lite flag. Same content, no 3D.
function detectLite() {
  try {
    if (new URLSearchParams(window.location.search).has("lite")) return true;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
    const c = document.createElement("canvas");
    if (!(c.getContext("webgl2") || c.getContext("webgl"))) return true;
    const mobile = /Mobi|Android/i.test(navigator.userAgent);
    if (mobile && (navigator.hardwareConcurrency || 8) <= 4) return true;
  } catch {
    return true;
  }
  return false;
}

function Sections() {
  return (
    <>
      <ProjectNeurons />
      <MuseumExhibit />
      <SkillTerminals />
      <CoreTerminal />
    </>
  );
}

/* Static fallback: same content, a quiet SVG "synapse" hero instead of 3D. */
function LiteExperience({ humOn, toggleHum }) {
  return (
    <div className="relative min-h-screen bg-[#f2efe8] text-[#3a352c]">
      <MindNav humOn={humOn} toggleHum={toggleHum} />
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {Array.from({ length: 14 }).map((_, i) => {
            const y = 40 + i * 42;
            return (
              <path
                key={i}
                d={`M-10 ${y} C 200 ${y - 60 + (i % 3) * 40}, 500 ${y + 70 - (i % 4) * 35}, 810 ${y}`}
                fill="none"
                stroke={i % 3 ? "#d8cdbb" : "#e3d7c2"}
                strokeWidth="1"
              />
            );
          })}
          {Array.from({ length: 22 }).map((_, i) => (
            <circle
              key={`c${i}`}
              cx={(i * 137) % 800}
              cy={(i * 211) % 600}
              r={i % 4 ? 2 : 3.5}
              fill={i % 3 ? "#a4622e" : "#d98a4a"}
              opacity="0.5"
            />
          ))}
        </svg>
        <p className="relative font-mono text-xs uppercase tracking-[0.4em] text-[#a4622e]">
          inside the mind of
        </p>
        <h1 className="relative mt-3 font-display text-5xl font-semibold tracking-tight text-[#1c1a17] sm:text-6xl">
          Keneisha Baid
        </h1>
        <p className="relative mt-4 max-w-md text-sm text-[#6b6459]">
          Management Engineering · University of Waterloo. Data, products, and
          the occasional beautiful obsession.
        </p>
        <a
          href="#projects"
          className="relative mt-10 rounded-full border border-[#a4622e]/50 px-6 py-2.5 font-mono text-xs uppercase tracking-widest text-[#a4622e] transition-colors hover:bg-[#a4622e]/10"
        >
          explore ↓
        </a>
      </section>
      <main className="relative">
        <Sections />
      </main>
      <ChatWidget />
    </div>
  );
}

export default function App() {
  const [lite] = useState(detectLite);
  const scrollRef = useRef(0);
  const flashRef = useRef(null);
  const scrimRef = useRef(null);
  const { humOn, toggleHum } = useHum();

  // Feed scroll progress (0..1) to the 3D director without re-rendering React,
  // and drive the white-out flashes at the two scene transitions.
  useEffect(() => {
    if (lite) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      scrollRef.current = p;
      if (flashRef.current) {
        const flash = (c) => Math.max(0, 1 - Math.abs(p - c) / 0.03);
        flashRef.current.style.opacity = Math.min(0.95, flash(0.34));
      }
      if (scrimRef.current) {
        // a calm gallery-paper wash under the reading sections
        const t = Math.min(1, Math.max(0, (p - 0.33) / 0.07));
        scrimRef.current.style.opacity = 0.66 * t;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lite]);

  const skipIntro = () => {
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
  };

  if (lite) return <LiteExperience humOn={humOn} toggleHum={toggleHum} />;

  return (
    <div className="relative bg-[#f2efe8] text-[#3a352c]">
      <Suspense fallback={<div className="fixed inset-0 bg-[#f2efe8]" />}>
        <NeuralCanvas scrollRef={scrollRef} />
      </Suspense>

      {/* the ink swallowing the view at each threshold */}
      <div
        ref={flashRef}
        className="pointer-events-none fixed inset-0 z-30 bg-[#08070a]"
        style={{ opacity: 0 }}
      />

      {/* readable surface: gallery paper rising under the sections */}
      <div
        ref={scrimRef}
        className="pointer-events-none fixed inset-0 z-[5] bg-[#f2efe8]"
        style={{ opacity: 0 }}
      />

      <Sparks />
      <MindNav humOn={humOn} toggleHum={toggleHum} />

      <main className="relative z-10">
        <Landing onSkip={skipIntro} />

        {/* the descent: scroll space for the zoom into the crack */}
        <div className="relative h-[240vh]">
          <div className="sticky top-0 flex h-screen items-end justify-center pb-16">
            <p className="dive-caption font-mono text-[10px] uppercase tracking-[0.4em] text-white mix-blend-difference">
              into the stone
            </p>
          </div>
        </div>

        <Sections />
      </main>

      <ChatWidget />
    </div>
  );
}
