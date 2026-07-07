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
    group: "Languages",
    items: ["Python", "JavaScript", "TypeScript", "Java", "R", "SQL"],
  },
  {
    group: "Machine learning & data",
    items: [
      "Pandas",
      "NumPy",
      "scikit-learn",
      "TensorFlow",
      "Keras",
      "Matplotlib",
      "Seaborn",
      "Jupyter",
      "yfinance",
    ],
  },
  {
    group: "Web & backend",
    items: ["React", "Node.js", "Express.js", "REST APIs", "HTML & CSS", "Tailwind CSS"],
  },
  {
    group: "Platforms & tools",
    items: [
      "Power BI",
      "Power Automate",
      "Power Apps",
      "SharePoint",
      "SPFx",
      "Git",
      "GitHub",
      "Jira",
      "Figma",
      "Excel & VBA",
      "Microsoft Project",
    ],
  },
];

export const EXPERIENCE = [
  {
    company: "Creospark",
    role: "Business Analyst",
    period: "Jan 2026 – Apr 2026",
    img: "/photos/work/creospark-office.jpg",
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
    img: "/photos/work/creospark-team.jpg",
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
    title: "Patent Landscape Intelligence",
    status: "In the works",
    description:
      "A tool I'm currently building to map and analyze patent landscapes, surfacing trends, white space, and competitor activity from large patent datasets.",
    tech: ["Python", "NLP", "Machine Learning", "Data Visualization"],
    links: [],
  },
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
    title: "Financial Analyst Research",
    description: 
    "Produced a macroeconomic research report comparing the Nikkei 225 and Dow Jones Industrial Average. Analyzed monetary policy divergence, USD/JPY dynamics, sector drivers, market correlations, geopolitical shocks, and probabilistic forecasts using event studies, statistical analysis, and Monte Carlo simulation.",
    tech: ["Python", "Machine Learning", "Statistical / Economic Analysis"],
    links: [{ label: "Github", href: "https://github.com/Keneisha3/Cross-Market-Index-Comparison.git" }],
  },
  {
    title: "Markov Chain Model",
    description:
      "Operations research model determining truck rental vs 3PL efficiency.",
    tech: ["Python"],
    links: [{ label: "GitHub", href: "https://github.com/Keneisha3/MarkovChainModelling.git" }],
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

export const INTERESTS = [
  {
    title: "Swimming",
    blurb: "Laps are my reset button, early mornings and late nights in the pool are like meditation on steroids.",
    img: "/photos/IMG_8019.jpeg",
    tag: "Off the clock",
  },
  {
    title: "Paris",
    blurb: "Wandering, pastries, and far too many photos of the eiffel tower.",
    img: "/photos/IMG_0858.jpeg",
    tag: "Never had my daily caloric intake so full of bread before.",
  },
  {
    title: "Venice",
    blurb: "Coastlines, espresso, and the best pasta of my life.",
    img: "/photos/IMG_3092.jpeg",
    tag: "Venice when can I see you next?",
  },
  {
    title: "Electric guitar",
    blurb: "I’ve been playing guitar since I was a kid, so long that my fingers know chords faster than I can remember where I left my keys.",
    img: "/photos/IMG_9151.JPG",
    tag: "My dream collection.",
  },
  {
    title: "Coffee & Red Bull",
    blurb: "My two essential food groups during a deadline.",
    img: "/photos/IMG_9152.JPG",
    tag: "My diet on a deadline.",
  },
  {
    title: "Drake",
    blurb: "On repeat while I lock in",
    img: "/photos/IMG_9153.JPG",
    tag: "On repeat whenever I lock in.",
  },
  {
    title: "Suits",
    blurb: "Comfort rewatch. I think I'm right as often as Harvey.",
    img: "/photos/IMG_9154.JPG",
    tag: "Comfort rewatch! I think I'm right as often as Harvey.",
  },
  {
    title: "Industry",
    blurb: "Couldn't look away and LOVED the finance aspect.",
    img: "/photos/IMG_9155.JPG",
    tag: "Couldn't look away and LOVED the finance aspect.",
  },
];

// === Knowledge base for the chat widget (no API key needed) ===
// Each entry is matched by keywords; the best match's answer is returned.
export const CHAT_KB = [
  {
    keywords: ["who", "about", "keneisha", "yourself", "her", "bio", "background"],
    answer:
      "Keneisha Baid is a Management Engineering student at the University of Waterloo. She works across data science, product/business analysis, and software, and loves fintech, AI, and building real products.",
  },
  {
    keywords: ["project", "projects", "built", "build", "work", "portfolio"],
    answer:
      "Her projects span quantitative finance, machine learning, and systems modeling. Key work includes an ATR-based news-triggered trading system, an election-driven stock prediction model, a stochastic Markov Chain logistics optimizer, a macroeconomic index comparison (Nikkei 225 vs Dow Jones), and a UX-focused family management prototype. Ask about any one for details.",
  },
  {
    keywords: ["atr", "signal", "stock", "trading", "quant", "equities", "backtest", "news"],
    answer:
      "The ATR-Based News-Triggered Stock System is a quantitative trading research platform that combines Average True Range (ATR) volatility detection with real-time news signals across equities. It generates event-driven trading signals, supports portfolio backtesting, and includes walk-forward style validation. Built in Python with yfinance and news ingestion pipelines, designed for research into volatility-adjusted momentum and event impact.",
  },
  {
    keywords: ["election", "electionomics", "ml", "machine learning", "model", "prediction", "sklearn"],
    answer:
      "Electionomics is a machine learning project that predicts stock market behavior using U.S. presidential election data from 2000–2024. It compares models including KNN, SVM, Random Forest, and Gradient Boosting. The best model achieved an R² of 0.779, showing strong explanatory power between political cycles and market movement. Built using Python and scikit-learn.",
  },
  {
    keywords: ["markov", "operations", "logistics", "truck", "3pl", "research", "optimization"],
    answer:
      "The Markov Chain Logistics Model is an operations research system that simulates inventory and shipment transitions using stochastic state modeling. It evaluates tradeoffs between dedicated trucking fleets and third-party logistics (3PL) providers under different cost and demand conditions. Built in Python for probabilistic decision analysis.",
  },
  {
    keywords: ["cross market", "nikkei", "dow", "index", "macroeconomic", "report", "correlation"],
    answer:
      "The Cross-Market Index Comparison is a macro-financial research project analyzing the Nikkei 225 and Dow Jones Industrial Average. It studies monetary policy divergence, USD/JPY effects, sector composition differences, geopolitical shocks, and cross-market correlations using statistical analysis and scenario-based reasoning.",
  },
  {
    keywords: ["ux", "famflow", "figma", "design", "prototype", "frontend"],
    answer:
      "FamFlow UX Prototype is a user experience design project for a family management platform. It includes interactive Figma prototypes, user flows for scheduling and communication, and UX research grounded in HCI principles, focusing on accessibility and task coordination.",
  },
  {
    keywords: ["experience", "job", "intern", "internship", "worked", "career"],
    answer:
      "Her experience: Business Analyst and Software Developer at Creospark, AI Engineering Intern at Pratt & Whitney, Operations Analyst at Greenhouse Juice, and Project Controls at Capital Power. Ask about any company for specifics!",
  },
  {
    keywords: ["creospark", "analyst", "spfx", "sharepoint", "power platform", "power bi"],
    answer:
      "At Creospark she was a Business Analyst (led stakeholder engagement across 3 digital-transformation projects, +24% operational efficiency) and earlier a Software Developer (built enterprise SPFx web parts in TypeScript/React, +27% usability; automation across 5 client projects).",
  },
  {
    keywords: ["pratt", "whitney", "aerospace", "neural", "patent", "ai engineer"],
    answer:
      "At Pratt & Whitney she was an AI Engineering Intern: she built Python automation and AI-assisted workflows that cut manual patent processing time by 30%, and applied ML/neural networks to aerospace decision systems for a 15% accuracy gain.",
  },
  {
    keywords: ["greenhouse", "juice", "capital power", "vba", "excel", "controls", "operations analyst"],
    answer:
      "At Greenhouse Juice (Operations Analyst) she built Excel VBA reporting and dashboards (+17% inventory management, −20% manual workload). At Capital Power (Project Controls) she built VBA reporting and project-tracking workflows in Microsoft Project (+12% accuracy).",
  },
  {
    keywords: ["skill", "skills", "tech", "stack", "language", "tools", "python", "react"],
    answer:
      "Top skills: Python, Data Analysis, Machine Learning, Product/Business Analysis, React/JavaScript, Power Platform, and SQL. Tools include Pandas, NumPy, scikit-learn, Node.js/Express, Power BI, Power Automate, SPFx, Figma, Java, and R.",
  },
  {
    keywords: ["school", "university", "waterloo", "study", "degree", "education", "major"],
    answer:
      "She studies Management Engineering at the University of Waterloo (2022–Present), a blend of engineering, data, and product/operations.",
  },
  {
    keywords: ["interest", "hobby", "hobbies", "fun", "music", "drake", "swimming", "travel", "suits", "industry", "guitar"],
    answer:
      "Outside of work she swims, plays electric guitar, travels (Paris and Venice are favourites), keeps Drake on repeat while coding, and rewatches Suits and Industry.",
  },
  {
    keywords: ["ploid", "hire", "hiring", "role", "fit", "why", "good"],
    answer:
      "She's applying to Ploid and is a strong fit for data/product/fintech roles, her quant projects (ATR Signal, Electionomics) and her ML work at Pratt & Whitney show she can ship real, measurable results.",
  },
  {
    keywords: ["contact", "email", "reach", "linkedin", "github", "connect", "hire me"],
    answer:
      "You can reach Keneisha at kbaid@uwaterloo.ca, on LinkedIn (/in/keneisha-baid/), or GitHub (github.com/Keneisha3).",
  },
];
