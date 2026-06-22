import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import { INTERESTS, PLAYLIST } from "../data/portfolio";
import { fetchRecs, addRec, clearLocal, isShared } from "../data/recsStore";

// Interactive 2-deck DJ mixer. Two synthesized tracks (no audio files); play
// either deck and use the crossfader to blend between them. All Web Audio.
// Both decks are original synth loops *inspired by* these tracks (not the real
// recordings) so they're fully playable and copyright-safe.
const TRACKS = {
  A: {
    name: "Deck A — Break My Love",
    note: "inspired by RÜFÜS DU SOL",
    tempo: 0.205, // ~122 BPM driving deep house
    accent: "#1C3F5F",
    // F# minor pulse: F#1 walk with octave lift
    bass: [46.25, 46.25, 69.3, 46.25, 61.74, 46.25, 55.0, 92.5],
    chord: [185.0, 220.0, 277.18], // F#m-ish airy stab
    swing: false,
  },
  B: {
    name: "Deck B — Hold On, We're Going Home",
    note: "inspired by Drake",
    tempo: 0.30, // ~100 BPM warm bounce
    accent: "#A4343A",
    // Eb major warmth: Eb walk
    bass: [77.78, 77.78, 51.91, 77.78, 58.27, 77.78, 51.91, 69.3],
    chord: [311.13, 392.0, 466.16], // Eb major glow
    swing: true,
  },
};

