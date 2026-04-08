import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { runTinyFishAgent, cancelTinyFishRun } from "../services/tinyfish.service";
import { callGroq, setLLMConfig } from "../llm/groq.client";

const strategyStore = new Map<string, { logs: string[]; done: boolean; result: any; abortController?: AbortController; tinyFishRunId?: string }>();

export async function runStrategy(req: Request, res: Response) {
  const { tool, input, llm, tinyfishApiKey } = req.body;
  if (!tool || !input) { res.status(400).json({ success: false, error: "tool and input required" }); return; }

  if (llm?.apiKey) setLLMConfig(llm);
  if (tinyfishApiKey) process.env.TINYFISH_API_KEY_RUNTIME = tinyfishApiKey;

  const runId = uuid();
  const ac = new AbortController();
  strategyStore.set(runId, { logs: [], done: false, result: null, abortController: ac });
  res.json({ success: true, runId });

  const run = strategyStore.get(runId)!;
  const log = (m: string) => run.logs.push(m);

  try {
    switch (tool) {
      case "market": await marketBreakdown(input, log, ac.signal, (id) => { run.tinyFishRunId = id; }); break;
      case "distribution": await distributionPlan(input, log, ac.signal, (id) => { run.tinyFishRunId = id; }); break;
      case "weakness": await competitorWeakness(input, log, ac.signal, (id) => { run.tinyFishRunId = id; }); break;
      default: log("Unknown tool"); break;
    }
  } catch (e) {
    log(`Error: ${(e as Error).message}`);
  }

  // Generate the final analysis with LLM
  try {
    log("Generating strategic analysis...");
    const context = run.logs.join("\n");
    const prompt = getAnalysisPrompt(tool, input, context);
    const result = await callGroq(prompt, true);
    run.result = JSON.parse(result);
    log("Analysis complete");
  } catch (e) {
    log(`Analysis generation failed: ${(e as Error).message}`);
    run.result = { error: "Failed to generate analysis" };
  }

  run.done = true;
}

// ── Market Breakdown: Scrape real market data ──
async function marketBreakdown(niche: string, log: (m: string) => void, signal: AbortSignal, onRunId: (id: string) => void) {
  log(`Researching market for: ${niche}`);

  log("Searching for market size and trends...");
  await runTinyFishAgent("https://www.google.com",
    `Search for "${niche} market size 2025 2026 TAM". Read the top 3 results and note any market size numbers, growth rates, and trends you find.`,
    (m) => log(m), { signal, onRunId });

  log("Checking ProductHunt for trending products in this space...");
  await runTinyFishAgent("https://www.producthunt.com",
    `Search for "${niche}" on ProductHunt. Note the top 5 products, their upvote counts, and taglines.`,
    (m) => log(m), { signal, onRunId });

  log("Researching funding activity in this market...");
  await runTinyFishAgent("https://www.google.com",
    `Search for "${niche} startups funding 2025 2026 crunchbase". Read the results and note any recent funding rounds, amounts, and company names.`,
    (m) => log(m), { signal, onRunId });

  log("Market research data gathered");
}

// ── Distribution Plan: Scrape competitor channels ──
async function distributionPlan(idea: string, log: (m: string) => void, signal: AbortSignal, onRunId: (id: string) => void) {
  log(`Building distribution plan for: ${idea}`);

  log("Analyzing competitor distribution channels...");
  await runTinyFishAgent("https://www.google.com",
    `Search for "${idea} marketing strategy case study". Read the top 3 results and note the marketing channels, strategies, and tactics mentioned.`,
    (m) => log(m), { signal, onRunId });

  log("Checking Reddit for community insights...");
  await runTinyFishAgent("https://www.reddit.com",
    `Search for "${idea}" on Reddit. Note the top subreddits discussing this topic, post engagement levels, and what people are asking about.`,
    (m) => log(m), { signal, onRunId });

  log("Analyzing social media content patterns...");
  await runTinyFishAgent("https://www.google.com",
    `Search for "${idea} viral content strategy social media". Note the content formats, platforms, and strategies that work best.`,
    (m) => log(m), { signal, onRunId });

  log("Distribution research complete");
}

// ── Competitor Weakness Map: Deep competitor analysis ──
async function competitorWeakness(niche: string, log: (m: string) => void, signal: AbortSignal, onRunId: (id: string) => void) {
  log(`Mapping competitor weaknesses in: ${niche}`);

  log("Identifying top competitors...");
  await runTinyFishAgent("https://www.google.com",
    `Search for "best ${niche} tools 2026" or "top ${niche} companies". List the top 5 competitors with their websites.`,
    (m) => log(m), { signal, onRunId });

  log("Analyzing competitor reviews for weaknesses...");
  await runTinyFishAgent("https://www.g2.com",
    `Search for "${niche}" on G2. For the top 3 products, look at the "What do you dislike?" sections in recent reviews. Note common complaints and pain points.`,
    (m) => log(m), { signal, onRunId });

  log("Analyzing pricing gaps...");
  await runTinyFishAgent("https://www.google.com",
    `Search for "${niche} pricing comparison". Note which competitors are expensive, which have limited free tiers, and where pricing gaps exist.`,
    (m) => log(m), { signal, onRunId });

  log("Competitor weakness research complete");
}

