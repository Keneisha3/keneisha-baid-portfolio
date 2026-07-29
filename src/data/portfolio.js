// Central content for the portfolio. Edit links/text here.

export const PROFILE = {
  name: "Keneisha Baid",
  email: "kbaid@uwaterloo.ca",
  linkedin: "https://www.linkedin.com/in/keneisha-baid/",
  github: "https://github.com/Keneisha3",
  university: "University of Waterloo, Management Engineering (2022 to Present)",
};

export const ROLES = [
  "Management Engineer",
  "Data Scientist",
  "Software Developer",
  "Financial Analyst",
  "Business Analyst",
  "Project Coordinator",
];

// Grouped so the toolkit reads cleanly instead of one long wall of pills.
export const TOOLKIT = [
  {
    group: "Cloud & Infrastructure",
    items: ["AWS", "Azure", "GCP", "CI/CD Pipelines", "Docker", "Linux", "Shell Scripting"],
  },
  {
    group: "Systems & Platform Tools",
    items: [
      "SharePoint Framework (SPFx)",
      "Power Platform",
      "Power Automate",
      "Power BI",
      "Git",
      "Jira",
      "Trello",
    ],
  },
  {
    group: "Programming Languages",
    items: [
      "Python",
      "Pandas",
      "NumPy",
      "scikit-learn",
      "Matplotlib",
      "JavaScript",
      "TypeScript",
      "SQL",
      "R",
      "ggplot2",
      "dplyr",
    ],
  },
  {
    group: "Automation & Systems Engineering",
    items: [
      "Workflow Automation",
      "System Integration",
      "Requirements Gathering",
      "Process Mapping",
      "Data Pipelines",
      "Monitoring",
    ],
  },
  {
    group: "Analytical Tools",
    items: [
      "Microsoft Excel",
      "VBA",
      "Pivot Tables",
      "Macros",
      "Microsoft Project",
      "Time Series Analysis",
    ],
  },
  {
    group: "Frameworks & Tools",
    items: [
      "React",
      "Node.js",
      "Git",
      "Jira",
      "Trello",
      "Figma",
      "SharePoint Framework (SPFx)",
      "Power Platform",
      "Power Automate",
      "Power BI",
    ],
  },
  {
    group: "Business Analysis & AI",
    items: [
      "Requirements Gathering",
      "Stakeholder Engagement",
      "Process Mapping",
      "Workflow Automation",
      "Machine Learning",
      "Predictive Analytics",
      "Data Visualization",
    ],
  },
  {
    group: "Education",
    items: [
      "University of Waterloo",
      "September 2022 – Present",
      "Bachelor of Science in Management Engineering",
      "President, Institute of Industrial & Systems Engineers (IISE)",
      "Relevant Coursework: Machine Learning, Statistical Analysis, Modeling in Operations Research, Financial Economics",
    ],
  },
];

export const EXPERIENCE = [
  {
    company: "Creospark",
    role: "Business Analyst",
    period: "Jan 2026 – Apr 2026",
    img: "",
    color: "#EC4899",
    bullets: [
      "Led stakeholder engagement across 3 digital transformation projects using Power Platform, SharePoint, Power BI, Power Automate, React, and Jira, improving operational efficiency by 24%.",
      "Translated feedback from 8 workshops into user stories, workflow requirements, and reporting structures while supporting AI-enabled automation and dashboard initiatives, accelerating implementation timelines by 18%.",
    ],
  },
  {
    company: "Creospark",
    role: "Software Developer",
    period: "May 2025 – Aug 2025",
    img: "",
    color: "#FB7185",
    bullets: [
      "Built enterprise SPFx web parts using TypeScript, React, and SharePoint APIs, improving platform usability by 27%.",
      "Developed workflow automation solutions using Power Platform, Power Automate, and SharePoint technologies across 5 client projects.",
    ],
  },
  {
    company: "Pratt & Whitney",
    role: "AI Engineering Intern",
    period: "Sep 2024 – Dec 2024",
    color: "#DB2777",
    bullets: [
      "Developed Python automation tools and AI-assisted workflows reducing manual patent processing time by 30%.",
      "Applied machine learning and neural networks to aerospace decision systems, improving predictive accuracy by 15%.",
    ],
  },
  {
    company: "Greenhouse Juice",
    role: "Operations Analyst",
    period: "Jan 2024 – Apr 2024",
    color: "#FB7185",
    bullets: [
      "Built automated Excel VBA reporting workflows and operational dashboards improving inventory management by 17% while reducing manual workload by 20%.",
    ],
  },
  {
    company: "Capital Power",
    role: "Project Controls",
    period: "May 2023 – Aug 2023",
    color: "#EC4899",
    bullets: [
      "Developed Excel VBA reporting tools and project tracking workflows using Microsoft Project, improving accuracy by 12%.",
    ],
  },
];

