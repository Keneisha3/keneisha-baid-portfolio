import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import { INTERESTS, PLAYLIST } from "../data/portfolio";
import { fetchRecs, addRec, clearLocal, isShared } from "../data/recsStore";

// Crisp SVG turntable: vinyl with real groove rings, glossy colored label,
// spindle, specular glint, and a tonearm that drops onto the record when playing.
function Turntable({ id, accent, playing }) {
  const grooves = [62, 56, 50, 44, 38]; // concentric vinyl groove radii
  return (
    <svg viewBox="0 0 160 160" className="h-auto w-full" role="img" aria-label="turntable">
      <defs>
        <radialGradient id={`vinyl-${id}`} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#26242b" />
          <stop offset="55%" stopColor="#141318" />
          <stop offset="100%" stopColor="#050507" />
        </radialGradient>
        <radialGradient id={`label-${id}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={accent} stopOpacity="1" />
          <stop offset="70%" stopColor={accent} stopOpacity="0.85" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.6" />
        </radialGradient>
        <linearGradient id={`arm-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8d6c2" />
          <stop offset="100%" stopColor="#b5946f" />
        </linearGradient>
      </defs>

      {/* platter shadow */}
      <circle cx="80" cy="82" r="70" fill="#000" opacity="0.35" />

      {/* spinning record */}
      <g style={{ transformOrigin: "80px 80px", animation: playing ? "spin 1.6s linear infinite" : "none" }}>
        <circle cx="80" cy="80" r="70" fill={`url(#vinyl-${id})`} stroke="#000" strokeWidth="1" />
        {grooves.map((r) => (
          <circle key={r} cx="80" cy="80" r={r} fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
        ))}
        {/* specular glint that rides with the disc */}
        <path d="M80 12 A68 68 0 0 1 140 70 L116 70 A44 44 0 0 0 80 36 Z" fill="#ffffff" opacity="0.07" />
        {/* colored label */}
        <circle cx="80" cy="80" r="30" fill={`url(#label-${id})`} stroke="#000" strokeOpacity="0.25" />
        <circle cx="80" cy="80" r="30" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.6" />
        <text x="80" y="84" textAnchor="middle" fontSize="16" fontWeight="700" fill="#ffffff" fillOpacity="0.9" fontFamily="Inter, sans-serif">
          {id}
        </text>
        {/* spindle */}
        <circle cx="80" cy="80" r="2.4" fill="#050507" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.6" />
      </g>

      {/* tonearm – pivots onto the record when playing */}
      <g
        style={{
          transformOrigin: "142px 26px",
          transform: playing ? "rotate(20deg)" : "rotate(2deg)",
          transition: "transform 0.5s ease",
        }}
      >
        <circle cx="142" cy="26" r="6" fill="#2a2723" stroke={accent} strokeWidth="1.5" />
        <rect x="139" y="26" width="6" height="74" rx="3" fill={`url(#arm-${id})`} />
        <rect x="135" y="98" width="14" height="8" rx="2" fill="#2a2723" />
        <rect x="138" y="104" width="3" height="5" fill="#e8d6c2" />
      </g>
    </svg>
  );
}

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
        g.gain.value = 0.707; // start at equal-power 50% so first notes are audible
        g.connect(masterRef.current);
        gainsRef.current[d] = g;
      });
      // iOS/Safari unlock: play a one-sample silent buffer inside the gesture.
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch {
        /* ignore */
      }
    }
    if (ctx.state === "suspended") {
      ctx.resume();
    }
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
    if (timersRef.current[deck]) return; // already running, don't double up
    let step = 0;
    const tick = () => {
      const t = ctx.currentTime + 0.05;
      tone(ctx, dest, 48, t, 0.18, "sine", 0.5); // kick
      tone(ctx, dest, cfg.bass[step % cfg.bass.length], t, cfg.tempo * 0.9, "sawtooth", 0.22);
      if (step % 2 === 1) hat(ctx, dest, t, cfg.swing ? 0.18 : 0.13);
      if (step % 4 === 0) cfg.chord.forEach((f) => tone(ctx, dest, f, t, 0.2, "triangle", 0.07));
      step++;
    };
    const begin = () => {
      tick();
      timersRef.current[deck] = setInterval(tick, cfg.tempo * 1000);
    };
    // Resume is async on some browsers; wait for it so the first beats aren't dropped.
    if (ctx.state === "suspended" && ctx.resume) {
      ctx.resume().then(begin).catch(begin);
    } else {
      begin();
    }
  };

  const stopDeck = (deck) => {
    if (timersRef.current[deck]) {
      clearInterval(timersRef.current[deck]);
      timersRef.current[deck] = null;
    }
  };

  // Side-effects run directly in the click handler (a real user gesture, which
  // browsers require to start audio) — not inside the state updater.
  const toggleDeck = (deck) => {
    const willPlay = !playing[deck];
    if (willPlay) startDeck(deck);
    else stopDeck(deck);
    setPlaying((p) => ({ ...p, [deck]: willPlay }));
  };

  const onMix = (e) => {
    const v = Number(e.target.value);
    setMix(v);
    applyMix(v);
  };

  // Stop timers on unmount (but keep the AudioContext — closing it during
  // React's mount/unmount cycles can silence later playback).
  useEffect(() => {
    return () => {
      stopDeck("A");
      stopDeck("B");
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

        {/* SVG turntable: platter, grooved vinyl, glossy label, tonearm */}
        <div className="mx-auto mb-4 w-36">
          <Turntable id={id} accent={cfg.accent} playing={on} />
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
  { name: "Hyderabad, India", coords: [17.385, 78.4867] },
  { name: "New York, USA", coords: [40.7128, -74.006] },
  { name: "Los Angeles, USA", coords: [34.0522, -118.2437] },
  { name: "Palm Springs, USA", coords: [33.8303, -116.5453] },
  { name: "Detroit, USA", coords: [42.3314, -83.0458] },
  { name: "Chicago, USA", coords: [41.8781, -87.6298] },
  { name: "Montreal, Canada", coords: [45.5019, -73.5674] },
  { name: "Toronto, Canada", coords: [43.6532, -79.3832] },
];

// Quick-jump buttons for each continent.
const CONTINENTS = [
  { name: "N. America", emoji: "🌎", center: [40, -100], zoom: 3 },
  { name: "S. America", emoji: "🌎", center: [-15, -60], zoom: 3 },
  { name: "Europe", emoji: "🌍", center: [50, 10], zoom: 4 },
  { name: "Africa", emoji: "🌍", center: [2, 20], zoom: 3 },
  { name: "Asia", emoji: "🌏", center: [30, 90], zoom: 3 },
  { name: "Oceania", emoji: "🌏", center: [-25, 134], zoom: 3 },
];

function TravelMap() {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const recLayerRef = useRef(null); // Leaflet layer group for visitor pins
  const tempMarkerRef = useRef(null); // the dropped-but-unconfirmed pin
  const addModeRef = useRef(false);
  const [addMode, setAddMode] = useState(false);
  const [recs, setRecs] = useState([]);
  const [pending, setPending] = useState(null); // { lat, lng } awaiting a name
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);

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
        worldCopyJump: true,
      }).setView([44, 6], 4); // zoomed into Europe (most pins) by default
      mapRef.current = map;

      // Decorative satellite-style imagery with place labels on top.
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri",
          maxZoom: 18,
        }
      ).addTo(map);
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
        { maxZoom: 18, opacity: 0.9 }
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

      TRAVEL_PINS.forEach((p) => {
        L.marker(p.coords, { icon, riseOnHover: true })
          .addTo(map)
          .bindTooltip(p.name, { direction: "top", offset: [0, -14] })
          .bindPopup(`<strong>${p.name}</strong>`);
      });
      // Stay zoomed into Europe; users can zoom out to see the rest.

      // Load existing recommendation pins (shared if backend configured).
      fetchRecs().then((saved) => {
        if (!cancelled) showRecs(saved);
      });

      // Click to drop a draft pin (only in add mode); naming happens in-page.
      map.on("click", (e) => {
        if (!addModeRef.current) return;
        const L2 = window.L;
        if (tempMarkerRef.current) {
          map.removeLayer(tempMarkerRef.current);
        }
        const draftIcon = L2.divIcon({
          className: "kb-pin kb-pin--draft",
          html: '<span class="kb-pin-pulse"></span><span class="kb-pin-dot kb-pin-dot--draft"></span>',
          iconSize: [18, 18],
          iconAnchor: [9, 18],
        });
        tempMarkerRef.current = L2.marker([e.latlng.lat, e.latlng.lng], {
          icon: draftIcon,
        }).addTo(map);
        setPending({ lat: e.latlng.lat, lng: e.latlng.lng });
        setDraftName("");
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

  // Reflect add-mode on the map container (cursor) and keep Leaflet sized
  // correctly across re-renders so tiles never blank out.
  useEffect(() => {
    const c = elRef.current;
    if (c) c.style.cursor = addMode ? "crosshair" : "";
    if (mapRef.current) {
      mapRef.current.invalidateSize();
      const t = setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 250);
      return () => clearTimeout(t);
    }
  }, [addMode]);

  const removeTempMarker = () => {
    if (tempMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
  };

  const cancelPending = () => {
    removeTempMarker();
    setPending(null);
    setDraftName("");
  };

  const savePending = async () => {
    const name = draftName.trim();
    if (!name || !pending) return;
    setSaving(true);
    const next = await addRec({ name, lat: pending.lat, lng: pending.lng });
    removeTempMarker();
    showRecs(next);
    setSaving(false);
    setPending(null);
    setDraftName("");
    setAddMode(false);
  };

  const toggleAddMode = () => {
    cancelPending();
    setAddMode((m) => !m);
  };

  const clearRecs = () => {
    if (recs.length && window.confirm("Remove the recommendation pins you added?")) {
      showRecs(clearLocal());
    }
  };

  const viewAll = () => {
    const map = mapRef.current;
    if (map) map.flyToBounds(TRAVEL_PINS.map((p) => p.coords), { padding: [40, 40] });
  };
  const viewEurope = () => {
    const map = mapRef.current;
    if (map) map.flyTo([44, 6], 4);
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
        {addMode && !pending && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center">
            <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow">
              Tap the map where you'd recommend a spot
            </span>
          </div>
        )}

        {/* in-page naming form (replaces the unreliable browser prompt) */}
        {pending && (
          <div className="absolute inset-x-0 bottom-3 z-[600] flex justify-center px-3">
            <div className="w-full max-w-sm rounded-2xl border border-blush-200 bg-white/95 p-3 shadow-lg backdrop-blur">
              <label className="mb-1.5 block text-xs font-semibold text-plum-700">
                What do you recommend here?
              </label>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && savePending()}
                  maxLength={80}
                  placeholder="e.g. Best gelato in Rome"
                  className="flex-1 rounded-full border border-blush-300 bg-blush-50 px-3.5 py-2 text-sm text-plum-900 outline-none focus:border-pink-400"
                />
                <button
                  onClick={savePending}
                  disabled={saving || !draftName.trim()}
                  className="shrink-0 rounded-full bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pink-600 disabled:opacity-40"
                >
                  {saving ? "…" : "Add"}
                </button>
                <button
                  onClick={cancelPending}
                  className="shrink-0 rounded-full px-2 text-sm font-medium text-plum-700/60 hover:text-rose-500"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* continent jump buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        {CONTINENTS.map((c) => (
          <button
            key={c.name}
            onClick={() => {
              const map = mapRef.current;
              if (map) map.flyTo(c.center, c.zoom);
            }}
            className="rounded-full border border-blush-300 bg-white px-3 py-1.5 text-xs font-medium text-plum-700/80 transition-colors hover:border-pink-400 hover:bg-pink-50 hover:text-pink-600"
          >
            {c.emoji} {c.name}
          </button>
        ))}
        <button
          onClick={viewAll}
          className="rounded-full border border-blush-300 bg-white px-3 py-1.5 text-xs font-medium text-plum-700/80 transition-colors hover:border-pink-400 hover:bg-pink-50 hover:text-pink-600"
        >
          🌍 View all
        </button>
      </div>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={toggleAddMode}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            addMode
              ? "bg-rose-500 text-white hover:bg-rose-600"
              : "bg-pink-500 text-white hover:bg-pink-600"
          }`}
        >
          {addMode ? "✕ Done recommending" : "★ Recommend a place"}
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

// Interactive fretboard. Click a string/fret to pluck a note via the
// Web Audio API (plucked-string-ish tone, no assets or libraries).
const GUITAR_STRINGS = [
  { label: "E", openFreq: 329.63 }, // high E (top row)
  { label: "B", openFreq: 246.94 },
  { label: "G", openFreq: 196.0 },
  { label: "D", openFreq: 146.83 },
  { label: "A", openFreq: 110.0 },
  { label: "E", openFreq: 82.41 }, // low E (bottom row)
];
const FRETS = 8; // 0 (open) .. 7 — a longer, fuller neck
const INLAY_FRETS = [3, 5, 7]; // position markers

// The intro riff of "Headlines" (Drake), transcribed as a melody for practice.
// Moody F#-minor-ish motif mapped to the high-E (s:0) and B (s:1) strings.
// `d` = beats the note lasts during the demo playback.
// Twinkle Twinkle Little Star, first two lines, on the high-E (s:0) and B (s:1)
// strings: C C G G A A G, F F E E D D C.  `d` = beats the note lasts in the demo.
const SONG = {
  name: "Twinkle Twinkle",
  credit: "Little Star",
  notes: [
    { s: 1, f: 1, n: "C", d: 1 },
    { s: 1, f: 1, n: "C", d: 1 },
    { s: 0, f: 3, n: "G", d: 1 },
    { s: 0, f: 3, n: "G", d: 1 },
    { s: 0, f: 5, n: "A", d: 1 },
    { s: 0, f: 5, n: "A", d: 1 },
    { s: 0, f: 3, n: "G", d: 2 },
    { s: 0, f: 1, n: "F", d: 1 },
    { s: 0, f: 1, n: "F", d: 1 },
    { s: 0, f: 0, n: "E", d: 1 },
    { s: 0, f: 0, n: "E", d: 1 },
    { s: 1, f: 3, n: "D", d: 1 },
    { s: 1, f: 3, n: "D", d: 1 },
    { s: 1, f: 1, n: "C", d: 2 },
  ],
};
const BEAT_MS = 420; // demo tempo

function Fretboard() {
  const ctxRef = useRef(null);
  const demoTimers = useRef([]);
  const [mode, setMode] = useState("idle"); // "idle" | "demo" | "practice"
  const [step, setStep] = useState(0); // current note index (practice or demo highlight)
  const [flash, setFlash] = useState(null); // "good" | "oops"
  const [done, setDone] = useState(false);

  const pluck = (baseFreq, fret) => {
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
    }
    if (ctx.state === "suspended") ctx.resume();

    const freq = baseFreq * Math.pow(2, fret / 12);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.5);
  };

  const clearDemo = () => {
    demoTimers.current.forEach((t) => clearTimeout(t));
    demoTimers.current = [];
  };

  // Play the whole riff, lighting up each note as it sounds.
  const playDemo = () => {
    clearDemo();
    setMode("demo");
    setDone(false);
    setFlash(null);
    let elapsed = 0;
    SONG.notes.forEach((note, i) => {
      const at = setTimeout(() => {
        setStep(i);
        pluck(GUITAR_STRINGS[note.s].openFreq, note.f);
      }, elapsed);
      demoTimers.current.push(at);
      elapsed += note.d * BEAT_MS;
    });
    const end = setTimeout(() => {
      setMode("idle");
      setStep(0);
    }, elapsed + 300);
    demoTimers.current.push(end);
  };

  const startPractice = () => {
    clearDemo();
    setMode("practice");
    setStep(0);
    setFlash(null);
    setDone(false);
  };

  const stop = () => {
    clearDemo();
    setMode("idle");
    setStep(0);
    setFlash(null);
  };

  useEffect(() => () => clearDemo(), []);

  const practicing = mode === "practice";
  const target = practicing ? SONG.notes[step] : mode === "demo" ? SONG.notes[step] : null;

  const handleHit = (si, fret) => {
    pluck(GUITAR_STRINGS[si].openFreq, fret);
    if (!practicing) return;
    if (si === target.s && fret === target.f) {
      setFlash("good");
      const next = step + 1;
      if (next >= SONG.notes.length) {
        setDone(true);
        setTimeout(() => {
          setFlash(null);
          setMode("idle");
          setStep(0);
        }, 900);
      } else {
        setStep(next);
        setTimeout(() => setFlash(null), 160);
      }
    } else {
      setFlash("oops");
      setTimeout(() => setFlash(null), 160);
    }
  };

  return (
    <div>
      {/* tutorial banner */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blush-200 bg-blush-50 px-4 py-2.5">
        <div className="text-sm text-plum-700">
          {done ? (
            <span className="font-semibold text-emerald-600">🎉 Nailed it!</span>
          ) : practicing ? (
            <>
              🎸 <strong>{SONG.name}</strong> — play the glowing note
              <span className="ml-2 rounded-full bg-pink-500 px-2 py-0.5 text-xs font-bold text-white">
                {target.n}
              </span>
              <span className="ml-2 text-plum-700/50">
                {step + 1} / {SONG.notes.length}
              </span>
            </>
          ) : mode === "demo" ? (
            <>
              🔊 Listen… <strong>{SONG.name}</strong>
              <span className="ml-2 text-xs italic text-plum-700/50">{SONG.credit}</span>
            </>
          ) : (
            <>
              🎵 Learn the <strong>{SONG.name}</strong> riff
              <span className="ml-2 text-xs italic text-plum-700/50">{SONG.credit}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {mode === "idle" && (
            <>
              <button
                onClick={playDemo}
                className="rounded-full bg-pink-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-pink-600"
              >
                ▶ Play it for me
              </button>
              <button
                onClick={startPractice}
                className="rounded-full border border-pink-300 px-4 py-1.5 text-sm font-semibold text-pink-600 transition-colors hover:bg-pink-50"
              >
                🎯 Let me try
              </button>
            </>
          )}
          {mode === "demo" && (
            <button
              onClick={playDemo}
              className="rounded-full border border-pink-300 px-4 py-1.5 text-sm font-semibold text-pink-600 transition-colors hover:bg-pink-50"
            >
              ↻ Replay
            </button>
          )}
          {practicing && (
            <button
              onClick={playDemo}
              className="rounded-full border border-pink-300 px-3 py-1.5 text-sm font-semibold text-pink-600 transition-colors hover:bg-pink-50"
            >
              ↻ Hear it
            </button>
          )}
          {mode !== "idle" && (
            <button
              onClick={stop}
              className="text-sm font-medium text-plum-700/60 hover:text-rose-500"
            >
              exit
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* rosewood fretboard */}
        <div
          className={`relative min-w-[560px] overflow-hidden rounded-xl p-4 pl-9 transition-shadow ${
            flash === "good"
              ? "ring-2 ring-emerald-400"
              : flash === "oops"
              ? "ring-2 ring-rose-500"
              : ""
          }`}
          style={{
            background:
              "repeating-linear-gradient(91deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0) 3px, rgba(120,70,40,0.12) 9px, rgba(0,0,0,0.18) 16px)," +
              "repeating-linear-gradient(88deg, rgba(0,0,0,0.14) 0px, rgba(0,0,0,0) 24px)," +
              "radial-gradient(140% 90% at 30% 20%, #5a3a22 0%, #43291788 40%, transparent 70%)," +
              "linear-gradient(180deg, #4a2e1a, #2c1a0f)",
            boxShadow:
              "inset 0 2px 8px rgba(0,0,0,.5), inset 0 -6px 14px rgba(0,0,0,.4)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,240,220,0.12), transparent)",
            }}
          />

          {/* nut */}
          <div className="absolute left-7 top-3 bottom-3 w-1.5 rounded bg-gradient-to-r from-[#fbf3e4] via-[#e9d6b8] to-[#cdb792] shadow-[1px_0_3px_rgba(0,0,0,0.4)]" />

          {/* fret wires */}
          {Array.from({ length: FRETS }).map((_, f) => (
            <div
              key={`wire-${f}`}
              className="pointer-events-none absolute top-3 bottom-3 w-[3px] rounded-full"
              style={{
                left: `calc(2.25rem + ${((f + 1) / FRETS) * 100}% - ${((f + 1) / FRETS) * 2.25}rem)`,
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.5), #f4f4f7 35%, #c9c9d0 55%, rgba(0,0,0,0.45))",
                boxShadow: "0 0 2px rgba(255,255,255,0.5)",
                opacity: 0.9,
              }}
            />
          ))}

          {GUITAR_STRINGS.map((str, si) => (
            <div key={si} className="relative flex items-center gap-2 py-1">
              <span className="z-10 w-4 shrink-0 text-center text-xs font-semibold text-blush-100/90">
                {str.label}
              </span>
              <div className="relative flex flex-1 gap-2">
                <span
                  className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded"
                  style={{
                    height: `${1 + si * 0.4}px`,
                    background: "linear-gradient(180deg,#fff,#c9c9cf 40%,#8d8d94)",
                    opacity: 0.85,
                  }}
                />
                {Array.from({ length: FRETS }).map((_, fret) => {
                  const isTarget =
                    target && target.s === si && target.f === fret;
                  return (
                    <button
                      key={fret}
                      onClick={() => handleHit(si, fret)}
                      aria-label={`${str.label} string, fret ${fret}`}
                      className="group relative z-10 flex h-7 flex-1 items-center justify-center rounded-sm transition-all active:scale-95 hover:bg-blush-100/15"
                    >
                      {/* glowing target dot during the tutorial */}
                      {isTarget && (
                        <span className="absolute h-4 w-4 animate-ping rounded-full bg-pink-400/70" />
                      )}
                      <span
                        className={`h-3.5 w-3.5 rounded-full transition-opacity ${
                          isTarget
                            ? "bg-pink-400 opacity-100 shadow-[0_0_8px_rgba(236,72,153,0.9)]"
                            : "bg-blush-100 opacity-0 group-hover:opacity-100 group-active:opacity-100"
                        }`}
                        style={{ boxShadow: "0 0 6px rgba(0,0,0,.4)" }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* position-marker inlays at frets 3, 5, 7 */}
          <div className="pointer-events-none absolute left-9 right-4 top-1/2 flex -translate-y-1/2 opacity-70">
            {Array.from({ length: FRETS }).map((_, f) => (
              <div key={f} className="flex flex-1 justify-center">
                {INLAY_FRETS.includes(f) && (
                  <span className="h-2.5 w-2.5 rounded-full bg-blush-100/70" />
                )}
              </div>
            ))}
          </div>

          {/* fret numbers */}
          <div className="mt-2 flex pl-5 text-[10px] uppercase tracking-wider text-blush-100/60">
            <span className="flex-1 text-left">open</span>
            {Array.from({ length: FRETS - 1 }).map((_, f) => (
              <span key={f} className="flex-1 text-center">
                {f + 1}
              </span>
            ))}
          </div>
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
