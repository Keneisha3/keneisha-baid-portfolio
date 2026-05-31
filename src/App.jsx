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

export default function App() {
  return (
    <div className="relative min-h-screen bg-blush-50 text-plum-700">
      <Navbar />
      <main>
        <Hero />
        <Interests />
        <Divider />
        <Skills />
        <Divider />
        <Timeline />
        <Divider />
        <Projects />
        <Contact />
      </main>
      <ChatWidget />
    </div>
  );
}
