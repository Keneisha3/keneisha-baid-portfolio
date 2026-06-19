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

      <div className="mt-12 space-y-8">
        {TOOLKIT.map((cat, ci) => (
          <Reveal key={cat.group} delay={ci * 0.05}>
            <div className="grid gap-3 border-t border-blush-200 pt-6 sm:grid-cols-[200px,1fr]">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-plum-700/60">
                {cat.group}
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {cat.items.map((tool, i) => (
                  <motion.span
                    key={tool}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.025, ease: "easeOut" }}
                    className="pill"
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
