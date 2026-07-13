/* Ambient effects: electric cursor sparks, the low electrical hum, and the
   minimal floating nav. */
import { useEffect, useRef, useState } from "react";

/* ---------- electric sparks that follow the cursor ---------- */
export function Sparks() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let parts = [];
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // colorful confetti palette: bright, playful, and slightly translucent
    const TONES = [
      [255, 94, 117],
      [124, 224, 132],
      [99, 201, 255],
      [255, 210, 82],
      [191, 133, 255],
      [255, 150, 78],
      [255, 255, 255],
    ];
    let last = 0;
    const onMove = (e) => {
      const now = performance.now();
      if (now - last < 18 || parts.length > 260) return; // throttle
      last = now;
      for (let i = 0; i < 4; i++) {
        parts.push({
          x: e.clientX + (Math.random() - 0.5) * 7,
          y: e.clientY + (Math.random() - 0.5) * 7,
          vx: (Math.random() - 0.5) * 2.2,
          vy: (Math.random() - 0.5) * 1.6 + 0.45,
          life: 1,
          size: 2 + Math.random() * 3.2,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.45,
          tone: TONES[(Math.random() * TONES.length) | 0],
          phase: Math.random() * Math.PI * 2,
          shape: Math.random() > 0.5 ? "burst" : "chip",
        });
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const burst = (x, y, r, rot) => {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? r * 0.48 : r;
        const a = rot + (k * Math.PI) / 5 - Math.PI / 2;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };

    const chip = (x, y, r, rot) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillRect(-r * 0.8, -r * 0.35, r * 1.6, r * 0.7);
      ctx.restore();
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts = parts.filter((p) => p.life > 0.03);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.035;
        p.rot += p.spin;
        p.life *= 0.955;
        const tw = 0.5 + 0.5 * Math.sin(t * 0.028 + p.phase);
        const a = p.life * tw;
        const [r, g, b] = p.tone;
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        if (p.shape === "burst") {
          burst(p.x, p.y, p.size * (0.55 + p.life), p.rot);
        } else {
          chip(p.x, p.y, p.size * (0.5 + p.life), p.rot);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-40"
      aria-hidden="true"
    />
  );
}

/* ---------- ambient electrical hum (off until toggled — autoplay rules) ---------- */
export function useHum() {
  const ctxRef = useRef(null);
  const gainRef = useRef(null);
  const [on, setOn] = useState(false);

  const toggle = () => {
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      // low mains-hum stack: 50Hz + 100Hz sines + filtered noise shimmer
      [50, 100, 150].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.value = [0.5, 0.22, 0.06][i];
        o.connect(g);
        g.connect(master);
        o.start();
      });
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let lastV = 0;
      for (let i = 0; i < len; i++) {
        lastV = lastV * 0.98 + (Math.random() * 2 - 1) * 0.02; // brown-ish noise
        d[i] = lastV * 2.4;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 400;
      const ng = ctx.createGain();
      ng.gain.value = 0.28;
      noise.connect(lp);
      lp.connect(ng);
      ng.connect(master);
      noise.start();

      ctxRef.current = ctx;
      gainRef.current = master;
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const g = gainRef.current.gain;
    const next = !on;
    g.cancelScheduledValues(ctx.currentTime);
    g.setTargetAtTime(next ? 0.05 : 0.0, ctx.currentTime, 0.4);
    setOn(next);
  };

  return { humOn: on, toggleHum: toggle };
}

/* ---------- readable museum nav: clear buttons on gallery paper ---------- */
const NAV = [
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
];

export function MindNav({ humOn, toggleHum }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#1c1a170f] bg-white/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="shrink-0 font-sans text-lg font-semibold tracking-tight text-[#171411]"
        >
          Keneisha <span className="text-[#a4622e]">Baid</span>
        </a>
        <nav className="flex items-center gap-1.5 overflow-x-auto sm:gap-2.5">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className="whitespace-nowrap rounded-full border border-[#1c1a171f] bg-white px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-[#3a352c] transition-colors hover:border-[#a4622e] hover:text-[#a4622e] sm:px-4"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <button
          onClick={toggleHum}
          aria-label={humOn ? "Mute ambient sound" : "Enable ambient sound"}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-sm transition-colors ${
            humOn
              ? "border-[#a4622e] text-[#a4622e]"
              : "border-[#1c1a1726] text-[#5d5749] hover:border-[#a4622e]/60"
          }`}
        >
          {humOn ? "◉" : "◌"}
        </button>
      </div>
    </header>
  );
}
