import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Landing,
  ProjectNeurons,
  SkillTerminals,
  MuseumExhibit,
  CoreTerminal,
  StationPanel,
} from "./neural/Sections";
import { Sparks, useHum, MindNav } from "./neural/Fx";
import { JOURNEY, stationAt } from "./neural/journey";
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

/* Static fallback keeps the browsable rails. */
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
        <ProjectNeurons />
        <MuseumExhibit />
        <SkillTerminals />
        <CoreTerminal />
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
  const [walking, setWalking] = useState(false);
  const [inHall, setInHall] = useState(false);
  const [station, setStation] = useState(-1);
  const [loaded, setLoaded] = useState(false);
  const walkingRef = useRef(false);
  const inHallRef = useRef(false);
  const stationRef = useRef(-1);
  const coarse = useRef(
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches
  ).current;

  // the museum opens when the building has actually arrived
  useEffect(() => {
    if (lite) return;
    const open = () => setLoaded(true);
    window.addEventListener("kb:loaded", open, { once: true });
    const t = setTimeout(open, 15000); // never trap the visitor
    return () => {
      window.removeEventListener("kb:loaded", open);
      clearTimeout(t);
    };
  }, [lite]);

  // free-roam lock/unlock events from the 3D scene
  useEffect(() => {
    const lock = () => {
      walkingRef.current = true;
      setWalking(true);
      if (scrimRef.current) scrimRef.current.style.opacity = 0;
      if (flashRef.current) flashRef.current.style.opacity = 0;
    };
    const unlock = () => {
      walkingRef.current = false;
      setWalking(false);
    };
    window.addEventListener("kb:lock", lock);
    window.addEventListener("kb:unlock", unlock);
    return () => {
      window.removeEventListener("kb:lock", lock);
      window.removeEventListener("kb:unlock", unlock);
    };
  }, []);

  // while walking, the page must not scroll underneath the visitor
  useEffect(() => {
    const block = (e) => {
      if (walkingRef.current) e.preventDefault();
    };
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    return () => {
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
    };
  }, []);

  // scroll → journey progress for the 3D, the ink blink, the reading scrim,
  // the walk button, and which wall-label is on display
  useEffect(() => {
    if (lite) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      scrollRef.current = p;
      if (flashRef.current) {
        const flash = (c) => Math.max(0, 1 - Math.abs(p - c) / 0.03);
        flashRef.current.style.opacity = Math.min(0.95, flash(JOURNEY.split));
      }
      if (scrimRef.current) {
        // paper rises only for the reading rooms after the walk
        const t = Math.min(1, Math.max(0, (p - JOURNEY.walkEnd) / 0.04));
        scrimRef.current.style.opacity = walkingRef.current ? 0 : 0.85 * t;
      }
      const ih = p > JOURNEY.split && p < 0.985;
      if (ih !== inHallRef.current) {
        inHallRef.current = ih;
        setInHall(ih);
      }
      const st = walkingRef.current ? -1 : stationAt(p);
      if (st !== stationRef.current) {
        stationRef.current = st;
        setStation(st);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lite]);

  const skipIntro = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: max * (JOURNEY.walkStart + 0.01), behavior: "smooth" });
  };

  if (lite) return <LiteExperience humOn={humOn} toggleHum={toggleHum} />;

  const panelOnRight = station >= 0 && station % 2 === 0; // painting hangs left → label right

  return (
    <div className="relative bg-[#f2efe8] text-[#3a352c]">
      <Suspense fallback={<div className="fixed inset-0 bg-[#f2efe8]" />}>
        <NeuralCanvas scrollRef={scrollRef} />
      </Suspense>

      {/* the blink as you pass through the stone */}
      <div
        ref={flashRef}
        className="pointer-events-none fixed inset-0 z-30 bg-[#08070a]"
        style={{ opacity: 0 }}
      />

      {/* gallery paper under the final reading rooms */}
      <div
        ref={scrimRef}
        className="pointer-events-none fixed inset-0 z-[5] bg-[#f2efe8]"
        style={{ opacity: 0 }}
      />

      <Sparks />
      <MindNav humOn={humOn} toggleHum={toggleHum} />

      <main
        className={`relative z-10 transition-opacity duration-500 ${
          walking ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <Landing onSkip={skipIntro} />

        {/* the descent: scroll space for the zoom into the crack */}
        <div className="relative h-[240vh]">
          <div className="sticky top-0 flex h-screen items-end justify-center pb-16">
            <p className="dive-caption font-mono text-[10px] uppercase tracking-[0.4em] text-white mix-blend-difference">
              into the stone
            </p>
          </div>
        </div>

        {/* THE WALK — the paintings hang in the building; labels appear beside them */}
        <div id="projects" className="relative h-[760vh]">
          <div id="experience" className="absolute left-0 top-[54.5%] h-px w-px" aria-hidden="true" />
        </div>

        <SkillTerminals />
        <CoreTerminal />
      </main>

      {/* the wall label for whichever painting you're in front of */}
      {station >= 0 && !walking && (
        <aside
          key={station}
          className={`rise fixed top-1/2 z-20 w-[min(90vw,24rem)] -translate-y-1/2 ${
            panelOnRight ? "right-4 sm:right-10" : "left-4 sm:left-10"
          }`}
        >
          <StationPanel index={station} />
        </aside>
      )}

      {/* free-roam controls */}
      {inHall && !walking && !coarse && (
        <button
          id="kb-walk-anchor"
          onClick={() => window.dispatchEvent(new Event("kb:walk"))}
          className="fixed bottom-6 left-6 z-40 rounded-full border border-[#a4622e]/50 bg-[#f2efe8]/90 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#a4622e] shadow-lg backdrop-blur transition-colors hover:bg-[#a4622e] hover:text-white"
        >
          🚶 walk the gallery
        </button>
      )}
      {walking && (
        <p className="pointer-events-none fixed inset-x-0 top-16 z-40 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#5d5749]">
          wasd / arrows to move · shift to hurry · esc to leave
        </p>
      )}

      {/* the museum's doors, closed until the building is inside them */}
      {!loaded && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#f2efe8]">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#a09a8c]">
            collection № 01
          </p>
          <p className="mt-4 font-display text-2xl font-medium italic text-[#1c1a17]">
            The museum is opening…
          </p>
          <span className="caret mt-6 inline-block h-4 w-2 bg-[#a4622e]" />
        </div>
      )}

      {!walking && <ChatWidget />}
    </div>
  );
}
