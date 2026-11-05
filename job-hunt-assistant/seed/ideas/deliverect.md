# North America mid-market chain target list with a fit score, for Deliverect

## The problem
Deliverect is building its North American mid-market and SMB motion. It's hiring a [Head of Mid Market and SMB Sales](https://careers.redpoint.com/companies/deliverect/jobs/61064664-head-of-mid-market-and-smb-sales) whose brief includes new sales plays and higher conversion. Leadership calls the US [its largest market](https://www.deliverect.com/en/press/deliverect-1-billion-orders-papa-johns-veteran-president-americas). Recent wins are mid-sized chains like KPOT (about 140 locations) and Big Greek Cafe ([Fast Casual](https://www.fastcasual.com/companies/deliverect/media/)). My guess: the hard part isn't the pitch. It's knowing which of the thousands of 15 to 200 location chains to call next, and why now.

## The idea
A ranked list of 150 to 300 US and Canadian chains, scored on how closely they match Deliverect's recent public wins. Each account gets a one-line "why now" hook.

## How it would work
- Build the profile of a won account from public wins: location count, number of delivery channels, POS, own ordering or loyalty.
- Score each chain on 6 to 8 public features: delivery app presence, POS that Deliverect integrates with (Toast, Square, Lightspeed), branded ordering, expansion news, hiring for digital roles.
- Sanity check: known customers should rank near the top. If they don't, fix the weights.
- Output: a dashboard plus a top-25 sheet with hooks like "on 3 apps, just opened 12 stores."

## A one-week plan
- **Day 1:** Write the profile and define the features.
- **Days 2 to 3:** Build the chain universe in Python. Check a sample by hand.
- **Day 4:** Build the weighted score and backtest it against known customers.
- **Day 5:** Ship a Power BI view and the top-25 list with hooks.

## How we'd know it worked
AEs rate most of the top 50 as worth a call. Later, the meeting-booked rate on scored accounts beats their usual list.

## Why me
- At Pratt & Whitney I built Power BI dashboards on 6+ data sources for 40+ users, replacing 4 manual reports.
- I built an earnings forecast model from SEC filings: 4.3% median revenue error vs a 7.4% baseline over 771 held-out quarters. I like scoring things and then checking whether the score holds up.

*This is built entirely from public information, so some of it is surely wrong. I'd love to be told what.*

---

<!-- research notes (not published) -->
## Signals
- On Oct 8, 2026, Deliverect and Yext announced a partnership that feeds Deliverect's live menus, hours, item availability and allergen data into Yext so it shows up correctly in search, maps and AI assistants. (https://www.morningstar.com/news/pr-newswire/20261008ny66016/deliverect-and-yext-partner-to-keep-restaurant-data-accurate-across-every-digital-surface-including-ai-search)
- In fall 2026, mid-sized US chains KPOT (about 140 locations, delivery aggregation and menu management) and Big Greek Cafe (with Thanx for loyalty) picked Deliverect. (https://www.fastcasual.com/companies/deliverect/media/)
- In August 2026, Deliverect partnered with Bounteous to pair the NomNom branded ordering platform with Deliverect's fulfillment layer. It's one of several 2026 channel partnerships (SoundHound in July, 5&5 in June). (https://www.prnewswire.com/news-releases/deliverect-and-bounteous-forge-global-partnership-to-advance-branded-digital-ordering-302858088.html)
- Toronto is hiring a Head of Mid Market and SMB Sales to own the full North American SMB and mid-market sales cycle, set regional targets, raise conversion rates and design 'new and innovative sales plays' for high-volume segments. (https://careers.redpoint.com/companies/deliverect/jobs/61064664-head-of-mid-market-and-smb-sales)
- The Sales GTM Intern role (Toronto, hybrid) pulls data together from HubSpot, Planhat and Looker and builds dashboards for sales forecasting, pipeline health and growth visibility with the account management and GTM teams. (https://jobs.smartfinvc.com/companies/deliverect/jobs/56445260-sales-gtm-intern)
- On Apr 9, 2026, Deliverect launched Deliverect AI: menu agents that change deals, combos and pricing within limits the restaurant sets, plus support agents that watch for unsynced menus and broken integrations. It went live in the UK first, with North America to follow. (https://www.fooddive.com/press-release/20260407-deliverect-launches-ai-agents-and-smart-assistants-to-supercharge-restauran-1/)
- G2 shows about 2.3/5 from only 6 reviews. Reviewers like merging delivery platforms into one place but complain about support and integration reliability. Trustpilot snippets mention slow replies and one multi-location onboarding that was cancelled after months. (https://www.g2.com/products/deliverect/reviews)
- Toast's integration guide says Deliverect onboarding usually takes two to three business weeks after first contact, and that not every channel (for example Uber Eats or Grubhub) can use every menu structure. (https://support.toasttab.com/en/article/Get-Started-with-Deliverect-Integration)

## Other ideas
- **North America mid-market chain target list with a fit score** (sales/GTM play, impact 4/5, feasibility 4/5): A ranked list of 150 to 300 US and Canadian restaurant chains with 15 to 200 locations, each scored on how much it looks like Deliverect's recent wins: number of delivery channels, POS that Deliverect integrates with, whether it has its own online ordering or loyalty, and growth signals. It gives the new MM/SMB sales team a starting call list plus a 'why now' hook for each account.
- **Pipeline health and forecast prototype (HubSpot + Planhat shaped)** (internal tool, impact 3/5, feasibility 5/5): A working mock of the dashboard the GTM intern role describes. It joins CRM deal data and CS health data, then shows stage aging, slipped deals, weighted versus committed forecast, and expansion pipeline ranked by account health. On day one it's something to react to instead of a blank page.
- **Menu-accuracy audit: '1 in X restaurants shows the wrong info'** (growth experiment, impact 4/5, feasibility 4/5): A public-data audit of about 50 North American chain locations. It compares hours, item availability and prices across Google Maps, Uber Eats, DoorDash, the brand's website and an AI assistant. The mismatch rate becomes outbound content and a personalized prospecting hook for the Yext partnership and the menu agents.
