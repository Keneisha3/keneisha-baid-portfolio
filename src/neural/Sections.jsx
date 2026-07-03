/* DOM layer of the neural experience. These sections scroll over the fixed
   3D canvas and are shared by the lite (no-WebGL) fallback. */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PROFILE, PROJECTS, TOOLKIT, EXPERIENCE, PLAYLIST } from "../data/portfolio";

/* ---------- helpers ---------- */
const ghRepo = (links = []) => {
  for (const l of links) {
    const m = /github\.com\/([^/]+\/[^/.]+)/.exec(l.href || "");
    if (m) return m[1];
  }
  return null;
};
// GitHub's own OpenGraph card for a repo — a legitimate, hotlinkable preview.
const ghPreview = (repo) => `https://opengraph.githubassets.com/kb1/${repo}`;

const fadeUp = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

function SectionTitle({ kicker, title, sub }) {
  return (
    <motion.div {...fadeUp} className="mx-auto mb-12 max-w-3xl text-center">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-[#37d6f5]">
        {kicker}
      </p>
      <h2 className="font-display text-3xl font-semibold text-[#e8e4dc] sm:text-5xl">
        {title}
      </h2>
      {sub && <p className="mt-4 text-base text-[#8b8fa3]">{sub}</p>}
    </motion.div>
  );
}

/* ---------- LANDING (over the bust) ---------- */
export function Landing({ onSkip }) {
  return (
    <section className="relative flex h-screen flex-col items-center justify-end pb-24 text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 1.2 }}
        className="font-mono text-xs uppercase tracking-[0.4em] text-[#37d6f5]"
      >
        inside the mind of
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 1.2 }}
        className="mt-3 font-display text-5xl font-semibold tracking-tight text-[#e8e4dc] sm:text-7xl"
      >
        Keneisha Baid
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="mt-4 max-w-md px-6 text-sm text-[#8b8fa3]"
      >
        Management Engineering · University of Waterloo. Data, products, and the
        occasional beautiful obsession.
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="mt-10 flex items-center gap-5"
      >
        <span className="flex flex-col items-center gap-2 text-[#8b8fa3]">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em]">descend</span>
          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="text-[#37d6f5]"
          >
            ↓
          </motion.span>
        </span>
        <button
          onClick={onSkip}
          className="rounded-full border border-white/15 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-[#8b8fa3] transition-colors hover:border-[#37d6f5] hover:text-[#37d6f5]"
        >
          skip intro
        </button>
      </motion.div>
    </section>
  );
}