export const PROJECTS = [
  {
    title: "ATR News Signal System",
    description:
      "Event-driven stock alert system using ATR volatility + RSS news feeds across 50+ equities with backtesting, walk-forward validation, and automated research reports.",
    tech: ["Python", "yfinance", "RSS"],
    links: [{ label: "GitHub", href: "https://github.com/Keneisha3/ATR-Based-News-Triggered-Stock-System.git" }],
  },
  {
    title: "Electionomics",
    description:
      "ML model predicting stock performance from US presidential election outcomes (2000–2024). Compared KNN, SVM, Gradient Boosting, Random Forest. Best model: R²=0.779.",
    tech: ["Python", "scikit-learn"],
    links: [
      { label: "GitHub", href: "https://github.com/Keneisha3/Electionomics.git" },
      { label: "Presentation PDF", href: "/Electionomics-Presentation.pdf" },
    ],
  },
  {
    title: "Financial Analyst Research",
    description: 
    "Produced a macroeconomic research report comparing the Nikkei 225 and Dow Jones Industrial Average. Analyzed monetary policy divergence, USD/JPY dynamics, sector drivers, market correlations, geopolitical shocks, and probabilistic forecasts using event studies, statistical analysis, and Monte Carlo simulation.",
    tech: ["Python", "Machine Learning", "Statistical / Economic Analysis"],
    links: [{ label: "Github", href: "https://github.com/Keneisha3/Cross-Market-Index-Comparison.git" }],
  },
  {
    title: "FamFlow UX Prototype",
    figma: "https://www.figma.com/proto/8M19jiQgJ7S0Xjvf2Uf2zf/FamFlow-Vertical-Prototype-Medium-Fidelity?node-id=0-1&t=zerNLS0qXjv6pjou-1",
    description:
      "Led the design of an accessible family management platform, developing interactive Figma prototypes and user workflows for scheduling, communication, and task sharing. Applied UX research, HCI principles, and usability heuristics to reduce cognitive load and improve the experience for multi-user households.",
    tech: ["User-Centered Design", "Human-Computer Interaction", "Figma"],
    links: [
      { label: "Github", href: "https://github.com/Keneisha3/famflow-ux-prototype.git" },
      { label: "Prototype · vertical", href: "https://www.figma.com/proto/8M19jiQgJ7S0Xjvf2Uf2zf/FamFlow-Vertical-Prototype-Medium-Fidelity?node-id=0-1&t=zerNLS0qXjv6pjou-1" },
      { label: "Prototype · horizontal", href: "https://www.figma.com/proto/Y2vhHKGHsuPIQlu5ngxLjK/FamFlow-Horizontal-Prototype-Medium-Fidelity?node-id=0-1&t=0TEMj7fXe1wzjwTF-1" },
    ],
  },
  {
    title: "Markov Chain Model",
    description:
      "Operations research model determining truck rental vs 3PL efficiency.",
    tech: ["Python"],
    links: [{ label: "GitHub", href: "https://github.com/Keneisha3/MarkovChainModelling.git" }],
  },
  {
    title: "Patent Landscape Intelligence",
    status: "In the works",
    description:
      "A tool I'm currently building to map and analyze patent landscapes, surfacing trends, white space, and competitor activity from large patent datasets.",
    tech: ["Python", "NLP", "Machine Learning", "Data Visualization"],
    links: [],
  },
];

// === A few of my favourite things ===

// Shared backend for visitor travel recommendations (Supabase REST).
// Leave both blank to keep pins local-only (saved in each visitor's browser).
// To enable shared pins: create a free Supabase project with a `travel_recs`
// table (columns: name text, lat float8, lng float8, created_at timestamptz),
// enable RLS with public select + insert policies, then paste the Project URL
// and anon public key below. Falls back to local-only if unreachable.
export const SUPABASE = {
  url: "https://mgofszkmfvzzzazxeaxi.supabase.co",
  anonKey: "sb_publishable_kx1IBqryNZqlKALc9eZrKg_bjkvxoSJ",
};

// Interactive playlist shown on the Life page (Spotify embed).
// To use your own: open a playlist in Spotify -> Share -> Copy link,
// then paste just the ID (the part after /playlist/ and before any "?").
// e.g. https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd  ->  "37i9dQZF1DX0XUsuxWHRQd"
export const PLAYLIST = {
  spotifyId: "1lHUC1MsBoolZpphjW9ine",
  type: "playlist", // "playlist" | "album" | "track" | "artist"
  caption: "What's usually playing while I work.",
};

