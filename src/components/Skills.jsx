import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import Reveal from "./Reveal";
import { SKILLS_RADAR, TOOLKIT } from "../data/portfolio";

export default function Skills() {
  return (
    <section id="skills" className="section-pad mx-auto max-w-7xl">
      <Reveal>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-pink-600">
          Skills &amp; toolkit
        </p>
        <h2 className="section-title">What I work with</h2>
        <p className="mt-4 max-w-2xl text-lg text-plum-700/80">
          A snapshot of what I'm strongest at, plus the tools I reach for day to day.
        </p>
      </Reveal>

      <div className="mt-14 grid items-start gap-10 lg:grid-cols-2">
        <Reveal>
          <div className="relative rounded-3xl border border-pink-100 bg-white p-4 shadow-md shadow-pink-500/10 sm:p-8">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(50%_50%_at_50%_50%,rgba(236,72,153,0.06),transparent_70%)]" />
            <div className="h-[360px] w-full sm:h-[440px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={SKILLS_RADAR} outerRadius="72%">
                  <defs>
                    <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#EC4899" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#FB7185" stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <PolarGrid stroke="rgba(236,72,153,0.18)" />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: "#5A3149", fontSize: 12, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fill: "rgba(90,49,73,0.35)", fontSize: 10 }}
                    axisLine={false}
                  />
                  <Radar
                    name="Proficiency"
                    dataKey="value"
                    stroke="#EC4899"
                    strokeWidth={2}
                    fill="url(#radarFill)"
                    fillOpacity={0.7}
                    isAnimationActive
                    animationDuration={1200}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(236,72,153,0.25)" }}
                    contentStyle={{ background: "#ffffff", border: "1px solid #FFC4DA" }}
                    labelStyle={{ color: "#3A1E32" }}
                    itemStyle={{ color: "#EC4899" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="space-y-7">
            {TOOLKIT.map((cat, ci) => (
              <div key={cat.group}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-plum-700/60">
                  {cat.group}
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {cat.items.map((tool, i) => (
                    <motion.span
                      key={tool}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: ci * 0.05 + i * 0.03, ease: "easeOut" }}
                      className="pill pill-glow"
                    >
                      {tool}
                    </motion.span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
