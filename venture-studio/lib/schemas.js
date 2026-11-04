import { z } from "zod";

const score = z.object({
  score: z.number().describe("0-10"),
  why: z.string(),
});

export const AnalysisSchema = z.object({
  oneLiner: z.string(),
  problem: z.string(),
  targetCustomers: z.array(z.object({ segment: z.string(), pain: z.string() })),
  marketSize: z.object({ estimate: z.string(), reasoning: z.string() }),
  competitors: z.array(
    z.object({ name: z.string(), url: z.string(), whatTheyDo: z.string(), weakness: z.string() })
  ),
  trends: z.array(z.string()),
  risks: z.array(z.string()),
  opportunities: z.array(z.string()),
  pricingIdeas: z.array(z.string()),
  scores: z.object({
    demand: score,
    competition: score.describe("higher = easier to win"),
    feasibility: score,
    monetization: score,
    overall: score,
  }),
  verdict: z.enum(["go", "pivot", "no-go"]),
  verdictReason: z.string(),
});

export const PlanSchema = z.object({
  productName: z.string(),
  tagline: z.string(),
  valueProposition: z.string(),
  mvpFeatures: z.array(z.object({ name: z.string(), description: z.string(), priority: z.enum(["must", "should", "later"]) })),
  pages: z.array(z.object({ name: z.string(), purpose: z.string() })),
  brand: z.object({
    primaryColor: z.string().describe("hex color"),
    tone: z.string(),
  }),
  goToMarket: z.array(z.object({ channel: z.string(), tactic: z.string() })),
  kpis: z.array(z.object({ name: z.string(), target: z.string() })),
  first30Days: z.array(z.string()),
});

export const BuildSchema = z.object({
  summary: z.string().describe("what was built, in 2-3 sentences"),
  files: z.array(
    z.object({
      path: z.string().describe("relative path such as index.html, app.js, styles.css"),
      content: z.string(),
    })
  ),
});

export const PulseSchema = z.object({
  headline: z.string(),
  newCompetitorsOrMoves: z.array(z.object({ name: z.string(), what: z.string(), url: z.string() })),
  trends: z.array(z.string()),
  threats: z.array(z.string()),
  metricsReadout: z.string().describe("what the app's traffic and conversion numbers say"),
  recommendedActions: z.array(z.object({ action: z.string(), why: z.string(), effort: z.enum(["small", "medium", "large"]) })),
  healthScore: z.number().describe("0-10 overall health of the venture right now"),
});
