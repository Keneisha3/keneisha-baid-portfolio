import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ProjectNeurons,
  SkillTerminals,
  MuseumExhibit,
  CoreTerminal,
} from "./neural/Sections";
import { Sparks, useHum, MindNav } from "./neural/Fx";
import ChatWidget from "./components/ChatWidget";

const NeuralCanvas = lazy(() => import("./neural/Scene"));

// Marble hero is hidden for now (kept in the codebase). Set true to bring it back.
const SHOW_MARBLE = false;

// Lite mode: weak/failed WebGL, reduced-motion, tiny mobile, or ?lite.
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

/* Editorial minimalist intro — corners, a wide-tracked name, a quiet nav.
   The breaking marble sits faintly behind it. */
function Hero() {
  return (
    <section className="relative h-[220vh]">
      <div className="sticky top-0 h-screen">
        {/* soft wash so the type reads crisp over the faint marble */}
        <div className="pointer-events-none absolute inset-0 bg-white/70" />
        {/* corner labels */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-8 py-8 sm:px-14">
          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-[#1c1a17]">
            Management Engineering
          </span>
          <span className="font-sans text-[11px] font-normal uppercase tracking-[0.25em] text-[#b9b2a4]">
            Waterloo · 2026
          </span>
        </div>

        {/* the name, dead centre, wide and thin */}
        <div className="flex h-full items-center justify-center px-6">
          <h1 className="rise select-none text-center font-sans text-3xl font-light uppercase tracking-[0.28em] text-[#171411] sm:text-5xl sm:tracking-[0.42em]">
            Keneisha&nbsp;&nbsp;Baid
          </h1>
        </div>

        {/* quiet bottom nav */}
        <nav className="absolute inset-x-0 bottom-10 flex items-center justify-center gap-8">
          {[
            ["Projects", "#projects"],
            ["Experience", "#experience"],
            ["Contact", "#contact"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-[#5d5749] transition-colors hover:text-[#171411]"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}

export default function App() {
  const [lite] = useState(detectLite);
  const heroRef = useRef(0); // 0..1 across the hero section only
  const [pastHero, setPastHero] = useState(false);
  const pastRef = useRef(false);
  const { humOn, toggleHum } = useHum();

  useEffect(() => {
    if (lite) return;
    const onScroll = () => {
      // progress through the first ~2 screens, clamped
      const span = window.innerHeight * 1.6;
      heroRef.current = Math.min(1, Math.max(0, window.scrollY / span));
      // the persistent nav appears only once the intro is behind you
      const past = window.scrollY > window.innerHeight * 1.9;
      if (past !== pastRef.current) {
        pastRef.current = past;
        setPastHero(past);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lite]);

  const Sections = (
    <>
      <ProjectNeurons />
      <MuseumExhibit />
      <SkillTerminals />
      <CoreTerminal />
    </>
  );

  if (lite) {
    return (
      <div className="relative min-h-screen bg-white text-[#3a352c]">
        <MindNav humOn={humOn} toggleHum={toggleHum} />
        <section className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
          <h1 className="font-display text-5xl font-medium tracking-tight text-[#1c1a17] sm:text-6xl">
            Keneisha Baid
          </h1>
          <a
            href="#projects"
            className="mt-10 rounded-full border border-[#a4622e]/50 px-6 py-2.5 font-mono text-xs uppercase tracking-widest text-[#a4622e] transition-colors hover:bg-[#a4622e]/10"
          >
            explore ↓
          </a>
        </section>
        <main className="relative">{Sections}</main>
        <ChatWidget />
      </div>
    );
  }

  return (
    <div className="relative bg-white text-[#3a352c]">
      {/* the breaking marble — hidden for now (code kept). Flip SHOW_MARBLE to re-enable. */}
      {SHOW_MARBLE && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <Suspense fallback={<div className="h-full w-full bg-white" />}>
            <NeuralCanvas scrollRef={heroRef} />
          </Suspense>
        </div>
      )}

      <Sparks />
      {/* the persistent nav only after the editorial intro */}
      <div
        className={`transition-opacity duration-500 ${
          pastHero ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <MindNav humOn={humOn} toggleHum={toggleHum} />
      </div>

      <div className="relative z-10">
        <Hero />

        {/* the reading sections sit on a solid surface above the 3D */}
        <main className="relative bg-white">
          {Sections}
        </main>
      </div>

      <ChatWidget />
    </div>
  );
}