function getAnalysisPrompt(tool: string, input: string, context: string): string {
  const base = `You are a world-class business strategist. Based on the web research below, provide a structured analysis. Return ONLY valid JSON.\n\nWeb Research Context:\n${context.substring(0, 4000)}\n\n`;

  if (tool === "market") {
    return base + `Analyze the market for "${input}". Return JSON:
{
  "title": "Market Analysis: ${input}",
  "tam": { "value": "$XXB", "description": "Total addressable market explanation" },
  "sam": { "value": "$XXB", "description": "Serviceable addressable market" },
  "som": { "value": "$XXM", "description": "Serviceable obtainable market" },
  "trends": [{ "trend": "Trend name", "impact": "High/Medium/Low", "description": "Why this matters" }],
  "opportunities": [{ "opportunity": "Name", "description": "Why it's underserved", "potential": "High/Medium" }],
  "moneyFlow": [{ "area": "Where money flows", "evidence": "Funding/revenue data", "amount": "$XX" }],
  "summary": "2-3 sentence executive summary"
}
Provide 5 trends, 5 opportunities, and 3-5 money flow areas. Use real data where possible.`;
  }

  if (tool === "distribution") {
    return base + `Create a distribution plan to reach 1M people in 30 days for "${input}". Return JSON:
{
  "title": "Distribution Plan: ${input}",
  "channels": [{ "channel": "Channel name", "type": "organic/paid", "reach": "Expected reach", "effort": "Low/Medium/High", "cost": "$X/month", "strategy": "How to use it" }],
  "contentFormats": [{ "format": "Format name", "platform": "Where to post", "frequency": "How often", "example": "Example content idea" }],
  "dailyPlan": [{ "day": "Day 1-5", "tasks": ["Task 1", "Task 2"], "goal": "What to achieve" }],
  "viralHooks": ["Hook 1", "Hook 2", "Hook 3", "Hook 4", "Hook 5"],
  "budget": { "organic": "$X", "paid": "$X", "total": "$X/month" },
  "summary": "2-3 sentence strategy summary"
}
Provide 5 channels, 5+ content formats, 6 daily plan blocks (Day 1-5, 6-10, 11-15, 16-20, 21-25, 26-30), and 5 viral hooks.`;
  }

  if (tool === "weakness") {
    return base + `Analyze the top 5 competitors in "${input}" and map their weaknesses. Return JSON:
{
  "title": "Competitor Weakness Map: ${input}",
  "competitors": [{
    "name": "Competitor name",
    "strengths": ["Strength 1", "Strength 2"],
    "weaknesses": ["Weakness 1", "Weakness 2"],
    "ignoredAudience": "Who they don't serve well",
    "pricingGap": "Where their pricing fails"
  }],
  "positioningGaps": [{ "gap": "Gap description", "opportunity": "How to exploit it", "difficulty": "Easy/Medium/Hard" }],
  "dominationStrategy": {
    "positioning": "How to position against all competitors",
    "differentiator": "Your unique angle",
    "targetAudience": "Who to focus on first",
    "goToMarket": "First 90 days plan"
  },
  "summary": "2-3 sentence competitive strategy"
}
Provide 5 competitors with real strengths/weaknesses, 3-5 positioning gaps, and a clear domination strategy.`;
  }

  return base + `Analyze "${input}" and return structured JSON insights.`;
}

export function streamStrategyLogs(req: Request, res: Response) {
  const run = strategyStore.get(req.params.runId as string);
  if (!run) { res.status(404).json({ success: false }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let idx = 0;
  const interval = setInterval(() => {
    while (idx < run.logs.length) {
      res.write(`data: ${JSON.stringify({ type: "log", message: run.logs[idx] })}\n\n`);
      idx++;
    }
    if (run.done && idx >= run.logs.length) {
      res.write(`data: ${JSON.stringify({ type: "complete", message: "Done", result: run.result })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 150);
  req.on("close", () => clearInterval(interval));
}

export async function cancelStrategy(req: Request, res: Response) {
  const run = strategyStore.get(req.params.runId as string);
  if (!run) { res.status(404).json({ success: false }); return; }
  let tinyFishCancelled = false;
  if (run.tinyFishRunId) {
    tinyFishCancelled = await cancelTinyFishRun(run.tinyFishRunId);
    run.logs.push(tinyFishCancelled ? "TinyFish agent cancelled on server." : `TinyFish cancel attempted (runId: ${run.tinyFishRunId}).`);
  } else {
    run.logs.push("No TinyFish run ID captured — stopping local stream only.");
  }
  run.abortController?.abort();
  run.logs.push("Cancelled by user");
  run.done = true;
  res.json({ success: true, tinyFishCancelled, tinyFishRunId: run.tinyFishRunId || null });
}