/* ---------- PROJECTS: memories stored in neurons ---------- */
export function ProjectNeurons() {
  const [open, setOpen] = useState(null); // index of the expanded project
  const [hover, setHover] = useState(null);

  // relatedness = shared tech keywords
  const related = useMemo(() => {
    const norm = (t) => t.toLowerCase().split(/[\s/]+/)[0];
    return PROJECTS.map((p, i) =>
      PROJECTS.map(
        (q, j) =>
          i !== j &&
          p.tech.some((a) => q.tech.some((b) => norm(a) === norm(b)))
      )
    );
  }, []);

  return (
    <section id="projects" className="relative mx-auto max-w-6xl px-6 py-28">
      <SectionTitle
        kicker="memory region"
        title="Projects, stored as memories"
        sub="Each neuron holds one build. Hover to see what it's wired to; open one to recall it."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((p, i) => {
          const repo = ghRepo(p.links);
          const lit = hover !== null && (hover === i || related[hover]?.[i]);
          const dim = hover !== null && !lit;
          return (
            <motion.button
              key={p.title}
              {...fadeUp}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setOpen(i)}
              className={`group relative rounded-2xl border p-5 text-left backdrop-blur-sm transition-all duration-300 ${
                lit
                  ? "border-[#37d6f5]/70 bg-[#37d6f5]/[0.07] shadow-[0_0_35px_rgba(55,214,245,0.25)]"
                  : "border-white/10 bg-white/[0.03]"
              } ${dim ? "opacity-40" : "opacity-100"}`}
            >
              {/* the neuron */}
              <span className="relative mb-4 flex h-10 w-10 items-center justify-center">
                <span
                  className={`absolute h-3.5 w-3.5 rounded-full ${
                    p.status ? "bg-[#d98a4a]" : "bg-[#37d6f5]"
                  }`}
                />
                <span
                  className={`absolute h-3.5 w-3.5 animate-ping rounded-full ${
                    p.status ? "bg-[#d98a4a]/60" : "bg-[#37d6f5]/50"
                  }`}
                  style={{ animationDuration: `${1.6 + (i % 3) * 0.7}s` }}
                />
                <span className="absolute h-9 w-9 rounded-full border border-white/10" />
              </span>

              {p.status && (
                <span className="mb-2 inline-block rounded-full border border-[#d98a4a]/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#ffb070]">
                  {p.status}
                </span>
              )}
              <h3 className="font-display text-lg font-semibold text-[#e8e4dc]">
                {p.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#8b8fa3]">
                {p.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.tech.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] text-[#9fd8e8]"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <span className="mt-4 block font-mono text-[11px] uppercase tracking-widest text-[#37d6f5] opacity-0 transition-opacity group-hover:opacity-100">
                recall memory →
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* memory recall modal */}
      <AnimatePresence>
        {open !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setOpen(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#37d6f5]/40 bg-[#070a10] shadow-[0_0_80px_rgba(55,214,245,0.2)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#37d6f5]">
                  memory · recalled
                </span>
                <button
                  onClick={() => setOpen(null)}
                  className="font-mono text-sm text-[#8b8fa3] hover:text-[#e8e4dc]"
                >
                  ✕
                </button>
              </div>
              {(() => {
                const p = PROJECTS[open];
                const repo = ghRepo(p.links);
                return (
                  <div className="p-5">
                    {repo && (
                      <img
                        src={ghPreview(repo)}
                        alt={`${p.title} repository preview`}
                        className="mb-4 w-full rounded-lg border border-white/10"
                        loading="lazy"
                      />
                    )}
                    <h3 className="font-display text-2xl font-semibold text-[#e8e4dc]">
                      {p.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#a7abbd]">
                      {p.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {p.tech.map((t) => (
                        <span
                          key={t}
                          className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] text-[#9fd8e8]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      {p.links.map((l) => (
                        <a
                          key={l.label}
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-[#37d6f5]/50 px-5 py-2 font-mono text-xs uppercase tracking-widest text-[#37d6f5] transition-colors hover:bg-[#37d6f5]/10"
                        >
                          {l.label} ↗
                        </a>
                      ))}
                      {!p.links.length && (
                        <span className="font-mono text-xs text-[#8b8fa3]">
                          still forming — in active development
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ---------- SKILLS: holographic terminals ---------- */
export function SkillTerminals() {
  return (
    <section id="skills" className="relative mx-auto max-w-6xl px-6 py-28">
      <SectionTitle
        kicker="motor cortex"
        title="Wired-in skills"
        sub="Languages, libraries, and platforms I've worked with. Still learning plenty."
      />
      <div className="grid gap-5 sm:grid-cols-2">
        {TOOLKIT.map((cat, ci) => (
          <motion.div
            key={cat.group}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: ci * 0.08 }}
            className="holo relative overflow-hidden rounded-xl border border-[#37d6f5]/25 bg-[#37d6f5]/[0.04] p-5"
          >
            <div className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.25em] text-[#37d6f5]">
              <span>▸ {cat.group}</span>
              <span className="text-[#37d6f5]/50">{String(cat.items.length).padStart(2, "0")}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {cat.items.map((tool) => (
                <span
                  key={tool}
                  className="rounded border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-xs text-[#c6e9f2] transition-colors hover:border-[#37d6f5]/60 hover:text-white"
                >
                  {tool}
                </span>
              ))}
            </div>
            <span className="mt-3 block h-3 w-2 animate-pulse bg-[#37d6f5]/80" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------- ABOUT / EXPERIENCE: a museum exhibit ---------- */
export function MuseumExhibit() {
  return (
    <section id="experience" className="relative mx-auto max-w-4xl px-6 py-28">
      <SectionTitle
        kicker="hippocampus · long-term storage"
        title="The exhibit of experience"
        sub="Five artifacts, catalogued in the order they shaped the mind."
      />
      <div className="space-y-6">
        {EXPERIENCE.map((e, i) => (
          <motion.article
            key={`${e.company}-${e.role}`}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: i * 0.05 }}
            className="plaque relative rounded-lg border border-[#3a3428] p-6 sm:p-8"
          >
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.35em] text-[#b8a380]">
              exhibit {String(i + 1).padStart(2, "0")} · {e.period}
            </div>
            <h3 className="font-display text-xl font-semibold text-[#efe9dc]">
              {e.role}
              <span className="text-[#b8a380]"> — {e.company}</span>
            </h3>
            <ul className="mt-4 space-y-2.5">
              {e.bullets.map((b, j) => (
                <li key={j} className="flex gap-3 text-sm leading-relaxed text-[#c9c2b2]">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#d98a4a]" />
                  {b}
                </li>
              ))}
            </ul>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

/* ---------- CONTACT: the core / futuristic terminal ---------- */
const TERMINAL_LINES = [
  { text: "keneisha@mind:~$ contact --list", cmd: true },
  { text: "  email     kbaid@uwaterloo.ca" },
  { text: "  linkedin  /in/keneisha-baid" },
  { text: "  github    github.com/Keneisha3" },
  { text: "keneisha@mind:~$ status", cmd: true },
  { text: "  open to: fintech · data · product" },
  { text: "keneisha@mind:~$ █", cmd: true },
];

export function CoreTerminal() {
  const [shown, setShown] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          let i = 0;
          const t = setInterval(() => {
            i++;
            setShown(i);
            if (i >= TERMINAL_LINES.length) clearInterval(t);
          }, 340);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="contact" className="relative mx-auto max-w-3xl px-6 py-28 pb-40">
      <SectionTitle
        kicker="the core"
        title="Reach the processor"
        sub="Every signal ends up here eventually."
      />
      <motion.div {...fadeUp} ref={ref} className="overflow-hidden rounded-xl border border-[#37d6f5]/30 bg-[#04070b] shadow-[0_0_60px_rgba(55,214,245,0.12)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-[11px] text-[#8b8fa3]">core — zsh</span>
        </div>
        <div className="min-h-[220px] p-5 font-mono text-sm leading-7">
          {TERMINAL_LINES.slice(0, shown).map((l, i) => (
            <div key={i} className={l.cmd ? "text-[#37d6f5]" : "text-[#c6e9f2]"}>
              {l.text}
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div {...fadeUp} className="mt-8 flex flex-wrap justify-center gap-4">
        <a
          href={`mailto:${PROFILE.email}`}
          className="rounded-full bg-[#37d6f5] px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-black transition-transform hover:scale-105"
        >
          send signal
        </a>
        <a
          href={PROFILE.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-white/20 px-6 py-3 font-mono text-xs uppercase tracking-widest text-[#e8e4dc] transition-colors hover:border-[#37d6f5] hover:text-[#37d6f5]"
        >
          linkedin
        </a>
        <a
          href={PROFILE.github}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-white/20 px-6 py-3 font-mono text-xs uppercase tracking-widest text-[#e8e4dc] transition-colors hover:border-[#37d6f5] hover:text-[#37d6f5]"
        >
          github
        </a>
        <a
          href={`https://open.spotify.com/playlist/${PLAYLIST.spotifyId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-white/20 px-6 py-3 font-mono text-xs uppercase tracking-widest text-[#8b8fa3] transition-colors hover:border-[#d98a4a] hover:text-[#ffb070]"
        >
          ♪ what the mind runs on
        </a>
      </motion.div>
      <p className="mt-16 text-center font-mono text-[11px] text-[#4a4f60]">
        © {new Date().getFullYear()} {PROFILE.name} · bust: “Marble Bust 01”, Poly Haven (CC0)
      </p>
    </section>
  );
}