// Favourite songs for the 3D cover stack — pulled from my Spotify playlist.
// Album art + 30s previews load automatically from Apple's iTunes Search API
// by title + artist, so editing this list is all it takes.
export const FAVE_SONGS = [
  {
    title: "I'm On Fire",
    artist: "Bruce Springsteen",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02a43a6482e327d623bb0c0f77",
    preview: "https://p.scdn.co/mp3-preview/e9bb2268bc574f78cb700ad364fa087fe3fd04bb",
  },
  {
    title: "Gypsy",
    artist: "Fleetwood Mac",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02813da91820fd194cbee5bdce",
    preview: "https://p.scdn.co/mp3-preview/a230542c1dbed632215115c55983815fa3ae7697",
  },
  {
    title: "Headlines",
    artist: "Drake",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c7ea04a9b455e3f68ef82550",
    preview: "https://p.scdn.co/mp3-preview/570ddea0adb2c0bff50a1f0447a0e643c084fbe6",
  },
  {
    title: "Dreams - 2004 Remaster",
    artist: "Fleetwood Mac",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0257df7ce0eac715cf70e519a7",
    preview: "https://p.scdn.co/mp3-preview/30d63954de3ee9c0bc3600a4560260cb252d4fbd",
  },
  {
    title: "Piece Of Heaven",
    artist: "Tame Impala",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02208500450dcd0fd294d7bd3b",
    preview: "https://p.scdn.co/mp3-preview/e038160c80047bc0c7b2a56803b392af015daa15",
  },
  {
    title: "Everlasting Light",
    artist: "The Black Keys",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0243f5bd543a2a1ab37fb40a8b",
    preview: "https://p.scdn.co/mp3-preview/8f4df6d0dcf76a3e5730cabfa72ca9808fd7fd70",
  },
  {
    title: "Shabang",
    artist: "Drake",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02fe9d3ab9adb1d3b59835b81c",
    preview: "https://p.scdn.co/mp3-preview/306dfed2c87a5869e1d35be1d03e44123086836a",
  },
  {
    title: "Silence - John Summit Remix",
    artist: "Delerium, Sarah McLachlan, John Summit",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e026f1ad698de95b08df9b5a590",
    preview: "https://p.scdn.co/mp3-preview/c94dc9b6f36fe5d7261cdf17e6430ae1d84f7ed2",
  },
  {
    title: "Mr. Brightside",
    artist: "The Killers",
    art: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02ccdddd46119a4ff53eaf1f5d",
    preview: "https://p.scdn.co/mp3-preview/848b1bd5544e82f62f9cfcec65362d0f5369781f",
  },
  {
    title: "E85",
    artist: "Don Toliver",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0225c28f3c9fbdbab1a88dd619",
    preview: "https://p.scdn.co/mp3-preview/6531864966b2fc846a74a9bc161d9bf4563ec2e9",
  },
  {
    title: "COMË N GO",
    artist: "Yeat",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02e35aad7bbe4508513f36fd58",
    preview: "https://p.scdn.co/mp3-preview/2eee774e0688dedbc348414f4c9636fde150c9b9",
  },
  {
    title: "Purple Rain",
    artist: "Prince",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02e2829416e5011fb749cc3fde",
    preview: "https://p.scdn.co/mp3-preview/81bd92ac70dc7b6dd32aabfb186fe67857147834",
  },
  {
    title: "Return of the Mack",
    artist: "Mark Morrison",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0201841d493ec3808242042c0f",
    preview: "https://p.scdn.co/mp3-preview/456989fb9b32c4525f0668676ad5067d20479b4a",
  },
  {
    title: "Wicked Game",
    artist: "Chris Isaak",
    art: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02ad0e25c1c366d63bcbae4073",
    preview: "https://p.scdn.co/mp3-preview/116da575b713d8fe2c698dbb3bbd31c065bff4c3",
  },
];

