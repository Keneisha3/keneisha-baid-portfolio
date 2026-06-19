import { motion } from "framer-motion";
import Reveal from "./Reveal";
import { TOOLKIT } from "../data/portfolio";

export default function Skills() {
  return (
    <section id="skills" className="section-pad mx-auto max-w-5xl">
      <Reveal>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-pink-600">
          Skills &amp; toolkit
        </p>
        <h2 className="section-title">Things I've worked with</h2>
        <p className="mt-4 max-w-2xl text-lg text-plum-700/80">
          Languages, libraries, and tools I've used across school, internships,
          and personal projects. Still learning plenty of them.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {TOOLKIT.map((cat, ci) => (
          <Reveal key={cat.group} delay={ci * 0.05}>
            <div className="h-full rounded-2xl border border-blush-200 bg-white p-6 shadow-sm transition-colors hover:border-pink-300">
              <div className="mb-4 flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${ci % 2 === 0 ? "bg-pink-500" : "bg-rose-500"}`} />
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-plum-700/70">
                  {cat.group}
                </h3>
                <span className="ml-auto text-xs font-medium text-plum-700/40">
                  {cat.items.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((tool, i) => (
                  <motion.span
                    key={tool}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.02, ease: "easeOut" }}
                    className="rounded-lg bg-blush-100 px-3 py-1.5 text-sm font-medium text-plum-700"
                  >
                    {tool}
                  </motion.span>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
