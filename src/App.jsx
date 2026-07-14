import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ProjectNeurons,
  SkillTerminals,
  MuseumExhibit,
  AboutMe,
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
      <div className="sticky top-0 h-screen bg-white">
        {/* corner labels */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-8 py-8 sm:px-14">
          <div className="flex flex-col gap-1 text-left">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-[#1c1a17]">
              Management Engineering
            </span>
            <span className="font-sans text-[11px] font-normal uppercase tracking-[0.25em] text-[#5d5749]">
              University of Waterloo
            </span>
          </div>
          <a
            href="#contact"
            className="pointer-events-auto font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-[#1c1a17] transition-colors hover:text-[#555555]"
          >
            Contact Me
          </a>
        </div>

        {/* the name, dead centre, wide and thin */}
        <div className="flex h-full items-center justify-center px-6">
          <h1 className="rise select-none text-center font-wordmark text-3xl font-medium uppercase tracking-[0.18em] text-[#171411] sm:text-5xl sm:tracking-[0.26em]">
            Keneisha&nbsp;&nbsp;Baid
          </h1>
        </div>

        {/* the cursive line + arrow, sitting low, both leading to Projects */}
        <div className="pointer-events-none absolute inset-x-0 bottom-14 flex flex-col items-center gap-5 px-6">
          <a
            href="#projects"
            className="pointer-events-auto max-w-md text-center font-cursive text-xl leading-snug text-[#5d5749] transition-colors hover:text-[#171411]"
          >
            I like to build things that make hard decisions a little easier.
          </a>
          <a
            href="#projects"
            aria-label="Scroll down"
            className="pointer-events-auto animate-bounce text-4xl text-[#b9b2a4] transition-colors hover:text-[#5d5749]"
          >
            ↓
          </a>
        </div>

        {/* bottom-left: the blurb (bold + cursive) and the About Me button */}
        <div className="pointer-events-auto absolute bottom-10 left-8 max-w-[17rem] text-left sm:left-14 sm:max-w-sm">
          <p className="font-sans text-[15px] leading-relaxed text-[#171411]">
            <span className="font-semibold">Curious by default.</span>{" "}
            <span className="font-semibold">Perpetual learner.</span>{" "}
            <span className="font-semibold">Problem-solver.</span>
          </p>
        </div>

        {/* bottom-right: "bored?" coming out of the shark's mouth → About Me */}
        <BoredShark />
      </div>
    </section>
  );
}

/* "bored?" spoken out of the shark's open mouth. Falls back to a plain
   pill if public/shark.png hasn't been added yet. */
function BoredShark() {
  const [ok, setOk] = useState(true);
  if (!ok)
    return (
      <a
        href="#life"
        className="pointer-events-auto absolute bottom-10 right-8 rounded-full border border-[#171411]/40 px-5 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-[#171411] transition-colors hover:bg-[#171411] hover:text-white sm:right-14"
      >
        bored?
      </a>
    );
  return (
    <a
      href="#life"
      aria-label="Bored? — About me"
      className="group pointer-events-auto absolute bottom-3 right-2 block w-36 sm:w-52"
    >
      <img
        src="/shark.png"
        alt=""
        onError={() => setOk(false)}
        className="w-full transition-transform duration-300 group-hover:-translate-y-1"
      />
      {/* the word, spoken out of the open mouth */}
      <span className="absolute left-[15%] top-[46%] -rotate-6 font-cursive text-2xl font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.9)] sm:text-3xl">
        bored?
      </span>
    </a>
  );
}

export default function App() {
  const [lite] = useState(detectLite);
  const heroRef = useRef(0); // 0..1 across the hero section only
  const [pastHero, setPastHero] = useState(false);
  const pastRef = useRef(false);
  const { humOn, toggleHum } = useHum();

  // simple hash routing: '#life' is its own page, everything else is home
  const [route, setRoute] = useState(() =>
    window.location.hash === "#life" ? "life" : "home"
  );
  useEffect(() => {
    const onHash = () =>
      setRoute(window.location.hash === "#life" ? "life" : "home");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (route === "life") window.scrollTo(0, 0);
  }, [route]);

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

  // the Life page — the album stack + interests live here now
  if (route === "life") {
    return (
      <div className="relative min-h-screen bg-white text-[#3a352c]">
        <MindNav humOn={humOn} toggleHum={toggleHum} />
        <Sparks />
        <div className="px-8 pt-24 sm:px-14">
          <a
            href="#home"
            onClick={() => (window.location.hash = "")}
            className="font-mono text-[11px] uppercase tracking-[0.25em] text-black/50 transition-colors hover:text-black"
          >
            ← back
          </a>
        </div>
        <main className="relative">
          <AboutMe />
        </main>
        <ChatWidget />
      </div>
    );
  }

  if (lite) {
    return (
      <div className="relative min-h-screen bg-white text-[#3a352c]">
        <MindNav humOn={humOn} toggleHum={toggleHum} />
        <section className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
          <h1 className="font-wordmark text-5xl font-light uppercase tracking-[0.3em] text-[#1c1a17] sm:text-6xl">
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

      {/* the persistent nav only after the editorial intro */}
      <div
        className={`transition-opacity duration-500 ${
          pastHero ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <MindNav humOn={humOn} toggleHum={toggleHum} />
      </div>

      <Sparks />

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
