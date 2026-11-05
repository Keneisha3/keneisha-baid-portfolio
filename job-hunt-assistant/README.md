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
| **Google Chrome** (or Playwright's Chromium) | For applying, LinkedIn and email | Free |
| **Your resume**: `config/resume.tex` (LaTeX works as-is) + `config/resume.pdf` | Yes | – |
| **Something to write drafts with** | Pick one below | $0 to pay-as-you-go |

### Drafting engines (set `"ai"` in `config/profile.json`)

| Engine | Cost | Quality | Best for |
|---|---|---|---|
| `template` (default with no key) | Free | Decent. Picks your most relevant highlights and the "angle" you wrote for that kind of role, and quotes the posting | Bulk applications |
| **claude.ai copy-paste** (`prompt-pack` → paste in chat → `paste-drafts`, or the dashboard panel) | Free | Claude-quality, 8 items per paste | Your top jobs and all outreach |
| `claude-code` | Included in Claude Pro/Max | Claude-quality, fully automatic: 8 drafts per request (about 30s), and `research` can search the web | Hands-off, if you have a subscription |
| `api` | Pay per use | Claude-quality, fastest | Only if you want it |

For `claude-code`: `npm install -g @anthropic-ai/claude-code`, run `claude` once to log in with your Claude account, then set `"ai": "claude-code"`. Batching keeps it light on your plan's usage limits: 100 jobs is about 13 requests. `draft --all` before `apply` gets everything Claude-written. If you hit your limit, it falls back to templates.

Recommended split:
- Free templates for the bulk applications. Many forms don't even ask for a cover letter.
- Claude (copy-paste or `claude-code`) for your top ~20 jobs a day and every cold email, since that's where a specific, researched message matters.

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

## Running 100 applications a day

Budget about 3–4 hours. Most of it goes to the review-and-submit step, at roughly 1–2 minutes per application once the forms fill themselves.

```bash
npm run jha -- today                       # where you are vs. the goals in targets.json
npm run jha -- discover                    # every job feed in targets.json
npm run jha -- careers --category airlines # opens career pages that have no feed; copy links of good postings
npm run jha -- import-jobs links.txt       # …and import them (or paste into the dashboard)
npm run jha -- draft --all                 # Claude drafts everything new, 4 at a time
npm run jha -- apply --next 100 --tabs 5   # 5 autofilled tabs at a time; submit, press Enter, repeat
```

How the apply loop behaves:
- Each batch opens 5 applications already filled: contact details, resume, cover letter, the "why us" questions, and the screening questions you've answered in `profile.json` (work authorization, start date, relocation and so on).
- It lists only what's left for you, usually salary or a company-specific question. You submit each tab and press Enter.
- It sees the "Thank you for applying" page and marks the job applied by itself.
- `--auto-submit` clicks Submit for you, but only on forms where every required field is already filled.
- Career sites that need an account (Workday, SuccessFactors, bank and airline sites) still open with your drafts ready, but you sign in and paste.

**Outreach at volume.** Use email for most of it, because LinkedIn caps you:

| Channel | Safe daily volume | Command |
|---|---|---|
| Cold email from your own inbox | 30–40 | `email --next 40` opens compose tabs in Outlook (or Gmail via `emailProvider`) |
| LinkedIn invites | ~20/day, ~100/week | `connect --next 20` |

LinkedIn restricts accounts that go much past ~100 invites a week, and free accounts only get a few personalised notes a month. When the note box is missing, send without a note, then use `message <id>` once they accept. Small startups without job postings (from Wellfound, the U of T startup board, VC portfolio boards) are the best email targets. Put them in a CSV (`name,company,email,reason`) and run `import-contacts`.

**Where the 100 postings come from.** Live Winter 2027 internships are scarce by November, so plan to combine:
- **WaterlooWorks.** It's your biggest source as a Waterloo co-op student, but it can't be automated (it requires your school login). Add the good ones with the dashboard's "Add a job manually" form so they're tracked with everything else.
- **The job feeds** in `targets.json`. Run `check-targets` once, because the board slugs are best guesses.
- **`careers` sweeps** for companies without feeds (airlines, banks, Big 4), plus VC portfolio job boards (Portage, Inovia, Base10).
- **Cold emails** to companies that often hire interns without posting.

## Your priorities

`targets.json` → `priorities` is set to **tech sales (including fintech sales and bank sales/BD in London), finance and founding roles, in London and SF/LA**.
- Matching jobs get a ★ and a score boost, so they come first in `jobs`, `draft --top`, `apply --next` and the dashboard.
- Add `--priority` to any command to see only those jobs.
- Region comes from the job's own location, so a Toronto role at a US company counts as Canada.
- `seed/priority-leads.md` holds the London and SF/LA leads found on Nov 5. `import-pipeline` loads it along with your tracker.

Timing reality: January starts are rare outside Canada.
- **UK:** search **off-cycle** (often 6 months).
- **US:** search **Spring 2027** (Jan–May). You'll likely need a J-1 sponsor, so ask early whether a company will host one.

## Founding and early-stage roles

The third priority lane, **founding**, covers founding engineer, founding GTM/AE, founder's associate, chief of staff and "first hire" roles.
- **Filters:** these roles pass even without "intern" in the title. Senior ones (senior, staff, lead…) are still filtered out.
- **Hacker News "Who is hiring?":** read every `discover`. Founders post there directly. Matching posts become jobs, and any founder email in the post becomes an outreach contact linked to that job, ready for `research` → `draft-outreach` → `email`.
- **Boards opened by `careers --category founding`:** YC Work at a Startup, Wellfound, a16z speedrun, startup.jobs, TrueUp, theInterna, Entrepreneur First.
- **Pitch:** drafts lead with things you've shipped (code *and* business tools). They offer one small, concrete thing you'd do for them, and ask for a **Winter 2027 trial internship that can turn into a full-time founding role** after you graduate in 2027. Most founding roles are full-time, so that's the honest bridge.

## LinkedIn jobs

LinkedIn doesn't allow automated crawling, so this is assisted:
1. `linkedin-jobs` opens LinkedIn searches built from `linkedinJobs` in `targets.json`: internship level, past week, newest first, across Toronto, Vancouver, Montréal, Calgary, Canada and London.
2. You browse and copy the links of jobs you like into `linkedin.txt`.
3. `import-jobs linkedin.txt` opens each one in your logged-in browser, at a human pace, and follows **Apply** to the company's own posting. That posting gets read, scored and autofilled like any other.
4. Easy Apply jobs are tracked with a note to apply on LinkedIn.

## Cold outreach that gets replies

Most cold emails fail because they ask for something and offer nothing. Each draft follows this structure:

1. **Hook:** one specific, recent thing about *them*. `research` uses Claude's web search to find these: launches, funding, new markets, something the person posted.
2. **Bridge:** the one proof point of yours that maps to their likely problem, with a number. For example, the Power BI rollout for 40+ users, or the 4.3% forecast error.
3. **Value:** a small, concrete idea you offer to send, such as "happy to send a one-page take on automating your onboarding reporting". Only offer what you'll actually do, then do it when they say yes. That's what sets you apart.
4. **Ask:** easy and specific.
   - **Startups:** pitch the Winter 2027 term as a project you'd own.
   - **Big companies:** ask for 15 minutes or a pointer to the right team or recruiter, and apply to the posting too.
5. **Logistics:** Waterloo co-op, 4 months from January, open to relocating.
6. **Opt-out:** "a quick no is totally fine". It raises reply rates, and it's the polite norm under Canadian (CASL) and UK (PECR/GDPR) rules for one-to-one business email.

**Who to email:**

| Company size | Who to email |
|---|---|
| Startups under ~50 people | A founder, COO or Head of Ops |
| Mid-size | The hiring manager for the team you want, then a recruiter |
| Large | A university recruiter, plus a Waterloo alum on the team (`people <company>` finds them) |

Use a real person's address from the company site or their LinkedIn profile, or `hello@`/`careers@` for tiny startups. Avoid guessed addresses: bounces hurt your sender reputation.

**Cadence:** three emails, then stop.
- Email 1.
- Day 4–5: one new useful thing, never "just checking in".
- Day 10–12: a short close-the-loop note.

`email --followups` opens whichever are due. Send from your own inbox, and keep it under about 40 a day.

```bash
npm run jha -- import-pipeline              # loads seed/winter-2027-pipeline.md (your tracker)
npm run jha -- people Bree                  # find the founder / ops lead
npm run jha -- add-contact --name "…" --email … --job <Bree job id>
npm run jha -- research --all               # recent news per company (Claude web search)
npm run jha -- draft-outreach --all         # value-first email + 2 follow-ups + LinkedIn note
npm run jha -- email --next 40              # review and send
npm run jha -- email --followups            # each day after
```

## London / UK

- `--region uk` works on `discover`, `careers`, `jobs`, `apply`, `email` and `research`, and `--size startup|large` works on all of them too.
- Startups like Monzo, GoCardless, Cleo, Synthesia and ElevenLabs have job feeds. Banks, consulting firms and airlines (Barclays, HSBC, the Big 4, McKinsey/BCG/Bain, BA/IAG, Virgin Atlantic, easyJet, Heathrow) open through `careers --region uk`.
- UK firms call January starts **off-cycle internships**, and many run **placements**. The filters include both terms.
- **Work authorization:** you'd need a UK visa. Canadians can usually use the Youth Mobility Scheme, which needs no job offer. Check the current age limit, cost and processing time at gov.uk/youth-mobility before promising an employer a start date.
- The UK screening answers in `profile.json` (`workAuthUK`, `needsSponsorshipUK`) are blank on purpose, so UK forms always stop and wait for you.

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
