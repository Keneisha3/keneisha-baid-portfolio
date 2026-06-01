import { motion } from "framer-motion";
import Reveal from "./Reveal";
import { PROFILE } from "../data/portfolio";

const BUTTONS = [
  {
    label: "Email",
    href: `mailto:${PROFILE.email}`,
    primary: true,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z" />
    ),
  },
  {
    label: "LinkedIn",
    href: PROFILE.linkedin,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4zM8 11v6M8 8v.01M12 17v-3a2 2 0 014 0v3" />
    ),
  },
  {
    label: "GitHub",
    href: PROFILE.github,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 00-1.3-3.2 4.3 4.3 0 00-.1-3.2s-1-.3-3.5 1.3a12 12 0 00-6.3 0C6.5 2.8 5.5 3.1 5.5 3.1a4.3 4.3 0 00-.1 3.2A4.6 4.6 0 004 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    ),
  },
];

export default function Contact() {
  return (
    <section id="contact" className="relative overflow-hidden px-6 py-32 md:px-12">
      <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,182,213,0.55),transparent_70%),radial-gradient(40%_40%_at_80%_20%,rgba(251,113,133,0.30),transparent_70%)] bg-[length:200%_200%]" />
      <div className="pointer-events-none absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-pink-400/60"
            style={{ left: `${15 + i * 13}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="font-display text-4xl font-semibold tracking-tight text-plum-900 sm:text-6xl">
            Let's build <span className="gradient-text">something</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-plum-700/80">
            I'm always happy to talk, and always interested in building something
            cool! Let's connect :)
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {BUTTONS.map((b) => (
              <a
                key={b.label}
                href={b.href}
                target={b.href.startsWith("mailto") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-base font-semibold transition-all hover:scale-105 ${
                  b.primary
                    ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30 hover:bg-pink-400"
                    : "border border-pink-300 bg-white/70 text-plum-700 hover:border-pink-500 hover:text-pink-600"
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  {b.icon}
                </svg>
                {b.label}
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-16 text-sm text-plum-700/50">
            © {new Date().getFullYear()} {PROFILE.name}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
