import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Skills from "./components/Skills";
import Timeline from "./components/Timeline";
import Projects from "./components/Projects";
import Interests from "./components/Interests";
import Contact from "./components/Contact";
import ChatWidget from "./components/ChatWidget";

// Soft divider between sections.
function Divider() {
  return (
    <div className="mx-auto h-px max-w-7xl bg-gradient-to-r from-transparent via-blush-200 to-transparent" />
  );
}

// Tiny hash-based router: main scrolling page, plus a separate Life page.
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHashRoute();
  const route = (hash.replace(/^#\/?/, "") || "home").toLowerCase();
  const isLife = route === "life";

  // Jump to top when switching between the main page and the Life page.
  useEffect(() => {
    if (route === "life" || route === "home" || route === "") {
      window.scrollTo(0, 0);
    }
  }, [route]);

  return (
    <div className="relative min-h-screen bg-blush-50 text-plum-700">
      <Navbar route={route} />
      {isLife ? (
        <main className="pt-20">
          <Interests standalone />
          <Contact />
        </main>
      ) : (
        <main>
          <Hero />
          <Projects />
          <Divider />
          <Timeline />
          <Divider />
          <Skills />
          <Contact />
        </main>
      )}
      <ChatWidget />
    </div>
  );
}