// NOTE: Swimming is pending a replacement photo (the old one was cut) —
// re-add it here with `category: "Hobbies"` once a new image is in.
export const INTERESTS = [
  {
    title: "Paris",
    category: "Travel",
    blurb: "Wandering, pastries, and far too many photos of the eiffel tower.",
    img: "/photos/IMG_0858.jpeg",
    tag: "Never had my daily caloric intake so full of bread before.",
  },
  {
    title: "Venice",
    category: "Travel",
    blurb: "Coastlines, espresso, and the best pasta of my life.",
    img: "/photos/IMG_3092.jpeg",
    tag: "Venice when can I see you next?",
  },
  {
    title: "Electric guitar",
    category: "Hobbies",
    blurb: "I’ve been playing guitar since I was a kid, so long that my fingers know chords faster than I can remember where I left my keys.",
    img: "/photos/IMG_9151.JPG",
    tag: "My dream collection.",
  },
  {
    title: "Coffee & Red Bull",
    category: "Food",
    blurb: "My two essential food groups during a deadline.",
    img: "/photos/IMG_9152.JPG",
    tag: "My diet on a deadline.",
  },
  {
    title: "Suits",
    category: "TV",
    blurb: "Comfort rewatch. I think I'm right as often as Harvey.",
    img: "/photos/IMG_9154.JPG",
    tag: "Comfort rewatch! I think I'm right as often as Harvey.",
  },
  {
    title: "Industry",
    category: "TV",
    blurb: "Couldn't look away and LOVED the finance aspect.",
    img: "/photos/IMG_9155.JPG",
    tag: "Couldn't look away and LOVED the finance aspect.",
  },
];

