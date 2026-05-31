import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Reveal from "./Reveal";
import { EXPERIENCE } from "../data/portfolio";

function TimelineItem({ item, index, isOpen, onToggle }) {
  return (
    <div className="relative pl-12 sm:pl-16">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="absolute left-[10px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-blush-50 sm:left-[18px]"
        style={{ backgroundColor: item.color }}
      >
        <span className="h-2 w-2 rounded-full bg-white" />
      </button>

      <Reveal delay={index * 0.05}>
        <div
          className={`group cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition-all sm:p-6 ${
            isOpen
              ? "border-pink-300 shadow-md shadow-pink-500/10"
              : "border-pink-100 hover:border-pink-200"
          }`}
          onClick={onToggle}
        >
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div>
              <h3 className="font-display text-lg font-semibold text-plum-900">
                {item.role}{" "}
                <span className="text-plum-700/60">· {item.company}</span>
              </h3>
              <p className="mt-0.5 text-sm font-medium" style={{ color: item.color }}>
                {item.period}
              </p>
            </div>
            <motion.span
              animate={{ rotate: isOpen ? 45 : 0 }}
              className="mt-1 text-2xl leading-none text-pink-300 group-hover:text-pink-500"
            >
              +
            </motion.span>
          </div>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-3 border-t border-pink-100 pt-4">
                  {item.bullets.map((b, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-plum-700/80">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </div>
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </Reveal>
    </div>
  );
}

export default function Timeline() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="experience" className="section-pad mx-auto max-w-4xl">
      <Reveal>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-pink-600">
          Where I've worked
        </p>
        <h2 className="section-title">Experience</h2>
        <p className="mt-4 max-w-2xl text-lg text-plum-700/80">
          Tap any role to see the details.
        </p>
      </Reveal>

      <div className="relative mt-12">
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-pink-400 via-rose-300 to-transparent sm:left-[27px]" />
        <div className="space-y-5">
          {EXPERIENCE.map((item, i) => (
            <TimelineItem
              key={`${item.company}-${item.role}`}
              item={item}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
