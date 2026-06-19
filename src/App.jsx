import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Skills from "./components/Skills";
import Timeline from "./components/Timeline";
import Projects from "./components/Projects";
import Interests from "./components/Interests";
import Contact from "./components/Contact";
import ChatWidget from "./components/ChatWidget";

// Tiny hash-based router so each nav item is its own page (#/skills, #/work, ...).
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

// Pushes page content below the fixed navbar.
function Page({ children }) {
  return <main className="pt-20">{children}</main>;
}

export default function App() {
  const hash = useHashRoute();
  const route = (hash.replace(/^#\/?/, "") || "home").toLowerCase();

  // Always start a freshly-loaded page at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  let page;
  switch (route) {
    case "skills":
      page = (
        <Page>
          <Skills />
        </Page>
      );
      break;
    case "experience":
      page = (
        <Page>
          <Timeline />
        </Page>
      );
      break;
    case "work":
    case "projects":
      page = (
        <Page>
          <Projects />
        </Page>
      );
      break;
    case "life":
      page = (
        <Page>
          <Interests standalone />
        </Page>
      );
      break;
    case "contact":
      page = (
        <Page>
          <Contact />
        </Page>
      );
      break;
    default:
      // Home: hero + short previews that link into the dedicated pages.
      page = (
        <main>
          <Hero />
        </main>
      );
  }

  return (
    <div className="relative min-h-screen bg-blush-50 text-plum-700">
      <Navbar route={route} />
      {page}
      <ChatWidget />
    </div>
  );
}