// === Knowledge base for the chat widget (no API key needed) ===
// Each entry is matched by keywords; the best match's answer is returned.
export const CHAT_KB = [
  {
    keywords: ["who", "about", "keneisha", "kenny", "yourself", "bio", "background", "herself"],
    answer:
      "Kenny (Keneisha) Baid is a Management Engineering student at the University of Waterloo, currently on co-op. Her work runs across software development, business analysis, finance, and UX research — the throughline is pairing quantitative, technical projects with a real product and business lens.",
  },
  {
    keywords: [
      "throughline", "unique", "special", "stand out", "different", "story", "overall",
      "summary", "sum up", "elevator", "pitch", "what is she into", "what's she into",
      "what does she do", "what she does",
    ],
    answer:
      "The throughline: she builds quantitative, technical things (trading signals, ML models, automation) and pairs them with business analysis and UX so they actually get used. She's touched a wide range of industries too — finance, aerospace, consumer, and energy — across four internships.",
  },
  {
    keywords: ["project", "projects", "built", "build", "portfolio", "made", "work on"],
    answer:
      "Six of them: an ATR news-triggered trading signal system, Electionomics (predicting markets from policy cycles), a Nikkei 225 vs Dow Jones divergence study, the FamFlow UX prototype, a Markov chain fleet-transition model, and Patent Landscape Intelligence (in progress). Ask about any one for the details.",
  },
  {
    keywords: ["atr", "signal", "stock", "trading", "trade", "quant", "equities", "backtest", "news", "yfinance"],
    answer:
      "The ATR News Signal System is a news-triggered trading signal engine — it fuses Average True Range volatility with real-time news feeds to flag event-driven setups across equities, with backtesting baked in. Built in Python with yfinance and RSS ingestion.",
  },
  {
    keywords: ["election", "electionomics", "ml", "machine learning", "prediction", "predict", "policy", "sklearn", "random forest"],
    answer:
      "Electionomics predicts stock movement from U.S. election and policy cycles. She benchmarked KNN, SVM, gradient boosting, and random forest — random forest was the best fit at R² = 0.779. Python and scikit-learn.",
  },
  {
    keywords: ["financial", "nikkei", "dow", "index", "divergence", "macro", "macroeconomic", "report", "correlation", "market comparison"],
    answer:
      "Her Financial Analyst Research compares the Nikkei 225 and Dow Jones, studying how they diverge across different policy regimes using statistical and economic analysis in Python. It digs into monetary policy, currency effects, and cross-market correlation.",
  },
  {
    keywords: ["famflow", "ux", "figma", "design", "prototype", "hci", "frontend", "family", "app"],
    answer:
      "FamFlow is a family-management app prototype she designed in Figma — user flows for scheduling and communication, grounded in user-centered design and HCI principles. It's her most design-forward project.",
  },
  {
    keywords: ["markov", "chain", "fleet", "operations", "logistics", "truck", "3pl", "transition", "optimization", "quarter"],
    answer:
      "The Markov Chain Model simulates fleet-ownership transitions quarter over quarter — a stochastic model for deciding between running your own fleet and using third-party logistics under changing conditions. Built in Python.",
  },
  {
    keywords: ["patent", "landscape", "intelligence", "nlp", "in progress", "current project", "working on now", "building now", "latest"],
    answer:
      "Patent Landscape Intelligence is her in-progress project — mapping and analyzing patent landscapes to surface trends, white space, and competitor activity from large datasets using NLP and machine learning in Python.",
  },
  {
    keywords: ["experience", "internship", "internships", "intern", "co-op", "coop", "job", "jobs", "worked", "career", "companies", "roles"],
    answer:
      "Four internships across very different worlds: Creospark (Software Developer → Business Analyst), Pratt & Whitney Canada (AI Engineering, patents & innovation), Greenhouse Juice (Operations Analyst), and Capital Power (Project Controls). Ask about any one for specifics.",
  },
  {
    keywords: ["creospark", "spfx", "sharepoint", "power platform", "power bi", "power automate", "stakeholder", "digital transformation", "business analyst"],
    answer:
      "At Creospark she started as a Software Developer and grew into a Business Analyst, leading stakeholder engagement across 3 digital-transformation projects (Power Platform, SharePoint, Power BI, Power Automate, React, Jira). She lifted operational efficiency by 24% and cut implementation timelines by 18%.",
  },
  {
    keywords: ["pratt", "whitney", "aerospace", "engine", "ai engineering", "innovation"],
    answer:
      "At Pratt & Whitney Canada she worked in AI Engineering, focused on patents and innovation — bringing machine learning into an aerospace R&D setting.",
  },
  {
    keywords: ["greenhouse", "juice", "operations analyst", "consumer", "inventory"],
    answer:
      "At Greenhouse Juice she was an Operations Analyst — the consumer-goods chapter of her internships, working on operational reporting and analysis.",
  },
  {
    keywords: ["capital power", "project controls", "energy", "controls", "utility"],
    answer:
      "At Capital Power she worked in Project Controls — the energy-sector stop on her internship tour, handling project tracking and reporting.",
  },
  {
    keywords: ["skill", "skills", "tech", "stack", "language", "languages", "tools", "python", "react", "sql", "know"],
    answer:
      "Broad and practical: cloud/infra (AWS, Azure, GCP, Docker, CI/CD), platform tools (Power Platform, Power BI, Power Automate, SharePoint, Jira), languages (Python, JS/TS, SQL, R), Excel/VBA, plus business analysis (requirements gathering, stakeholder engagement, process mapping).",
  },
  {
    keywords: ["industry", "industries", "sector", "sectors", "fields", "domains", "areas"],
    answer:
      "She's deliberately ranged wide: finance (her quant projects), aerospace (Pratt & Whitney), consumer goods (Greenhouse Juice), and energy (Capital Power) — plus the software and product work threaded through all of it.",
  },
  {
    keywords: ["school", "university", "waterloo", "study", "studies", "degree", "education", "major", "management engineering"],
    answer:
      "She studies Management Engineering at the University of Waterloo and is currently on co-op — it's a blend of engineering, data, and product/operations, which is exactly why her work crosses so many lanes.",
  },
  {
    keywords: ["interest", "interests", "hobby", "hobbies", "fun", "music", "drake", "swimming", "swim", "travel", "suits", "industry show", "guitar", "outside"],
    answer:
      "Outside of work she swims, plays electric guitar, travels (Paris and Venice are favourites), keeps a playlist running while she builds, and rewatches Suits and Industry.",
  },
  {
    keywords: [
      "want to do", "goal", "goals", "aspiration", "aspire", "future", "next", "looking for",
      "dream", "aiming", "hoping", "plans", "become", "wants", "seeking", "role she wants",
    ],
    answer:
      "She's aiming for roles where she can own a problem end-to-end — quantitative or technical work paired with the product and business side that gets it shipped. Fintech and AI are the sweet spot, and she's building toward a patent-landscape intelligence tool of her own.",
  },
  {
    keywords: [
      "like", "personality", "person", "kind of", "vibe", "character", "who is she",
      "type of", "describe", "strengths", "traits", "attitude",
    ],
    answer:
      "Curious, product-minded, and relentless about shipping things that work. She likes hard problems and clean interfaces, brings an athlete's discipline (she swims) to her work, and cares as much about how something feels to use as whether the math checks out.",
  },
  {
    keywords: ["hire", "hiring", "recruit", "candidate", "fit", "good", "strong", "why her", "should we"],
    answer:
      "Strong fit for data, product, and fintech roles. Her quant work (ATR signals, Electionomics) and her AI work at Pratt & Whitney show she ships real, measurable results — and she can talk to engineers and stakeholders alike, which is rarer than it sounds.",
  },
  {
    keywords: ["contact", "email", "reach", "linkedin", "github", "connect", "hire me", "get in touch", "message", "talk"],
    answer:
      "Easiest ways to reach Kenny: kbaid@uwaterloo.ca, linkedin.com/in/keneisha-baid, or github.com/Keneisha3. She's quick to reply.",
  },
];
