import { motion } from "framer-motion";
import Reveal from "./Reveal";
import { PROJECTS } from "../data/portfolio";

function ProjectCard({ project, index }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
      whileHover={{ y: -6 }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-white p-6 shadow-md transition-colors ${
        project.comingSoon
          ? "border-dashed border-pink-300 shadow-pink-500/10 hover:border-pink-400"
          : project.featured
          ? "border-pink-300 shadow-lg shadow-pink-500/20 ring-1 ring-pink-200 hover:border-pink-400"
          : "border-pink-100 shadow-pink-500/10 hover:border-pink-300"
      }`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blush-200 blur-2xl transition-opacity duration-300 group-hover:bg-blush-300" />

      {project.featured && (
        <span className="relative mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 px-3 py-1 text-xs font-semibold text-white">
          <span aria-hidden>★</span>
          Featured
        </span>
      )}

      {project.comingSoon && (
        <span className="relative mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-pink-500 px-3 py-1 text-xs font-semibold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          Currently building
        </span>
      )}

      {project.badge && !project.comingSoon && (
        <span className="relative mb-3 inline-flex w-fit items-center rounded-full border border-pink-200 bg-blush-100 px-3 py-1 text-xs font-semibold text-pink-700">
          {project.badge}
        </span>
      )}

      <h3 className="relative font-display text-xl font-semibold text-plum-900">
        {project.title}
      </h3>
      <p className="relative mt-3 flex-1 text-sm leading-relaxed text-plum-700/80">
        {project.description}
      </p>

      <div className="relative mt-5 flex flex-wrap gap-2">
        {project.tech.map((t) => (
          <span
            key={t}
            className="rounded-full border border-pink-200 bg-blush-100 px-2.5 py-1 text-xs font-medium text-pink-700"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="relative mt-6 flex flex-wrap gap-3">
        {project.links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.href === "#" ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-blush-100 px-4 py-2 text-sm font-medium text-plum-700 transition-colors hover:bg-pink-500 hover:text-white"
          >
            {link.label}
            <span aria-hidden>↗</span>
          </a>
        ))}
      </div>
    </motion.article>
  );
}

export default function Projects() {
  return (
    <section id="projects" className="section-pad mx-auto max-w-7xl">
      <Reveal>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-pink-600">
          Things I've built
        </p>
        <h2 className="section-title">Projects</h2>
        <p className="mt-4 max-w-2xl text-lg text-plum-700/80">
          Some of the things I've built recently. Click through to take a closer look.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((p, i) => (
          <ProjectCard key={p.title} project={p} index={i} />
        ))}
      </div>
    </section>
  );
}
