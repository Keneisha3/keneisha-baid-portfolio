// Reads your resume for Claude. Accepts plain text or your LaTeX source (.tex)
// directly, so you can drop in the same file you compile to PDF.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./paths.js";

const CANDIDATES = ["config/resume.tex", "config/resume.txt"];

export function loadResumeText(profile = {}) {
  if (profile.resumeText) return profile.resumeText;
  for (const rel of [profile.resumeTextPath, ...CANDIDATES].filter(Boolean)) {
    const p = path.resolve(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    return /\\begin\{document\}/.test(raw) ? latexToText(raw) : raw;
  }
  return "";
}

/** Reads one {balanced} group starting at s[i] === "{". Returns [content, indexAfter]. */
function group(s, i) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "\\") { j++; continue; }
    if (s[j] === "{") depth++;
    else if (s[j] === "}" && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  return [s.slice(i + 1), s.length];
}

// Macro name -> [number of {args}, formatter]. Covers Jake's-resume-style templates.
const MACROS = {
  section: [1, ([t]) => `\n\n${t.toUpperCase()}\n`],
  resumeItem: [1, ([t]) => `\n- ${t}`],
  resumeSubItem: [1, ([t]) => `\n- ${t}`],
  resumeOneLine: [3, ([org, role, dates]) => `\n\n${org}, ${role} (${dates})`],
  resumeSubheading: [4, ([a, b, c, d]) => `\n\n${a} (${b})${c ? `\n${c}` : ""}${d ? `, ${d}` : ""}`],
  resumeSubheadingTight: [4, ([a, b, c, d]) => `\n\n${a} (${b})${c ? `\n${c}` : ""}${d ? `, ${d}` : ""}`],
  resumeProjectHeading: [2, ([a, b]) => `\n\n${a}${b ? ` (${b})` : ""}`],
  resumeRole: [2, ([a, b]) => `\n${a} (${b})`],
  href: [2, ([, text]) => text],
  textbf: [1, ([t]) => t], textit: [1, ([t]) => t], emph: [1, ([t]) => t], underline: [1, ([t]) => t], uline: [1, ([t]) => t],
  small: [0, () => ""], item: [0, () => "\n"],
};

function expand(s) {
  let out = "";
  for (let i = 0; i < s.length; ) {
    const ch = s[i];
    if (ch === "%") { while (i < s.length && s[i] !== "\n") i++; continue; }
    if (ch === "$") { i++; continue; }
    if (ch === "{" || ch === "}") { i++; continue; }
    if (ch !== "\\") { out += ch; i++; continue; }
    const next = s[i + 1];
    if (next === "\\") { out += "\n"; i += 2; while (s[i] === "[") { const k = s.indexOf("]", i); i = k < 0 ? i + 1 : k + 1; } continue; }
    if ("&%$#_".includes(next)) { out += next; i += 2; continue; }
    const m = /^[a-zA-Z@]+\*?/.exec(s.slice(i + 1));
    if (!m) { i += 2; continue; }
    const name = m[0];
    i += 1 + name.length;
    if (["begin", "end", "vspace", "hspace", "fontsize", "label"].includes(name.replace("*", ""))) {
      // Drop the command and its arguments entirely.
      while (s[i] === " ") i++;
      while (s[i] === "{" || s[i] === "[") {
        if (s[i] === "[") { const k = s.indexOf("]", i); i = k < 0 ? s.length : k + 1; }
        else i = group(s, i)[1];
      }
      continue;
    }
    const spec = MACROS[name];
    if (!spec) continue; // unknown command (e.g. \centering): drop the name, keep any text that follows
    const args = [];
    for (let a = 0; a < spec[0]; a++) {
      while (/\s/.test(s[i] || "")) i++;
      if (s[i] !== "{") break;
      const [content, end] = group(s, i);
      args.push(expand(content).trim());
      i = end;
    }
    out += spec[1](args);
  }
  return out;
}

export function latexToText(tex) {
  // If several documents were pasted together, use the last (most recent) one.
  const start = tex.lastIndexOf("\\begin{document}");
  const end = tex.indexOf("\\end{document}", start);
  const body = tex.slice(start >= 0 ? start + 16 : 0, end >= 0 ? end : undefined);
  return expand(body)
    .replace(/--/g, "–")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