function DJMixer() {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const gainsRef = useRef({}); // per-deck GainNode
  const timersRef = useRef({}); // per-deck interval id
  const [playing, setPlaying] = useState({ A: false, B: false });
  const [mix, setMix] = useState(50); // 0 = full A, 100 = full B

  const ensureCtx = () => {
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      masterRef.current = ctx.createGain();
      masterRef.current.gain.value = 0.9;
      masterRef.current.connect(ctx.destination);
      ["A", "B"].forEach((d) => {
        const g = ctx.createGain();
        g.connect(masterRef.current);
        gainsRef.current[d] = g;
      });
      applyMix(50);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  // Equal-power crossfade between the two deck gains.
  const applyMix = (value) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const x = value / 100;
    const gA = Math.cos((x * Math.PI) / 2);
    const gB = Math.cos(((1 - x) * Math.PI) / 2);
    gainsRef.current.A?.gain.setTargetAtTime(gA, ctx.currentTime, 0.02);
    gainsRef.current.B?.gain.setTargetAtTime(gB, ctx.currentTime, 0.02);
  };

  const tone = (ctx, dest, freq, t, dur, type, vol) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  };

  const hat = (ctx, dest, t, vol) => {
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
    g.connect(dest);
    src.start(t);
    src.stop(t + 0.05);
  };

  const startDeck = (deck) => {
    const ctx = ensureCtx();
    const dest = gainsRef.current[deck];
    const cfg = TRACKS[deck];
    let step = 0;
    const tick = () => {
      const t = ctx.currentTime + 0.02;
      tone(ctx, dest, 48, t, 0.18, "sine", 0.5); // kick
      tone(ctx, dest, cfg.bass[step % cfg.bass.length], t, cfg.tempo * 0.9, "sawtooth", 0.22);
      if (step % 2 === 1) hat(ctx, dest, t, cfg.swing ? 0.18 : 0.13);
      if (step % 4 === 0) cfg.chord.forEach((f) => tone(ctx, dest, f, t, 0.2, "triangle", 0.07));
      step++;
    };
    tick();
    timersRef.current[deck] = setInterval(tick, cfg.tempo * 1000);
  };

  const stopDeck = (deck) => {
    if (timersRef.current[deck]) {
      clearInterval(timersRef.current[deck]);
      timersRef.current[deck] = null;
    }
  };

  const toggleDeck = (deck) => {
    setPlaying((p) => {
      const next = !p[deck];
      if (next) startDeck(deck);
      else stopDeck(deck);
      return { ...p, [deck]: next };
    });
  };

  const onMix = (e) => {
    const v = Number(e.target.value);
    setMix(v);
    applyMix(v);
  };

  useEffect(() => {
    return () => {
      stopDeck("A");
      stopDeck("B");
      if (ctxRef.current) ctxRef.current.close();
    };
  }, []);

  const Deck = ({ id }) => {
    const cfg = TRACKS[id];
    const on = playing[id];
    return (
      <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-blush-200/80">
              {cfg.name}
            </span>
            {cfg.note && (
              <span className="block text-[10px] italic text-blush-200/50">
                {cfg.note}
              </span>
            )}
          </div>
          <span
            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${on ? "animate-pulse" : ""}`}
            style={{ background: on ? cfg.accent : "rgba(255,255,255,0.25)" }}
          />
        </div>

        {/* realistic turntable: platter, grooved vinyl, label, tonearm */}
        <div className="relative mx-auto mb-4 h-32 w-32">
          {/* spinning record */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                repeating-radial-gradient(circle at 50% 50%, #0c0b0f 0px, #0c0b0f 1px, #1b1a20 2px, #0c0b0f 3px) ,
                radial-gradient(circle at 38% 32%, rgba(255,255,255,0.18), transparent 45%)`,
              boxShadow:
                "inset -6px -6px 16px rgba(0,0,0,.7), 0 6px 16px rgba(0,0,0,.5)",
              animation: on ? "spin 1.6s linear infinite" : "none",
            }}
          >
            {/* sheen sweep */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 210deg, transparent 0deg, rgba(255,255,255,0.12) 25deg, transparent 60deg)",
              }}
            />
            {/* colored center label */}
            <div
              className="absolute left-1/2 top-1/2 flex h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{
                background: `radial-gradient(circle at 40% 35%, ${cfg.accent}, ${cfg.accent}cc 60%, ${cfg.accent}99)`,
                boxShadow: "inset 0 0 6px rgba(0,0,0,.4)",
              }}
            >
              <span className="text-[8px] font-bold uppercase tracking-wider text-white/85">
                {id}
              </span>
            </div>
            {/* spindle hole */}
            <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0c0b0f] ring-1 ring-white/30" />
          </div>

          {/* tonearm (tilts onto the record when playing) */}
          <div
            className="absolute -right-1 top-1 h-[58%] w-[10%] origin-top transition-transform duration-500"
            style={{ transform: on ? "rotate(18deg)" : "rotate(-6deg)" }}
          >
            <div className="mx-auto h-full w-1 rounded-full bg-gradient-to-b from-blush-200 to-blush-400" />
            <div className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-blush-300 ring-2 ring-plum-900" />
            <div className="absolute bottom-0 left-1/2 h-2 w-3 -translate-x-1/2 rounded-sm bg-blush-200" />
          </div>
        </div>

        <button
          onClick={() => toggleDeck(id)}
          className="w-full rounded-full px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
          style={{ background: cfg.accent }}
        >
          {on ? "⏸ Stop" : "▶ Play"}
        </button>
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-plum-900 to-[#15131a] p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Deck id="A" />
        <Deck id="B" />
      </div>

      {/* crossfader */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-blush-200/70">
          <span>A</span>
          <span>Crossfader</span>
          <span>B</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={mix}
          onChange={onMix}
          className="h-2 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background: `linear-gradient(90deg, #1C3F5F 0%, #6E92B4 ${mix}%, #C0565B ${mix}%, #A4343A 100%)`,
          }}
          aria-label="Crossfader between deck A and deck B"
        />
        <p className="mt-3 text-center text-xs text-blush-200/60">
          Play both decks, then slide to blend the mix.
        </p>
      </div>
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
  const recLayerRef = useRef(null); // Leaflet layer group for visitor pins
  const addModeRef = useRef(false);
  const [addMode, setAddMode] = useState(false);
  const [recs, setRecs] = useState([]);

  // Keep a ref in sync so the Leaflet click handler reads the latest value.
  useEffect(() => {
    addModeRef.current = addMode;
  }, [addMode]);

  // Render visitor recommendation pins from current `recs`.
  const drawRecs = (list) => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!recLayerRef.current) {
      recLayerRef.current = L.layerGroup().addTo(map);
    }
    recLayerRef.current.clearLayers();
    const recIcon = L.divIcon({
      className: "kb-pin kb-pin--rec",
      html: '<span class="kb-pin-dot kb-pin-dot--rec"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 18],
      popupAnchor: [0, -16],
    });
    list.forEach((r) => {
      L.marker([r.lat, r.lng], { icon: recIcon, riseOnHover: true })
        .addTo(recLayerRef.current)
        .bindTooltip(`★ ${r.name}`, { direction: "top", offset: [0, -14] })
        .bindPopup(`<strong>★ ${r.name}</strong><br/><span style="color:#6E1E2E">visitor pick</span>`);
    });
  };

  const showRecs = (list) => {
    setRecs(list);
    drawRecs(list);
  };

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled || !elRef.current || !window.L || mapRef.current) return;
      const L = window.L;
      const map = L.map(elRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
        zoomControl: true,
      }).setView([46.5, -20], 3);
      mapRef.current = map;

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 18,
        }
      ).addTo(map);

      L.polyline(
        TRAVEL_PINS.map((p) => p.coords),
        { color: "#A4343A", weight: 1.5, opacity: 0.5, dashArray: "5 7" }
      ).addTo(map);

      const icon = L.divIcon({
        className: "kb-pin",
        html: '<span class="kb-pin-pulse"></span><span class="kb-pin-dot"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 18],
        popupAnchor: [0, -16],
      });

      const group = [];
      TRAVEL_PINS.forEach((p) => {
        L.marker(p.coords, { icon, riseOnHover: true })
          .addTo(map)
          .bindTooltip(p.name, { direction: "top", offset: [0, -14] })
          .bindPopup(`<strong>${p.name}</strong>`);
        group.push(p.coords);
      });
      if (group.length > 1) map.fitBounds(group, { padding: [50, 50] });

      // Load existing recommendation pins (shared if backend configured).
      fetchRecs().then((saved) => {
        if (!cancelled) showRecs(saved);
      });

      // Click to drop a recommendation pin (only in add mode).
      map.on("click", async (e) => {
        if (!addModeRef.current) return;
        const name = window.prompt(
          "Recommend this spot! What is it? (e.g. 'Best gelato — Rome')"
        );
        setAddMode(false);
        if (!name || !name.trim()) return;
        const next = await addRec({
          name: name.trim(),
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
        if (!cancelled) showRecs(next);
      });
    };

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

  // Reflect add-mode on the map container (cursor + subtle ring).
  useEffect(() => {
    const c = elRef.current;
    if (c) c.style.cursor = addMode ? "crosshair" : "";
  }, [addMode]);

  const clearRecs = () => {
    if (recs.length && window.confirm("Remove the recommendation pins you added?")) {
      showRecs(clearLocal());
    }
  };

  return (
    <div>
      <div className="relative">
        <div
          ref={elRef}
          className={`h-[380px] w-full overflow-hidden rounded-2xl border-4 shadow-inner transition-colors ${
            addMode ? "border-rose-400" : "border-blush-200"
          }`}
        />
        <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-full border border-blush-200 bg-white/90 px-3 py-1 text-xs font-semibold text-pink-700 shadow-sm backdrop-blur">
          ✈️ {TRAVEL_PINS.length} places &amp; counting
        </div>
        {addMode && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center">
            <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow">
              Click anywhere to drop your recommendation
            </span>
          </div>
        )}
      </div>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setAddMode((m) => !m)}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            addMode
              ? "bg-rose-500 text-white hover:bg-rose-600"
              : "bg-pink-500 text-white hover:bg-pink-600"
          }`}
        >
          {addMode ? "✕ Cancel" : "★ Recommend a place"}
        </button>
        {recs.length > 0 && (
          <span className="text-sm text-plum-700/60">
            {recs.length} recommendation{recs.length === 1 ? "" : "s"} so far
          </span>
        )}
        {!isShared && recs.length > 0 && (
          <button
            onClick={clearRecs}
            className="text-sm font-medium text-plum-700/60 underline-offset-2 hover:text-rose-500 hover:underline"
          >
            clear mine
          </button>
        )}
        <span className="ml-auto text-xs text-plum-700/40">
          {isShared ? "shared with everyone" : "saved in your browser"}
        </span>
      </div>
    </div>
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
      {/* rosewood fretboard */}
      <div
        className="relative min-w-[440px] rounded-xl p-4 pl-9"
        style={{
          background:
            "repeating-linear-gradient(90deg, #3b2415 0px, #4a2e1a 18px, #3a2313 40px), linear-gradient(180deg, #4a2e1a, #2e1c10)",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,.45)",
        }}
      >
        {/* nut at the far left */}
        <div className="absolute left-7 top-3 bottom-3 w-1 rounded bg-gradient-to-b from-[#f3e9d8] to-[#d8c6a8]" />

        {/* metal fret wires */}
        {Array.from({ length: FRETS }).map((_, f) => (
          <div
            key={`wire-${f}`}
            className="pointer-events-none absolute top-3 bottom-3 w-[2px] rounded"
            style={{
              left: `calc(2.25rem + ${((f + 1) / FRETS) * 100}% - ${((f + 1) / FRETS) * 2.25}rem)`,
              background: "linear-gradient(180deg,#e8e8ec,#9a9aa2)",
              opacity: 0.8,
            }}
          />
        ))}

        {GUITAR_STRINGS.map((str, si) => (
          <div key={si} className="relative flex items-center gap-2 py-1">
            <span className="z-10 w-4 shrink-0 text-center text-xs font-semibold text-blush-100/90">
              {str.label}
            </span>
            <div className="relative flex flex-1 gap-2">
              {/* the string line, thicker for lower strings */}
              <span
                className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded"
                style={{
                  height: `${1 + si * 0.4}px`,
                  background:
                    "linear-gradient(180deg,#fff,#c9c9cf 40%,#8d8d94)",
                  opacity: 0.85,
                }}
              />
              {Array.from({ length: FRETS }).map((_, fret) => (
                <button
                  key={fret}
                  onClick={() => pluck(str.openFreq, fret)}
                  aria-label={`${str.label} string, fret ${fret}`}
                  className={`group relative z-10 flex h-7 flex-1 items-center justify-center rounded-sm transition-all active:scale-95 ${
                    fret === 0
                      ? "hover:bg-rose-400/25"
                      : "hover:bg-blush-100/15"
                  }`}
                >
                  {/* finger dot on press-feedback */}
                  <span
                    className={`h-3.5 w-3.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100 ${
                      fret === 0 ? "bg-rose-400" : "bg-blush-100"
                    }`}
                    style={{ boxShadow: "0 0 6px rgba(0,0,0,.4)" }}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* position-marker inlays (between strings, at frets 3) */}
        <div className="pointer-events-none absolute left-9 right-4 top-1/2 flex -translate-y-1/2 justify-around opacity-70">
          <span />
          <span />
          <span className="h-2.5 w-2.5 rounded-full bg-blush-100/70" />
          <span />
          <span />
        </div>

        <div className="mt-2 flex justify-between pl-5 pr-1 text-[10px] uppercase tracking-wider text-blush-100/60">
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
            <span className="text-sm text-plum-700/60">
              red = my stops · gold = your recs
            </span>
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
              <span aria-hidden>🎧</span> Mini DJ booth
            </h3>
            <span className="text-sm text-plum-700/60">play both decks, then crossfade</span>
          </div>
          <DJMixer />
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
