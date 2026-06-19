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
    <div className="mx-auto h-px max-w-7xl bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
  );
}

// Tiny hash-based router so "Life" lives on its own page (#/life).
function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export default function App() {
  const route = useHashRoute();
  const isLife = route.startsWith("#/life");

  // Jump to top when switching between the home page and the Life page.
  useEffect(() => {
    if (route === "#/life" || route === "#/") window.scrollTo(0, 0);
  }, [route]);

  return (
    <div className="relative min-h-screen bg-blush-50 text-plum-700">
      <Navbar />
      {isLife ? (
        <main>
          <Interests standalone />
          <Contact />
        </main>
      ) : (
        <main>
          <Hero />
          <Skills />
          <Divider />
          <Timeline />
          <Divider />
          <Projects />
          <Divider />
          <Interests />
          <Contact />
        </main>
      )}
      <ChatWidget />
    </div>
  );
}
