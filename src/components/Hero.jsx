import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROLES } from "../data/portfolio";

// Soft drifting dots with faint links, tuned for a light pink backdrop.
function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let particles = [];
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 18000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.8 + 0.6,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(13, 148, 136, 0.40)";
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(247, 108, 94, ${0.16 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    if (!reduce) draw();
    else ctx.clearRect(0, 0, canvas.width, canvas.height);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

export default function Hero() {
  const [roleIndex, setRoleIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setRoleIndex((i) => (i + 1) % ROLES.length), 2600);
    return () => clearInterval(t);
  }, []);

  const letters = "Hi, I'm Keneisha.".split("");

  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-blush-50" />
      <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(55%_50%_at_20%_15%,rgba(45,212,191,0.30),transparent_60%),radial-gradient(50%_50%_at_85%_25%,rgba(247,108,94,0.22),transparent_60%),radial-gradient(60%_60%_at_50%_100%,rgba(13,148,136,0.16),transparent_60%)] bg-[length:200%_200%]" />
      <ParticleField />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_55%,#FBFAF8)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/70 px-4 py-1.5 text-sm text-plum-700 shadow-sm backdrop-blur"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-pink-500" />
          University of Waterloo · Management Engineering
        </motion.p>

        <h1 className="font-display text-4xl font-semibold tracking-tight text-plum-900 sm:text-6xl md:text-7xl">
          {letters.map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.04, ease: "easeOut" }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </h1>

        <div className="mt-6 flex h-10 items-center justify-center text-xl font-medium text-plum-700 sm:text-2xl">
          <span className="mr-2 text-plum-700/50">I'm a</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={roleIndex}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.4 }}
              className="gradient-text font-semibold"
            >
              {ROLES[roleIndex]}
            </motion.span>
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <a
            href="#projects"
            className="group inline-flex items-center gap-2 rounded-full bg-pink-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-pink-500/30 transition-all hover:scale-105 hover:bg-pink-600"
          >
            See My Work
            <span className="transition-transform group-hover:translate-y-0.5">↓</span>
          </a>
          <a
            href="#contact"
            className="rounded-full border border-pink-300 bg-white/60 px-7 py-3.5 text-base font-semibold text-plum-700 backdrop-blur transition-colors hover:border-pink-500 hover:text-pink-600"
          >
            Contact
          </a>
        </motion.div>

        <motion.nav
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-plum-700/60"
        >
          {[
            { href: "#projects", label: "Projects" },
            { href: "#experience", label: "Experience" },
            { href: "#skills", label: "Skills" },
            { href: "#/life", label: "Life" },
          ].map((l, i) => (
            <span key={l.href} className="flex items-center gap-x-6">
              {i > 0 && <span className="text-pink-300">·</span>}
              <a href={l.href} className="transition-colors hover:text-pink-600">
                {l.label}
              </a>
            </span>
          ))}
        </motion.nav>
      </div>
    </section>
  );
}
