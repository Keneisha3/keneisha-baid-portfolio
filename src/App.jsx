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

/* The name plate over the hero — nothing but the name. */
function Hero() {
  return (
    <section className="relative h-[220vh]">
      <div className="pointer-events-none sticky top-0 flex h-screen items-start justify-center pt-20">
        <h1 className="rise px-6 text-center font-display text-4xl font-medium tracking-tight text-[#1c1a17] sm:text-6xl">
          Keneisha Baid
        </h1>
      </div>
    </section>
  );
}

export default function App() {
  const [lite] = useState(detectLite);
  const heroRef = useRef(0); // 0..1 across the hero section only
  const { humOn, toggleHum } = useHum();

  useEffect(() => {
    if (lite) return;
    const onScroll = () => {
      // progress through the first ~2 screens, clamped
      const span = window.innerHeight * 1.6;
      heroRef.current = Math.min(1, Math.max(0, window.scrollY / span));
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
      <div className="relative min-h-screen bg-[#f2efe8] text-[#3a352c]">
        <MindNav humOn={humOn} toggleHum={toggleHum} />
        <section className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
          <h1 className="font-display text-5xl font-medium tracking-tight text-[#1c1a17] sm:text-6xl">
            Keneisha Baid
          </h1>
          <
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
    <div className="relative bg-[#f2efe8] text-[#3a352c]">
      {/* the breaking marble — fixed behind the hero only */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Suspense fallback={<div className="h-full w-full bg-[#f2efe8]" />}>
          <NeuralCanvas scrollRef={heroRef} />
        </Suspense>
      </div>

      <Sparks />
      <MindNav humOn={humOn} toggleHum={toggleHum} />

      <div className="relative z-10">
        <Hero />

        {/* the reading sections sit on a solid surface above the 3D */}
        <main className="relative bg-[#f2efe8]">
          {Sections}
        </main>
      </div>

      <ChatWidget />
    </div>
  );
}
