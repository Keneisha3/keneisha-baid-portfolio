import { useEffect, useRef } from "react";
import Reveal from "./Reveal";
import { INTERESTS, PLAYLIST } from "../data/portfolio";

// Interactive mini-fretboard. Click a string/fret to pluck a note via the
// Web Audio API (plucked-string-ish tone, no assets or libraries).
const GUITAR_STRINGS = [
  { label: "E", openFreq: 329.63 }, // high E (top row)
  { label: "B", openFreq: 246.94 },
  { label: "G", openFreq: 196.0 },
  { label: "D", openFreq: 146.83 },
  { label: "A", openFreq: 110.0 },
  { label: "E", openFreq: 82.41 }, // low E (bottom row)
];
const FRETS = 5; // 0 (open) .. 4

function Fretboard() {
  const ctxRef = useRef(null);

  const pluck = (baseFreq, fret) => {
    // Lazily create / resume the audio context on first interaction.
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
    }
    if (ctx.state === "suspended") ctx.resume();

    const freq = baseFreq * Math.pow(2, fret / 12); // each fret = 1 semitone
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;

    // Quick attack, exponential decay for a plucked feel.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.5);
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[420px] rounded-2xl bg-plum-900 p-4">
        {GUITAR_STRINGS.map((str, si) => (
          <div key={si} className="flex items-center gap-2 py-1.5">
            <span className="w-5 shrink-0 text-center text-xs font-semibold text-blush-200">
              {str.label}
            </span>
            <div className="flex flex-1 gap-2">
              {Array.from({ length: FRETS }).map((_, fret) => (
                <button
                  key={fret}
                  onClick={() => pluck(str.openFreq, fret)}
                  aria-label={`${str.label} string, fret ${fret}`}
                  className={`group relative flex h-9 flex-1 items-center justify-center rounded-md border transition-all active:scale-95 ${
                    fret === 0
                      ? "border-rose-500/60 bg-rose-500/10 hover:bg-rose-500/25"
                      : "border-white/10 bg-white/5 hover:border-pink-400 hover:bg-pink-500/25"
                  }`}
                >
                  <span className="h-px w-full bg-white/20 group-hover:bg-white/40" />
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-2 flex justify-between px-7 text-[10px] uppercase tracking-wider text-blush-200/50">
          <span>open</span>
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </div>
      </div>
    </div>
  );
}

// Interactive Spotify playlist embed (30s previews, no login required).
function Playlist() {
  const src = `https://open.spotify.com/embed/${PLAYLIST.type}/${PLAYLIST.spotifyId}?utm_source=generator&theme=0`;
  return (
    <iframe
      title="Keneisha's playlist"
      src={src}
      width="100%"
      height="380"
      style={{ borderRadius: "16px", border: "0" }}
      frameBorder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );
}

// Interactive doodle, Keneisha's own p5.js sketch.
// Press and drag to paint translucent ellipses; press any key to clear.
function Doodle() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.p5) return;
    let instance;

    const sketch = (p) => {
      let red, green, w, h;
      const fr = 250;

      const cw = () => (containerRef.current ? containerRef.current.clientWidth : 500);
      const ch = 360;

      p.setup = () => {
        const c = p.createCanvas(cw(), ch);
        c.parent(containerRef.current);
        p.background(250, 194, 160); // soft peachy-pink
        p.frameRate(fr);
      };

      p.windowResized = () => {
        p.resizeCanvas(cw(), ch);
        p.background(250, 194, 160);
      };

      p.draw = () => {
        if (p.mouseIsPressed && p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
          w = p.random(2, 151);
          red = p.random(25, 151);
          h = p.random(2, 151);
          green = p.random(256);

          p.fill(red, green, 170, 50); // translucent
          p.stroke(243, 255, 240);
          p.strokeWeight(0.1);
          p.ellipse(p.mouseX, p.mouseY, w, h);
        }

        if (p.keyIsPressed) {
          p.background(250, 194, 160);
        }
      };
    };

    instance = new window.p5(sketch);
    return () => instance && instance.remove();
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[360px] w-full cursor-crosshair overflow-hidden rounded-2xl border border-pink-200"
      aria-label="Interactive doodle canvas, press and drag to paint, press any key to clear"
    />
  );
}

// 3D gallery (A-Frame), favourite things float in a slowly turning ring.
// Drag to look around. Add an image URL to an interest and it shows here too.
function VRGallery() {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const R = 4.4;
    const n = INTERESTS.length;
    const palette = ["#EC4899", "#FB7185", "#DB2777", "#F472B6", "#E26FA0", "#C9638F"];

    const items = INTERESTS.map((it, i) => {
      const deg = (360 / n) * i;
      const rad = (deg * Math.PI) / 180;
      const x = (R * Math.sin(rad)).toFixed(2);
      const z = (-R * Math.cos(rad)).toFixed(2);
      const ry = (-deg).toFixed(2);
      const color = palette[i % palette.length];

      const face = it.img
        ? `<a-image src="${it.img}" crossorigin="anonymous" width="1.8" height="1.8"
             position="${x} 1.7 ${z}" rotation="0 ${ry} 0"></a-image>`
        : `<a-entity position="${x} 1.7 ${z}" rotation="0 ${ry} 0">
             <a-plane width="1.8" height="1.8" material="shader: flat; color: ${color}; opacity: 0.95"></a-plane>
             <a-text value="${it.title}" align="center" width="3.2" color="#FFFFFF"
               position="0 0 0.02" wrap-count="15"></a-text>
           </a-entity>`;

      const caption = `<a-text value="${it.tag}" align="center" width="2.6" color="#FFD7E6"
        position="${x} 0.5 ${z}" rotation="0 ${ry} 0"></a-text>`;

      return face + caption;
    }).join("");

    el.innerHTML = `
      <a-scene embedded vr-mode-ui="enabled: false"
        style="width:100%;height:100%;display:block;">
        <!-- Procedural dreamy-pink landscape instead of a flat background -->
        <a-entity environment="preset: default;
          skyType: gradient; skyColor: #ffd9ec; horizonColor: #ff8fc0;
          fog: 0.12; ground: hills; groundColor: #b95689; groundColor2: #8f3f68;
          groundTexture: walkernoise; dressing: mushrooms; dressingAmount: 30;
          dressingColor: #fb7185; dressingScale: 1.4; playArea: 1.4; grid: none"></a-entity>

        <a-entity light="type: ambient; color: #8A5A73; intensity: 1.0"></a-entity>
        <a-entity light="type: point; color: #EC4899; intensity: 0.8" position="0 4 0"></a-entity>
        <a-entity light="type: point; color: #FFE3EE; intensity: 0.6" position="4 2 4"></a-entity>
        <a-entity light="type: point; color: #FB7185; intensity: 0.5" position="-4 -1 -3"></a-entity>

        <a-entity animation="property: rotation; to: 0 360 0; loop: true; dur: 70000; easing: linear">
          ${items}
        </a-entity>

        <a-camera position="0 1.6 0" wasd-controls-enabled="false" look-controls>
          <a-cursor visible="false"></a-cursor>
        </a-camera>
      </a-scene>
    `;

    return () => {
      el.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-pink-200 bg-plum-900"
    />
  );
}

export default function Interests({ standalone = false }) {
  return (
    <section
      id="interests"
      className={`section-pad mx-auto max-w-7xl ${standalone ? "pt-32" : ""}`}
    >
      <Reveal>
        {standalone ? (
          <a
            href="#/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-plum-700/70 transition-colors hover:text-pink-600"
          >
            <span aria-hidden>←</span> Back home
          </a>
        ) : (
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-pink-600">
            Beyond the code
          </p>
        )}
        <h2 className="section-title">
          {standalone ? "A few of my favourite things" : "A more creative side"}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-plum-700/80">
          {standalone
            ? "A look at what I get up to when I step away from the screen. Drag the scene around to wander through it."
            : "A peek at what I build for fun. Step into the 3D scene, or leave a doodle below."}
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-12 rounded-3xl border border-pink-100 bg-white p-5 shadow-md shadow-pink-500/10 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-semibold text-plum-900">
              Step inside my brain
            </h3>
            <span className="text-sm text-plum-700/60">click &amp; drag to look around</span>
          </div>
          <VRGallery />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-6 rounded-3xl border border-pink-100 bg-white p-5 shadow-md shadow-pink-500/10 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-semibold text-plum-900">
              On repeat
            </h3>
            <span className="text-sm text-plum-700/60">{PLAYLIST.caption}</span>
          </div>
          <Playlist />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-6 rounded-3xl border border-pink-100 bg-white p-5 shadow-md shadow-pink-500/10 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-semibold text-plum-900">
              Doodle with me
            </h3>
            <span className="text-sm text-plum-700/60">
              my tribute to the stained-glass windows I could never recreate · drag to paint, any key to wipe the evidence
            </span>
          </div>
          <Doodle />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-6 rounded-3xl border border-pink-100 bg-white p-5 shadow-md shadow-pink-500/10 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-semibold text-plum-900">
              Six strings
            </h3>
            <span className="text-sm text-plum-700/60">
              click a fret to play · open strings in red
            </span>
          </div>
          <Fretboard />
        </div>
      </Reveal>
    </section>
  );
}
