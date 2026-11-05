// Drafting. Every draft is saved for you to review/edit before it's used.
// Engines (profile.json "ai", or JHA_AI):
//   "claude-code" uses your Claude Pro/Max subscription through the `claude` CLI (no API key)
//   "api"         Anthropic API key (pay per use)
//   "template"    free, offline, built from your profile's highlights and angles
//   "auto"        api if a key is set, otherwise template
// For free claude.ai chat there's also the copy-paste prompt pack (src/manual.js).
import os from "node:os";
import { execFile } from "node:child_process";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { loadResumeText } from "./resume.js";

const MODEL = process.env.JHA_MODEL || "claude-opus-5-5";
// LinkedIn caps connection-request notes at 300 characters (200 on some free accounts).
export const NOTE_LIMIT = Number(process.env.JHA_NOTE_LIMIT || 300);

let client;
const hasApiKey = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
function getClient() {
  client ??= new Anthropic();
  return client;
}

export function engineFor(profile = {}) {
  if (process.env.JHA_NO_AI) return "template";
  const e = process.env.JHA_AI || profile.ai || "auto";
  if (e === "auto") return hasApiKey() ? "api" : "template";
  return e;
}
export const canResearch = (profile) => ["api", "claude-code"].includes(engineFor(profile));

/** Runs the Claude Code CLI headlessly. Uses whatever account `claude` is logged in with. */
export function runClaudeCode(prompt, { schema, tools = "" } = {}) {
  const args = ["-p", "--output-format", "json", "--no-session-persistence", "--tools", tools];
  if (tools) args.push("--allowedTools", tools);
  if (schema) args.push("--json-schema", JSON.stringify(schema));
  if (process.env.JHA_MODEL) args.push("--model", process.env.JHA_MODEL);
  return new Promise((resolve, reject) => {
    const child = execFile(process.env.JHA_CLAUDE_BIN || "claude", args, { cwd: os.tmpdir(), maxBuffer: 50e6, timeout: 6 * 60_000 }, (err, stdout, stderr) => {
      if (err && !stdout) {
        const msg = err.code === "ENOENT" ? "the `claude` command isn't installed (npm install -g @anthropic-ai/claude-code, then run `claude` once to log in)" : (stderr || err.message).trim().slice(0, 300);
        return reject(new Error(msg));
      }
      let out;
      try { out = JSON.parse(stdout); } catch { return reject(new Error(`unexpected output from claude: ${stdout.slice(0, 200)}`)); }
      if (out.is_error) return reject(new Error(`claude: ${String(out.result || out.subtype).slice(0, 300)}`));
      resolve(out);
    });
    child.stdin.end(prompt);
  });
}

export const jsonSchemaOf = (schema) => {
  const { $schema, ...rest } = z.toJSONSchema(schema);
  return rest;
};

