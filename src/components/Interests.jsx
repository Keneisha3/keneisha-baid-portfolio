import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import { INTERESTS, PLAYLIST } from "../data/portfolio";

// Interactive disco ball: click to spin + play a looping disco groove built
// live with the Web Audio API (no audio files). Click again to stop.
function DiscoBall() {
  const ctxRef = useRef(null);
  const timerRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  // A simple four-on-the-floor disco loop with a walking bass + hats.
  const startGroove = () => {
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
    }
    if (ctx.state === "suspended") ctx.resume();

    const bass = [55, 55, 82.41, 55, 73.42, 55, 65.41, 98]; // A-based disco walk
    const tempo = 0.26; // seconds per step
    let step = 0;

    const tone = (freq, t, dur, type, vol) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    };

    const noiseHat = (t, vol) => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      src.connect(hp);
      hp.connect(g);
      g.connect(ctx.destination);
      src.start(t);
      src.stop(t + 0.05);
    };

    const tick = () => {
      const t = ctx.currentTime + 0.02;
      // four-on-the-floor kick
      tone(48, t, 0.18, "sine", 0.5);
      // bassline
      tone(bass[step % bass.length], t, tempo * 0.9, "sawtooth", 0.22);
      // off-beat open hat
      if (step % 2 === 1) noiseHat(t, 0.15);
      // sparkly chord stab every 4 steps
      if (step % 4 === 0) {
        [440, 554.37, 659.25].forEach((f) => tone(f, t, 0.18, "triangle", 0.08));
      }
      step++;
    };

    tick();
    timerRef.current = setInterval(tick, tempo * 1000);
  };

  const stopGroove = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const toggle = () => {
    if (playing) {
      stopGroove();
      setPlaying(false);
    } else {
      startGroove();
      setPlaying(true);
    }
  };

  useEffect(() => () => stopGroove(), []);

  // Build a grid of mirror tiles for the ball.
  const tiles = [];
  const rows = 9;
  for (let r = 0; r < rows; r++) {
    const cols = 14;
    for (let c = 0; c < cols; c++) {
      tiles.push({ r, c, key: `${r}-${c}` });
    }
  }

  return (
    <div className="relative flex h-[340px] flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-plum-900 to-pink-700">
      {/* sweeping light beams */}
      <div
        className={`pointer-events-none absolute inset-0 ${playing ? "opacity-100" : "opacity-40"}`}
        style={{
          background:
            "conic-gradient(from 0deg at 50% 0%, transparent 0deg, rgba(175,199,222,0.25) 20deg, transparent 40deg, rgba(164,52,58,0.22) 70deg, transparent 95deg, rgba(255,255,255,0.18) 130deg, transparent 160deg)",
          animation: playing ? "spin 6s linear infinite" : "none",
        }}
      />

      {/* hanging cord */}
      <div className="absolute top-0 h-10 w-px bg-white/40" />

      {/* the ball */}
      <button
        onClick={toggle}
        aria-label={playing ? "Stop the music" : "Play the music"}
        className="group relative mt-6"
        style={{ perspective: "600px" }}
      >
        <div
          className="relative h-40 w-40 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, #fdfdfd 0%, #cdd7e6 22%, #8aa0bd 55%, #41506b 100%)",
            boxShadow:
              "0 0 40px rgba(175,199,222,0.6), inset -10px -10px 30px rgba(0,0,0,0.5)",
            animation: playing ? "spin 2.4s linear infinite" : "spin 14s linear infinite",
            transformStyle: "preserve-3d",
          }}
        >
          {/* mirror tiles */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div
              className="grid h-full w-full"
              style={{
                gridTemplateRows: `repeat(${rows}, 1fr)`,
              }}
            >
              {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="grid" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
                  {Array.from({ length: 14 }).map((_, c) => {
                    const shade = (r + c) % 3;
                    const bg =
                      shade === 0 ? "rgba(255,255,255,0.45)" : shade === 1 ? "rgba(138,160,189,0.5)" : "rgba(65,80,107,0.55)";
                    return (
                      <span
                        key={c}
                        className="border border-plum-900/30"
                        style={{ background: bg }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {/* highlight */}
          <div className="pointer-events-none absolute left-6 top-5 h-8 w-8 rounded-full bg-white/70 blur-md" />
        </div>
      </button>

      <button
        onClick={toggle}
        className="z-10 mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/25"
      >
        {playing ? "⏸ Stop the groove" : "▶ Hit play"}
      </button>
    </div>
  );
}

// Small inline guitar glyph for the header.
function GuitarIcon() {
  return (
    <svg
      className="h-6 w-6 text-blush-200"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19.5 3.5l1 1-2 2-1-1z" />
      <path d="M17.5 5.5l-3.2 3.2" />
      <path d="M14.3 8.7a3.5 3.5 0 0 0-4 4c.3 1.6-.4 2.8-1.7 3.6a3 3 0 1 0 1.4 1.4c.8-1.3 2-2 3.6-1.7a3.5 3.5 0 0 0 4-4" />
      <circle cx="11" cy="13" r="1.1" />
    </svg>
  );
}

// Interactive travel map (Leaflet, loaded from CDN). Pan, zoom, click pins.
const TRAVEL_PINS = [
  { name: "Paris, France", coords: [48.8566, 2.3522] },
  { name: "Nice, France", coords: [43.7102, 7.262] },
  { name: "Monaco", coords: [43.7384, 7.4246] },
  { name: "Barcelona, Spain", coords: [41.3874, 2.1686] },
  { name: "Rome, Italy", coords: [41.9028, 12.4964] },
  { name: "Naples, Italy", coords: [40.8518, 14.2681] },
  { name: "London, England", coords: [51.5072, -0.1276] },
  { name: "Wales", coords: [52.6, -3.8] },
  { name: "Cardiff, Wales", coords: [51.4816, -3.1791] },
  { name: "Edinburgh, Scotland", coords: [55.9533, -3.1883] },
  { name: "Isle of Skye, Scotland", coords: [57.27, -6.215] },
  { name: "Scottish Highlands", coords: [57.12, -4.71] },
  { name: "Dubai, UAE", coords: [25.2048, 55.2708] },
  { name: "New Delhi, India", coords: [28.6139, 77.209] },
  { name: "Mumbai, India", coords: [19.076, 72.8777] },
  { name: "New York, USA", coords: [40.7128, -74.006] },
  { name: "Los Angeles, USA", coords: [34.0522, -118.2437] },
  { name: "Palm Springs, USA", coords: [33.8303, -116.5453] },
  { name: "Detroit, USA", coords: [42.3314, -83.0458] },
  { name: "Chicago, USA", coords: [41.8781, -87.6298] },
  { name: "Montreal, Canada", coords: [45.5019, -73.5674] },
  { name: "Toronto, Canada", coords: [43.6532, -79.3832] },
];

function TravelMap() {
  const elRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled || !elRef.current || !window.L || mapRef.current) return;
      const L = window.L;
      const map = L.map(elRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([46.5, -20], 3);
      mapRef.current = map;

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 18,
        }
      ).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: '<div style="width:16px;height:16px;border-radius:50% 50% 50% 0;background:#A4343A;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 16],
        popupAnchor: [0, -14],
      });

      const group = [];
      TRAVEL_PINS.forEach((p) => {
        const m = L.marker(p.coords, { icon })
          .addTo(map)
          .bindPopup(`<strong>${p.name}</strong><br/>${p.note}`);
        group.push(m.getLatLng());
      });
      if (group.length > 1) map.fitBounds(group, { padding: [40, 40] });
    };

    // Wait for the Leaflet CDN script to be ready.
    if (window.L) start();
    else {
      const id = setInterval(() => {
        if (window.L) {
          clearInterval(id);
          start();
        }
      }, 120);
      setTimeout(() => clearInterval(id), 6000);
      return () => {
        cancelled = true;
        clearInterval(id);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={elRef}
      className="h-[360px] w-full overflow-hidden rounded-2xl border border-pink-100"
    />
  );
}

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
          {standalone ? "Step into my playground" : "A more creative side"}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-plum-700/80">
          {standalone
            ? "A hands-on corner of things I love. Explore the 3D scene, map my travels, strum a guitar, doodle, and hear what's on repeat. Everything here is interactive, go ahead and play."
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
            <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-plum-900">
              <span aria-hidden>🗺️</span> Where I've wandered
            </h3>
            <span className="text-sm text-plum-700/60">drag to pan · click a pin</span>
          </div>
          <TravelMap />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-6 overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-md shadow-pink-500/10">
          {/* Guitar-style header band with fret inlays */}
          <div className="relative flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-plum-900 to-pink-700 px-5 py-4 sm:px-7">
            <h3 className="flex items-center gap-2.5 font-display text-xl font-semibold text-white">
              <GuitarIcon />
              Guitar
            </h3>
            <span className="text-sm text-blush-200/80">
              click a fret to play · open strings in red
            </span>
            {/* fret-inlay dots */}
            <div className="pointer-events-none absolute bottom-1.5 left-0 flex w-full justify-around px-10 opacity-40">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-blush-200" />
              ))}
            </div>
          </div>
          <div className="p-5 sm:p-7">
            <Fretboard />
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-6 rounded-3xl border border-pink-100 bg-white p-5 shadow-md shadow-pink-500/10 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-plum-900">
              <span aria-hidden>🪩</span> Disco ball
            </h3>
            <span className="text-sm text-plum-700/60">click the ball to start the party</span>
          </div>
          <DiscoBall />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-6 rounded-3xl border border-pink-100 bg-white p-5 shadow-md shadow-pink-500/10 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-semibold text-plum-900">
              Stained glass, sort of
            </h3>
            <span className="text-sm text-plum-700/60">
              my tribute to the windows I could never recreate · drag to paint, any key to wipe the evidence
            </span>
          </div>
          <Doodle />
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
    </section>
  );
}
