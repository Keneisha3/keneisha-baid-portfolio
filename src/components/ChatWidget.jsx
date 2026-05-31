import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CHAT_KB } from "../data/portfolio";

const GREETING = {
  role: "assistant",
  content:
    "Hi there! Ask me anything about Keneisha's projects and experience, or what she's into outside of work. What would you like to know?",
};

const QUICK_REPLIES = [
  "Her projects",
  "Experience",
  "Skills",
  "Her interests",
  "How to contact her",
];

// Pick the best knowledge-base answer for a question (simple keyword scoring).
function answerFor(text) {
  const q = " " + text.toLowerCase().replace(/[^a-z0-9\s]/g, " ") + " ";
  let best = null;
  let bestScore = 0;
  for (const entry of CHAT_KB) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(" " + kw + " ") || q.includes(kw)) {
        score += kw.includes(" ") ? 2 : 1; // multi-word keywords weigh more
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  if (best && bestScore > 0) return best.answer;
  return "I'm not totally sure about that one! Try asking about her projects, experience, skills, or interests, or email her directly at kbaid@uwaterloo.ca.";
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const respond = (text) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setMessages((m) => [...m, { role: "user", content: clean }]);
    setInput("");
    setLoading(true);
    // Small, natural-feeling delay before the reply.
    const reply = answerFor(clean);
    const delay = 450 + Math.min(reply.length * 8, 900);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      setLoading(false);
    }, delay);
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/40"
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
            className="fixed bottom-24 right-6 z-50 flex h-[540px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-pink-200 bg-white shadow-2xl shadow-pink-500/20"
          >
            <div className="flex items-center gap-3 border-b border-pink-100 bg-gradient-to-r from-pink-400 to-rose-400 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-sm font-bold text-white">
                KB
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Ask about Keneisha
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> Always around
                </div>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-blush-50 px-4 py-4"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-md bg-pink-500 text-white"
                        : "rounded-bl-md border border-pink-100 bg-white text-plum-700"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-pink-100 bg-white px-4 py-3">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="h-2 w-2 rounded-full bg-pink-400"
                        animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick replies shown only at the start of the conversation */}
              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => respond(q)}
                      className="rounded-full border border-pink-200 bg-white px-3 py-1.5 text-xs font-medium text-pink-600 transition-colors hover:bg-pink-50"
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
              className="flex items-center gap-2 border-t border-pink-100 bg-white px-3 py-3"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me something…"
                className="flex-1 rounded-full border border-pink-200 bg-blush-50 px-4 py-2.5 text-sm text-plum-900 placeholder-plum-700/40 outline-none focus:border-pink-400"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-500 text-white transition-colors hover:bg-pink-400 disabled:opacity-40"
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