export function profileBlurb(profile) {
  const resume = loadResumeText(profile);
  return [
    `Name: ${profile.name}`,
    `School/program: ${profile.school}`,
    `Headline: ${profile.headline}`,
    `Highlights:\n- ${(profile.highlights || []).join("\n- ")}`,
    `Skills: ${(profile.skills || []).join(", ")}`,
    profile.voice ? `Writing voice: ${profile.voice}` : "",
    resume ? `Resume:\n${resume}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

const SYSTEM = `You help a student write job applications and networking messages.
Write in their voice: warm, specific, confident, never grovelling or generic.
Only claim experience that appears in their profile; never invent facts, numbers, or mutual connections.
Avoid cliches like "I hope this finds you well", "passionate", "synergy", and em-dash-heavy prose.`;

async function structured(schema, prompt, maxTokens, profile) {
  const engine = engineFor(profile);
  if (engine === "claude-code") {
    const out = await runClaudeCode(`${SYSTEM}\n\n${prompt}`, { schema: jsonSchemaOf(schema) });
    return { data: schema.parse(out.structured_output ?? JSON.parse(out.result)), by: "claude-code" };
  }
  if (engine !== "api") return null;
  const msg = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  if (msg.stop_reason === "refusal") throw new Error("Claude declined this request");
  if (msg.stop_reason === "max_tokens") throw new Error("Draft was cut off (max_tokens)");
  return { data: msg.parsed_output, by: MODEL };
}

// ---------- applications ----------

export const ApplicationDraft = z.object({
  fitScore: z.number().describe("0-100, how well the profile matches the role's must-haves"),
  fitSummary: z.string().describe("2-3 sentences: strongest matches and any real gaps"),
  coverLetter: z.string().describe("Under 250 words, plain text, no placeholders, signed with the candidate's name"),
  whyCompany: z.string().describe("2-4 sentences answering 'Why do you want to work here?'"),
  whyRole: z.string().describe("2-4 sentences answering 'Why are you a fit for this role?'"),
});

export const jobContext = (job, max = 12000) => `Job: ${job.title} at ${job.company} (${job.location || "location not listed"})${job.term ? `\nTerm: ${job.term}` : ""}\n\n${(job.description || job.notes || "(no description saved: infer from the title and company)").slice(0, max)}`;

export async function draftApplication(profile, job, { engine } = {}) {
  const prompt = `Candidate profile:\n${profileBlurb(profile)}\n\n---\n${jobContext(job)}\n\n---\nDraft the application materials.`;
  try {
    const out = engine === "template" ? null : await structured(ApplicationDraft, prompt, 4000, profile);
    if (out) return { ...out.data, by: out.by, at: new Date().toISOString() };
  } catch (e) {
    console.warn(`  (AI draft failed for ${job.company}: ${e.message}; using template)`);
  }
  return templateApplication(profile, job);
}

// ---------- free templates ----------
// Built only from your profile: the highlights most relevant to the posting,
// plus the "angle" you wrote for that kind of role. No facts are made up.

const ANGLE_RULES = [
  ["founding", /founding|founder'?s? associate|chief of staff|first (sales|gtm|ops|engineer|hire)|early[- ]stage generalist/i],
  ["engineering", /engineer|developer|full[- ]?stack|software/i],
  ["airlines", /airline|airport|aviation|aerospace|flight|aircraft|loyalty|network planning|revenue management/i],
  ["sales", /sales|sdr|bdr|business development|account (exec|manag)|partnership|gtm|go-to-market|revenue|customer success|commercial/i],
  ["consulting", /consult|advisory|strategy|transformation/i],
  ["project", /project|program|pmo|coordinator|delivery/i],
  ["finance", /financ|invest|venture|valuation|fp&a|treasury|risk|credit|audit|bank|wealth|capital/i],
  ["operations", /operations|\bops\b|bizops|supply chain|procurement|logistics/i],
  ["data", /data|analytics|analyst|product|insight/i],
];
export function angleFor(profile, ...texts) {
  const t = texts.filter(Boolean).join(" ");
  for (const [key, re] of ANGLE_RULES) if (re.test(t) && profile.angles?.[key]) return profile.angles[key];
  return profile.angles?.general || "";
}

const words = (s = "") => new Set((s.toLowerCase().match(/[a-z][a-z+&]{2,}/g) || []).filter((w) => !STOP.has(w)));
const STOP = new Set("the and for with from that this you your our are was were has have will can into across using used about their they them its it's who what when where which while more most over under than then also".split(" "));
export function rankHighlights(profile, text) {
  const w = words(text);
  return (profile.highlights || []).map((h, i) => ({ h, i, s: [...words(h)].filter((x) => w.has(x)).length }))
    .sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.h);
}

/** A responsibility line from the posting, quoted verbatim, so the letter clearly reads it. */
function keyResponsibility(desc = "") {
  for (const raw of desc.split(/\n|•|(?<=\.)\s+/)) {
    const line = raw.replace(/^[\s\-*•·]+/, "").trim();
    if (line.length >= 30 && line.length <= 150 && /^(you('ll| will)|own|build|support|analy[sz]e|manage|work (closely )?with|help|lead|develop|create|assist|partner|drive|prepare|coordinate|track|research)/i.test(line))
      return line.replace(/[.;:]$/, "");
  }
  return "";
}

const lc1 = (s = "") => s.charAt(0).toLowerCase() + s.slice(1);
const termLine = (profile) => {
  const a = profile.screeningAnswers || {};
  return `I'm available for ${a.termLength || "a 4-month term"} starting ${a.startDate || "January 2027"}${/yes/i.test(a.willingToRelocate || "") ? " and happy to relocate" : ""}.`;
};

function templateApplication(profile, job) {
  const text = `${job.title} ${job.category || ""} ${job.description || ""}`;
  const [h1, h2] = rankHighlights(profile, text);
  const angle = angleFor(profile, job.title, job.category);
  const resp = keyResponsibility(job.description);
  return {
    fitScore: null,
    fitSummary: "Free template draft: picked the highlights that best match this posting. Worth a 30-second personal touch before sending.",
    coverLetter: `Dear ${job.company} team,

I'm applying for the ${job.title} role. I'm ${profile.name}, a ${profile.headline || profile.shortIntro}.${angle ? ` ${angle}` : ""}

Most relevant to this role: ${h1 || ""}.${h2 ? `\nAlso relevant: ${h2}.` : ""}
${resp ? `\nThe posting mentions you'll "${lc1(resp)}". That's the kind of work I've done and want more of.\n` : ""}
${termLine(profile)} I'd love to talk about how I could help.

Thank you,
${profile.name}
${profile.website || ""}`.replace(/\n{3,}/g, "\n\n"),
    whyCompany: `${job.company} is doing the kind of work I want to learn from${job.category ? ` in ${job.category}` : ""}, and the ${job.title} role would let me contribute from day one. ${termLine(profile)}`,
    whyRole: [angle, h1 && `For example: ${h1}.`].filter(Boolean).join(" "),
    by: "template",
    at: new Date().toISOString(),
  };
}

// ---------- outreach ----------

export const OutreachDraft = z.object({
  connectionNote: z.string().describe(`LinkedIn connection note, STRICTLY under ${NOTE_LIMIT} characters including spaces`),
  followUp: z.string().describe("Message to send after they accept: asks for a 15-20 minute coffee chat, gives 2 concrete things to ask about, offers flexibility. Under 90 words."),
  nudge: z.string().describe("Polite one-line follow-up if no reply after a week. Under 40 words."),
  emailSubject: z.string().describe("Under 8 words, specific to them (their product, team or news), never generic like 'Internship inquiry'"),
  emailBody: z.string().describe("Email 1, under 130 words, plain text, following the VALUE-FIRST structure"),
  emailFollowUp1: z.string().describe("Day 4-5 reply in the same thread, under 70 words: adds ONE new useful thing (a sharper version of the idea, a relevant portfolio link, a question about their roadmap). Never 'just checking in'."),
  emailFollowUp2: z.string().describe("Day 10-12 reply, under 45 words: closes the loop gracefully, offers the easiest possible yes (e.g. a 10-minute call or forwarding to the right person), and says she won't follow up again."),
});

export const OUTREACH_GUIDE = `VALUE-FIRST cold outreach rules:
1. Hook (1 sentence): something specific and recent about THEM from the research (a launch, hire, expansion, post, metric). If research is empty, use what's genuinely known (product, stage, market). Never fake familiarity or flatter.
2. Bridge (1-2 sentences): the ONE proof point from her background that maps to their likely problem, with a number.
3. Value (1-2 sentences): a concrete, small idea or offer for them: e.g. "I sketched how I'd automate X" ONLY if offering to do it, phrased as an offer ("happy to send a one-page take on..."). Never claim she already made something she didn't.
4. Ask (1 sentence): specific and easy. Startups: a Winter 2027 (Jan-Apr) internship pitched as a project she'd own. Large companies: a 15-minute chat or a referral/pointer to the right team or recruiter, plus the posting if one exists.
5. Logistics line: Waterloo co-op, 4 months from January 2027, open to relocating (and for UK roles: she'd sort her own UK work authorization; never state a visa she doesn't hold).
6. Close with her name, portfolio link, and an easy opt-out ("if this isn't on your radar, a quick no is totally fine").
For FOUNDING roles (founding engineer/GTM, founder's associate, chief of staff) or very early startups (<15 people): lead with something she has actually built or shipped and link it; offer to build or do one small, specific thing for them in a week (a prototype, a pipeline list, a teardown) ONLY as an offer; ask for a Winter 2027 (Jan-Apr) trial internship that could turn into a full-time founding role after she graduates in 2027. Email a founder directly.
Tone: peer-to-peer, short sentences, no "I hope this email finds you well", no "passionate", no wall of credentials, no attachments.`;

export const contactContext = (profile, contact, job) => `Recipient: ${contact.name}, ${contact.title || "?"} at ${contact.company || "?"}
Why them: ${contact.reason || "works in a field the sender is targeting"}
${contact.notes ? `Notes about them: ${contact.notes}` : ""}
${job ? `Related role the sender is applying to: ${job.title} at ${job.company}` : ""}
Sender's coffee-chat goal: ${profile.outreachGoal || "learn about their path and the team, and get advice"}
Sender's job-search ask: ${profile.jobAsk || "a Winter 2027 (January to April) internship or co-op"}
Sender's portfolio: ${profile.website || profile.linkedin}
If the recipient is a company inbox or team rather than a named person, greet the team and skip personal references.

---
${contact.companySize ? `Company size: ${contact.companySize}` : ""}${contact.region === "uk" ? "\nThis is a London/UK company." : ""}
Research on them (may be empty):\n${contact.research || "(none)"}
`;

export async function draftOutreach(profile, contact, job, { engine } = {}) {
  const prompt = `Sender:\n${profileBlurb(profile)}\n\n---\n${contactContext(profile, contact, job)}\n${OUTREACH_GUIDE}\n\nDraft the LinkedIn messages and the 3-email sequence. Reference something specific to the recipient when the research or notes allow, and a genuine shared link (school, field, role) when one exists.`;
  try {
    const out = engine === "template" ? null : await structured(OutreachDraft, prompt, 2000, profile);
    if (out) {
      const d = out.data;
      if (d.connectionNote.length > NOTE_LIMIT) d.connectionNote = trimTo(d.connectionNote, NOTE_LIMIT);
      return { ...d, by: out.by, at: new Date().toISOString() };
    }
  } catch (e) {
    console.warn(`  (AI draft failed for ${contact.name}: ${e.message}; using template)`);
  }
  return templateOutreach(profile, contact);
}

function templateOutreach(profile, contact) {
  const person = contact.name && !/team$|^hiring/i.test(contact.name);
  const first = person ? contact.name.split(" ")[0] : `${contact.company || "there"} team`;
  const co = contact.company || "your team";
  const ctx = `${contact.title || ""} ${contact.category || ""} ${contact.research || ""} ${contact.notes || ""} ${contact.reason || ""}`;
  const [h1, h2] = rankHighlights(profile, ctx);
  const angle = angleFor(profile, contact.title, contact.category, contact.reason);
  // Your own research note (from `research`) becomes the hook: first bullet, source stripped.
  const hook = (contact.research || contact.reason || "").split("\n").map((l) => l.replace(/^[\s\-*•]+/, "").replace(/\s*\(?[a-z0-9.-]+\.[a-z]{2,}\)?\s*$/i, "").trim()).find((l) => l.length > 10);
  const startup = contact.companySize === "startup";
  const ask = startup
    ? `Would you be open to an intern this winter? I'd happily own a specific project, whether that's reporting, ops tooling or customer research, whatever is most useful.`
    : `Would you be open to a 15-minute chat, or pointing me to the right person for ${co}'s Winter 2027 interns?`;
  return {
    connectionNote: trimTo(`Hi ${person ? first : "there"}, I'm ${profile.name}, a ${profile.shortIntro || "student"}.${contact.reason ? ` ${contact.reason.replace(/\.?$/, ".")}` : ""} I'm exploring ${profile.targetArea || "roles like yours"} and would love to connect.`, NOTE_LIMIT),
    followUp: `Thanks for connecting${person ? `, ${first}` : ""}! I'm exploring ${profile.targetArea || "roles like yours"} and would really value 15 minutes to hear how you got to ${co} and what makes interns successful there. Happy to work around your schedule.`,
    nudge: `Hi ${person ? first : "there"}, floating this back up in case it got buried. No pressure at all if now's busy!`,
    emailSubject: `Winter 2027 intern for ${co}?`,
    emailBody: `Hi ${first},

${hook ? `Saw this about ${co}: ${hook.replace(/\.?$/, ".")} ` : ""}I'm ${profile.name}, a ${profile.shortIntro || profile.headline}.${angle ? ` ${angle}` : ""}

Most relevant to you: ${h1 || ""}. If it's useful, I'm happy to send a one-page take on how I'd approach a similar problem at ${co}.

${ask} ${termLine(profile)}

${profile.website || profile.linkedin}
If this isn't on your radar, a quick no is totally fine.

Thanks,
${profile.name}`,
    emailFollowUp1: `Hi ${person ? first : "there"}, one more relevant example: ${h2 || h1 || ""}. Still happy to put together that one-page take for ${co} if it would help.`,
    emailFollowUp2: `Hi ${person ? first : "there"}, I'll close the loop here so I'm not cluttering your inbox. If a 10-minute call or a pointer to the right person is easy, I'd be grateful. Either way, thank you!`,
    by: "template",
    at: new Date().toISOString(),
  };
}

function trimTo(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]?$/, "") + "…";
}

// ---------- research ----------

/** Looks up recent, specific facts about the company (and person) with Claude's web search, for the hook. */
export async function researchContact(contact, profile = {}) {
  const engine = engineFor(profile);
  if (!["api", "claude-code"].includes(engine)) throw new Error("automatic research needs \"ai\": \"claude-code\" or an API key");
  const who = [contact.name && !/team$/i.test(contact.name) ? `${contact.name} (${contact.title || "role unknown"})` : "", contact.company].filter(Boolean).join(" at ");
  const ask = `I'm a student about to cold-email ${who} about a Winter 2027 internship. Find 3-5 SPECIFIC, recent (last 12 months) facts I could reference: product launches, funding, expansion (e.g. new offices or markets), notable hires, things the person posted or spoke about, problems the business is likely facing. Also say roughly how many employees they have, and who would decide on an intern (founder, ops lead, recruiter). Reply as short bullet points, each ending with the source domain. No preamble.`;
  if (engine === "claude-code") return String((await runClaudeCode(ask, { tools: "WebSearch" })).result || "").trim();
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
    messages: [{ role: "user", content: ask }],
  });
  if (msg.stop_reason === "refusal") throw new Error("Claude declined this request");
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}
