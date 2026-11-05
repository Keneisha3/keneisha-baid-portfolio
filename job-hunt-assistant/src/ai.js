// Drafting with Claude. Every draft is saved for you to review/edit before it is
// used anywhere. If no API credentials are configured, falls back to templates.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { loadResumeText } from "./resume.js";

const MODEL = process.env.JHA_MODEL || "claude-opus-5-5";
// LinkedIn caps connection-request notes at 300 characters (200 on some free accounts).
export const NOTE_LIMIT = Number(process.env.JHA_NOTE_LIMIT || 300);

let client;
function getClient() {
  if (process.env.JHA_NO_AI) return null;
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN && !process.env.ANTHROPIC_PROFILE) return null;
  client ??= new Anthropic();
  return client;
}

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

async function structured(schema, prompt, maxTokens = 4000) {
  const c = getClient();
  if (!c) return null;
  const msg = await c.beta.messages.parse({
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
  return msg.parsed_output;
}

// ---------- applications ----------

const ApplicationDraft = z.object({
  fitScore: z.number().describe("0-100, how well the profile matches the role's must-haves"),
  fitSummary: z.string().describe("2-3 sentences: strongest matches and any real gaps"),
  coverLetter: z.string().describe("Under 250 words, plain text, no placeholders, signed with the candidate's name"),
  whyCompany: z.string().describe("2-4 sentences answering 'Why do you want to work here?'"),
  whyRole: z.string().describe("2-4 sentences answering 'Why are you a fit for this role?'"),
});

export async function draftApplication(profile, job) {
  const prompt = `Candidate profile:\n${profileBlurb(profile)}\n\n---\nJob: ${job.title} at ${job.company} (${job.location})\n\n${(job.description || "").slice(0, 12000)}\n\n---\nDraft the application materials.`;
  try {
    const out = await structured(ApplicationDraft, prompt);
    if (out) return { ...out, by: MODEL, at: new Date().toISOString() };
  } catch (e) {
    console.warn(`  (AI draft failed for ${job.company}: ${e.message}; using template)`);
  }
  return templateApplication(profile, job);
}

function templateApplication(profile, job) {
  const first = (profile.highlights || [])[0] || "";
  return {
    fitScore: null,
    fitSummary: "Template draft (set ANTHROPIC_API_KEY for tailored drafts).",
    coverLetter: `Dear ${job.company} hiring team,

I'm ${profile.name}, ${profile.headline}. I'm applying for the ${job.title} role because it lines up closely with the work I've been doing. ${first}

I'd bring ${(profile.skills || []).slice(0, 4).join(", ")} and a habit of turning messy processes into simple systems. I'd love to talk about how I could help the team.

Thank you,
${profile.name}`,
    whyCompany: `I'm drawn to ${job.company}'s work and want to contribute to it as a ${job.title}.`,
    whyRole: `${first}`,
    by: "template",
    at: new Date().toISOString(),
  };
}

// ---------- outreach ----------

const OutreachDraft = z.object({
  connectionNote: z.string().describe(`LinkedIn connection note, STRICTLY under ${NOTE_LIMIT} characters including spaces`),
  followUp: z.string().describe("Message to send after they accept: asks for a 15-20 minute coffee chat, gives 2 concrete things to ask about, offers flexibility. Under 90 words."),
  nudge: z.string().describe("Polite one-line follow-up if no reply after a week. Under 40 words."),
  emailSubject: z.string().describe("Under 8 words, specific to them (their product, team or news), never generic like 'Internship inquiry'"),
  emailBody: z.string().describe("Email 1, under 130 words, plain text, following the VALUE-FIRST structure"),
  emailFollowUp1: z.string().describe("Day 4-5 reply in the same thread, under 70 words: adds ONE new useful thing (a sharper version of the idea, a relevant portfolio link, a question about their roadmap). Never 'just checking in'."),
  emailFollowUp2: z.string().describe("Day 10-12 reply, under 45 words: closes the loop gracefully, offers the easiest possible yes (e.g. a 10-minute call or forwarding to the right person), and says she won't follow up again."),
});

const OUTREACH_GUIDE = `VALUE-FIRST cold outreach rules:
1. Hook (1 sentence): something specific and recent about THEM from the research (a launch, hire, expansion, post, metric). If research is empty, use what's genuinely known (product, stage, market). Never fake familiarity or flatter.
2. Bridge (1-2 sentences): the ONE proof point from her background that maps to their likely problem, with a number.
3. Value (1-2 sentences): a concrete, small idea or offer for them: e.g. "I sketched how I'd automate X" ONLY if offering to do it, phrased as an offer ("happy to send a one-page take on..."). Never claim she already made something she didn't.
4. Ask (1 sentence): specific and easy. Startups: a Winter 2027 (Jan-Apr) internship pitched as a project she'd own. Large companies: a 15-minute chat or a referral/pointer to the right team or recruiter, plus the posting if one exists.
5. Logistics line: Waterloo co-op, 4 months from January 2027, open to relocating (and for UK roles: she'd sort her own UK work authorization; never state a visa she doesn't hold).
6. Close with her name, portfolio link, and an easy opt-out ("if this isn't on your radar, a quick no is totally fine").
Tone: peer-to-peer, short sentences, no "I hope this email finds you well", no "passionate", no wall of credentials, no attachments.`;

export async function draftOutreach(profile, contact, job) {
  const prompt = `Sender:\n${profileBlurb(profile)}\n\n---\nRecipient: ${contact.name}, ${contact.title || "?"} at ${contact.company || "?"}
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

${OUTREACH_GUIDE}

Draft the LinkedIn messages and the 3-email sequence. Reference something specific to the recipient when the research or notes allow, and a genuine shared link (school, field, role) when one exists.`;
  try {
    const out = await structured(OutreachDraft, prompt, 2000);
    if (out) {
      if (out.connectionNote.length > NOTE_LIMIT) out.connectionNote = trimTo(out.connectionNote, NOTE_LIMIT);
      return { ...out, by: MODEL, at: new Date().toISOString() };
    }
  } catch (e) {
    console.warn(`  (AI draft failed for ${contact.name}: ${e.message}; using template)`);
  }
  return templateOutreach(profile, contact);
}

function templateOutreach(profile, contact) {
  const first = (contact.name || "").split(" ")[0] || "there";
  return {
    connectionNote: trimTo(
      `Hi ${first}, I'm ${profile.name}, a ${profile.shortIntro || profile.headline}. Your work as ${contact.title || "part of the team"} at ${contact.company} caught my eye. Would love to connect and hear how you got there.`,
      NOTE_LIMIT,
    ),
    followUp: `Thanks for connecting, ${first}! I'm exploring ${profile.targetArea || "roles like yours"} and would really value 15-20 minutes to hear about your path to ${contact.company} and what you'd tell someone starting out. Happy to work around your schedule. Would a quick virtual coffee sometime in the next couple of weeks work?`,
    nudge: `Hi ${first}, just floating this back up in case it got buried. No pressure at all if now's busy!`,
    emailSubject: `Winter 2027 intern for ${contact.company || "your team"}?`,
    emailFollowUp1: `Hi ${first}, one more thought: ${(profile.highlights || [])[2] || (profile.highlights || [])[0] || ""}. Happy to share a short take on how I'd apply that at ${contact.company || "your team"} if useful.`,
    emailFollowUp2: `Hi ${first}, I'll close the loop here so I'm not cluttering your inbox. If a 10-minute call or a pointer to the right person is easy, I'd be grateful. Either way, thanks!`,
    emailBody: `Hi ${first},

I'm ${profile.name}, a ${profile.shortIntro || profile.headline}. I'm looking for ${profile.jobAsk || "a Winter 2027 (January to April) internship or co-op"} and ${contact.company || "your team"} is high on my list.

A couple of things I've done: ${(profile.highlights || []).slice(0, 2).join("; ")}.

If there's room for an intern this winter, I'd love to be considered. If not, I'd still value 15 minutes to learn how the team works. If this isn't on your radar, a quick no is totally fine.

Portfolio: ${profile.website || profile.linkedin}

Thanks,
${profile.name}`,
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
export async function researchContact(contact) {
  const c = getClient();
  if (!c) throw new Error("Research needs ANTHROPIC_API_KEY");
  const who = [contact.name && !/team$/i.test(contact.name) ? `${contact.name} (${contact.title || "role unknown"})` : "", contact.company].filter(Boolean).join(" at ");
  const msg = await c.messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
    messages: [{ role: "user", content: `I'm a student about to cold-email ${who} about a Winter 2027 internship. Find 3-5 SPECIFIC, recent (last 12 months) facts I could reference: product launches, funding, expansion (e.g. new offices or markets), notable hires, things the person posted or spoke about, problems the business is likely facing. Also say roughly how many employees they have, and who would decide on an intern (founder, ops lead, recruiter). Reply as short bullet points, each ending with the source domain. No preamble.` }],
  });
  if (msg.stop_reason === "refusal") throw new Error("Claude declined this request");
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}
