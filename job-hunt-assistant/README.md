# Job Hunt Assistant

One tool for the whole job search loop:

1. **Find roles.** It pulls new postings from your target companies' public job boards (Greenhouse, Lever, Ashby) and keeps only the ones that fit your filters.
2. **Draft.** Claude writes a cover letter plus "why us / why you" answers tailored to each posting, using only what's in your profile and resume.
3. **Apply.** It opens the application in a real browser, fills in your details, uploads your resume, and pastes your answers. You review it, answer anything personal (work authorization, EEO, captcha), and submit.
4. **Book coffee chats.** It gives you LinkedIn search links (alumni and people in your target roles at each company) and drafts a connection note under 300 characters, a coffee-chat ask, and a nudge. Then it opens each profile and puts the note in the Connect box. **You press Send.**
5. **Track.** A local dashboard shows applications and contacts on boards, your reply rate, and what needs a follow-up today.

All data stays on your machine in `data/tracker.json`.

> **Why you press Send on LinkedIn:** LinkedIn's User Agreement bans bots that send invitations or messages, and accounts that use them get restricted. This tool does everything except that one click, limits you to 15 invites a day by default, and spaces out its actions. That keeps your account safe, and you still read every message before it goes out.

## What you need

| | Needed? | Cost |
|---|---|---|
| **Node.js 20+** ([nodejs.org](https://nodejs.org), LTS installer) | Yes | Free |
| **Google Chrome** (or Playwright's Chromium) | For `apply` / `connect` / `message` | Free |
| **Your resume**: `config/resume.tex` (LaTeX works as-is) + `config/resume.pdf` | Yes | – |
| **Anthropic API key** | Only for Claude-written drafts | Pay per use, roughly 5–10¢ per application and 2–4¢ per person messaged |

Everything except drafting works without a key: job discovery, autofill, LinkedIn assist, and the tracker. Without a key, drafts come from fill-in-the-blank templates, which are noticeably more generic.

**Getting a key:** sign up at [console.anthropic.com](https://console.anthropic.com), add a few dollars of credit under Billing, then create a key under API Keys (it starts with `sk-ant-`). This is separate from a Claude.ai Pro/Max subscription, which doesn't include API usage. $10 covers roughly 100 applications plus 100 outreach messages. You can set a monthly spend limit in the console.

Keep the key off GitHub. Set it in your terminal instead:

```bash
export ANTHROPIC_API_KEY=sk-ant-...      # macOS/Linux; add to ~/.zshrc to keep it
```

On Windows PowerShell: `$env:ANTHROPIC_API_KEY="sk-ant-..."`.

## Setup

```bash
cd job-hunt-assistant
npm install
npx playwright install chromium     # only needed for apply / connect / message
npm run jha -- init                 # creates config/profile.json + config/targets.json
```

Then:

- Edit `config/profile.json`: phone, grad date, highlights, and how you like to write.
- Edit `config/targets.json`: companies and their job-board slug (the part after `boards.greenhouse.io/`, `jobs.lever.co/` or `jobs.ashbyhq.com/`), plus title, location and keyword filters.
- Copy your resume's LaTeX source to `config/resume.tex` (Claude reads it) and the compiled PDF to `config/resume.pdf` (uploaded to applications). A plain `config/resume.txt` also works.
- Add your phone number to `config/profile.json`.

These files are git-ignored, so your personal details never get committed.

## Daily routine

```bash
npm run serve                        # dashboard at http://localhost:4321
```

```bash
npm run jha -- discover              # new matching jobs
npm run jha -- draft --top 5         # tailored drafts for the 5 best matches
npm run jha -- apply --next 5        # autofill each one; you review + submit
```

```bash
npm run jha -- people Stripe         # alumni / role search links
npm run jha -- add-contact --url https://www.linkedin.com/in/... --name "Priya Shah" \
    --title "Data Scientist" --company Stripe --reason "Waterloo MGTE alum on the payments data team"
npm run jha -- draft-outreach --all
npm run jha -- connect --next 10     # opens each profile with your note pasted in
```

```bash
npm run jha -- followups             # who to nudge, which applications to chase
npm run jha -- message <id>          # once they accept: paste the coffee-chat ask
npm run jha -- set <id> chat_booked  # or drag status in the dashboard
```

**Bookmarklet:** in the dashboard, drag **+ Add to tracker** to your bookmarks bar. Click it on any LinkedIn profile and that person opens in the add-contact form.

## How it decides things

| Step | Logic |
|---|---|
| Job match score | Title must include one of `titleInclude` and none of `titleExclude`; location must match; +5 per keyword found in the description. Jobs below `minScore` are dropped. |
| Follow-ups | Applications get a reminder 7 days after you mark them applied. Invites get one 5 days after sending. Both clear once the status moves on. |
| Autofill | Fills by known field names (Greenhouse, Lever, Ashby) and then by label text. Anything required that it can't answer gets listed for you. It never answers demographic or legal questions. |
| Drafting | Claude (`claude-opus-5-5` by default; override with `JHA_MODEL`), with structured output so each draft has the same fields every time. It's told never to invent experience. |

## Tests

```bash
npm test
```

Covers scoring, the tracker store, job-board parsing, the dashboard API, and the Claude request (against a mock server). With Playwright installed, it also runs autofill and the LinkedIn helpers against look-alike pages.

## Environment variables

| Var | Default | |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | enables Claude drafts |
| `JHA_MODEL` | `claude-opus-5-5` | model for drafts |
| `JHA_NOTE_LIMIT` | `300` | set to `200` if LinkedIn caps your notes lower |
| `JHA_USE_CHROME` | `1` | `0` = use Playwright's Chromium instead of your Chrome |
| `JHA_DATA_DIR` | `./data` | where the tracker file lives |
