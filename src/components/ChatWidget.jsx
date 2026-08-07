import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CHAT_KB } from "../data/portfolio";

const GREETING = {
  role: "assistant",
  content:
    "Hey! I'm Keneisha's assistant. Ask me about her projects, experience, skills, what she's aiming for, or what she's into outside of work.",
};

const QUICK_REPLIES = [
  "Her projects",
  "Experience",
  "Skills",
  "What does she want to do?",
  "Her interests",
  "How to contact her",
];

// ---- lightweight intent handling for small talk ----
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "of", "to", "and", "or", "in", "on",
  "for", "with", "she", "her", "he", "his", "they", "it", "that", "this", "what",
  "whats", "who", "how", "why", "when", "where", "do", "does", "did", "can", "could",
  "would", "you", "your", "me", "my", "i", "about", "tell", "give", "please", "some",
  "any", "there", "their", "at", "as", "be", "by", "so", "if", "im",
]);

const anyOf = (text, words) => words.some((w) => text.includes(w));

function smallTalk(text) {
  const t = ` ${text} `;
  if (/^\s*(hi|hii|hey|heya|hello|hiya|yo|sup|hi there|good (morning|afternoon|evening))\b/.test(text))
    return "Hey there! 👋 Want to hear about Keneisha's projects, her experience, or what she does for fun?";
  if (anyOf(t, ["thank", "thx", " ty ", "appreciate"]))
    return "Anytime! Anything else you'd like to know about Keneisha?";
  if (anyOf(t, ["bye", "goodbye", "see ya", "later", "cya"]))
    return "Take care! If you want to reach Keneisha directly, she's at kbaid@uwaterloo.ca.";
  if (/how are you|how's it going|how are u|whats up|what's up|wassup/.test(text))
    return "Doing great, thanks for asking! I'm here to tell you all about Keneisha — what would you like to know?";
  if (/who are you|what are you|are you (a )?(bot|ai|robot)|your name/.test(text))
    return "I'm a little assistant built into Keneisha's portfolio to answer questions about her work and interests. Ask away!";
  if (/^\s*(ok|okay|cool|nice|great|awesome|got it|thanks)\s*$/.test(text))
    return "👍 Ask me anything else — projects, experience, skills, or what she's into.";
  return null;
}

// ---- keyword scoring over the knowledge base ----
function scoreEntry(entry, text, tokens) {
  let score = 0;
  for (const kw of entry.keywords) {
    if (kw.includes(" ")) {
      if (text.includes(kw)) score += 3; // phrase match — strong signal
    } else {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (re.test(text)) score += 2; // whole-word match
      else if (kw.length > 4 && text.includes(kw)) score += 1; // substring fallback
    }
  }
  for (const tok of tokens) {
    if (entry.keywords.some((kw) => kw === tok)) score += 0.5;
  }
  return score;
}

function answerFor(text) {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s']/g, " ").replace(/\s+/g, " ").trim();

  const st = smallTalk(clean);
  if (st) return { content: st, suggestions: null };

  const tokens = clean.split(" ").filter((w) => w && !STOPWORDS.has(w));

  let best = null;
  let bestScore = 0;
  for (const entry of CHAT_KB) {
    const s = scoreEntry(entry, clean, tokens);
    if (s > bestScore) {
      bestScore = s;
      best = entry;
    }
  }

  // Confident match — answer directly.
  if (best && bestScore >= 2) {
    return { content: best.answer, suggestions: null };
  }

  // Weak-but-plausible match — take a best guess and offer to narrow down,
  // rather than dead-ending.
  if (best && bestScore >= 1) {
    return {
      content: `${best.answer}\n\n(If that's not quite what you meant, ask me something more specific!)`,
      suggestions: null,
    };
  }

  // Truly nothing — stay helpful and point to the real person.
  return {
    content:
      "I'm not totally sure on that one — I know Kenny's work best. Try one of these, or reach her directly at kbaid@uwaterloo.ca:",
    suggestions: ["Her projects", "Experience", "Skills", "What does she want to do?", "Her interests"],
  };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(QUICK_REPLIES);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, suggestions]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const respond = (text) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setMessages((m) => [...m, { role: "user", content: clean }]);
    setInput("");
    setSuggestions(null);
    setLoading(true);
    const { content, suggestions: nextSuggestions } = answerFor(clean);
    const delay = 380 + Math.min(clean.length * 6, 500);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", content }]);
      setSuggestions(nextSuggestions);
      setLoading(false);
    }, delay);
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Ask about Keneisha"}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF0CA] text-[#0D3B66] shadow-lg shadow-black/20"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.svg
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </motion.svg>
          ) : (
            <motion.svg
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h8M8 14h5M21 12a8 8 0 01-11.6 7.1L4 20l1-4.4A8 8 0 1121 12z"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 flex h-[540px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl shadow-black/20"
          >
            <div className="flex items-center gap-3 border-b border-[#0D3B66]/15 bg-[#FAF0CA] px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#0D3B66]">
                KB
              </div>
              <div>
                <div className="text-sm font-semibold text-[#0D3B66]">Ask about Keneisha</div>
                <div className="flex items-center gap-1.5 text-xs text-[#0D3B66]/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Usually instant
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#faf9f7] px-4 py-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[82%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-md bg-[#FAF0CA] text-[#0D3B66]"
                        : "rounded-bl-md border border-black/10 bg-white text-[#0D3B66]"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-black/10 bg-white px-4 py-3">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="h-2 w-2 rounded-full bg-black/40"
                        animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* contextual suggestion chips */}
              {suggestions && !loading && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => respond(q)}
                      className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#0D3B66] transition-colors hover:border-black/40 hover:bg-black/[0.03]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                respond(input);
              }}
              className="flex items-center gap-2 border-t border-black/10 bg-white px-3 py-3"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything…"
                className="flex-1 rounded-full border border-black/15 bg-[#faf9f7] px-4 py-2.5 text-sm text-[#0D3B66] placeholder-black/35 outline-none focus:border-black/50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF0CA] text-[#0D3B66] transition-colors hover:bg-[#FAF0CA]/70 disabled:opacity-30"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
