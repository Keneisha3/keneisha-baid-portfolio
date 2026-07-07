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

    // glitter palette: gold, champagne, copper, and the occasional white flash
    const TONES = [
      [255, 213, 106],
      [255, 233, 178],
      [222, 148, 82],
      [255, 255, 255],
    ];
    let last = 0;
    const onMove = (e) => {
      const now = performance.now();
      if (now - last < 22 || parts.length > 220) return; // throttle
      last = now;
      for (let i = 0; i < 3; i++) {
        parts.push({
          x: e.clientX + (Math.random() - 0.5) * 6,
          y: e.clientY + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 1.8,
          vy: (Math.random() - 0.5) * 1.4 + 0.3, // glitter falls
          life: 1,
          size: 1.4 + Math.random() * 2.2,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.3,
          tone: TONES[(Math.random() * TONES.length) | 0],
          phase: Math.random() * Math.PI * 2,
        });
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const star = (x, y, r, rot) => {
      // a four-point sparkle
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = rot + (k * Math.PI) / 2;
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.stroke();
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts = parts.filter((p) => p.life > 0.03);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045; // gravity
        p.rot += p.spin;
        p.life *= 0.945;
        // twinkle: each fleck flickers on its own rhythm
        const tw = 0.55 + 0.45 * Math.sin(t * 0.02 + p.phase);
        const a = p.life * tw;
        const [r, g, b] = p.tone;
        ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
        ctx.lineWidth = 1;
        star(p.x, p.y, p.size * (0.6 + p.life), p.rot);
        // a bright core dot
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.fillRect(p.x - 0.7, p.y - 0.7, 1.4, 1.4);
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

/* ---------- minimal floating nav ---------- */
const NAV = [
  { id: "projects", label: "memories" },
  { id: "skills", label: "skills" },
  { id: "experience", label: "exhibit" },
  { id: "contact", label: "core" },
];

export function MindNav({ humOn, toggleHum }) {
  // mix-blend-difference lets the same white type read as ink on the white
  // gallery and as bone on the dark interior — one nav for both worlds.
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 mix-blend-difference sm:px-8">
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="font-display text-lg font-semibold tracking-tight text-white"
      >
        KB
      </a>
      <nav className="hidden items-center gap-6 md:flex">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/60 transition-colors hover:text-white"
          >
            {n.label}
          </a>
        ))}
      </nav>
      <button
        onClick={toggleHum}
        aria-label={humOn ? "Mute ambient sound" : "Enable ambient sound"}
        className={`flex h-9 w-9 items-center justify-center rounded-full border font-mono text-sm transition-colors ${
          humOn ? "border-white text-white" : "border-white/30 text-white/60 hover:border-white/70"
        }`}
      >
        {humOn ? "◉" : "◌"}
      </button>
    </header>
  );
}
