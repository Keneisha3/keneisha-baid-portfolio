import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const LINKS = [
  { route: "home", href: "/#projects", label: "Projects" },
  { route: "home", href: "/#experience", label: "Experience" },
  { route: "home", href: "/#skills", label: "Skills" },
  { route: "life", href: "#/life", label: "Playground" },
  { route: "home", href: "/#contact", label: "Contact" },
];

export default function Navbar({ route = "home" }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [route]);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled || menuOpen
          ? "border-b border-blush-200 bg-blush-50/90 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">
        <a
          href="#/"
          className="font-display text-xl font-semibold tracking-tight text-plum-900"
        >
          Keneisha<span className="gradient-text"> Baid</span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = l.route === "life" && route === "life";
            return (
              <li key={l.route}>
                <a
                  href={l.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-pink-500 text-white"
                      : "text-plum-700/70 hover:bg-blush-100 hover:text-pink-600"
                  }`}
                >
                  {l.label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* Mobile toggle */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          className="flex h-10 w-10 items-center justify-center rounded-full text-plum-900 md:hidden"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {menuOpen ? (
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <ul className="flex flex-col gap-1 px-6 pb-4 md:hidden">
          {LINKS.map((l) => {
            const active = l.route === "life" && route === "life";
            return (
              <li key={l.route}>
                <a
                  href={l.href}
                  className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-pink-500 text-white"
                      : "text-plum-700/80 hover:bg-blush-100"
                  }`}
                >
                  {l.label}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </motion.header>
  );
}
