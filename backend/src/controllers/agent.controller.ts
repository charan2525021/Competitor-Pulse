import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { generatePlan } from "../llm/planner";
import { setLLMConfig } from "../llm/groq.client";
import { executeIntelPlan } from "../services/agent.orchestrator";
import type { CompetitorIntel } from "../services/agent.orchestrator";

// In-memory store per run
const runStore = new Map<string, {
  logs: string[];
  done: boolean;
  reports: CompetitorIntel[];
  abortController?: AbortController;
}>();

export async function startAgent(req: Request, res: Response) {
  const { prompt, filters, llm, tinyfishApiKey } = req.body;

  if (!prompt) {
    res.status(400).json({ success: false, error: "Prompt is required" });
    return;
  }

  // Set runtime LLM config from frontend
  if (llm && llm.apiKey) {
    setLLMConfig(llm);
  }

  // Set runtime TinyFish key if provided
  if (tinyfishApiKey || filters?.tinyfishApiKey) {
    process.env.TINYFISH_API_KEY_RUNTIME = tinyfishApiKey || filters.tinyfishApiKey;
  }

  const runId = uuid();
  const abortController = new AbortController();
  runStore.set(runId, { logs: [], done: false, reports: [], abortController });

  // Return runId immediately
  res.json({ success: true, runId });

  // Execute agent pipeline async
  const run = runStore.get(runId)!;

  try {
    run.logs.push(`You asked: "${prompt}"`);

    // Check if directUrls were provided (URL-only mode, no LLM needed)
    const directUrls: string[] | undefined = filters?.directUrls;
    let plan;

    if (directUrls && directUrls.length > 0) {
      // Skip LLM planning — build plan directly from URLs
      run.logs.push("Using direct URLs (no LLM planning needed)");
      plan = {
        competitors: directUrls.map((url: string) => {
          let name = url;
          try { name = new URL(url).hostname.replace("www.", "").split(".")[0]; name = name.charAt(0).toUpperCase() + name.slice(1); } catch {}
          return { name, url };
        }),
        tasks: filters?.tasks || ["pricing", "jobs", "reviews", "blog"],
        maxDepth: 3,
      };
    } else {
      run.logs.push("Generating intelligence gathering plan...");
      plan = await generatePlan(prompt, filters || {});
    }
    // Log the resolved competitors so user sees what we're targeting
    const names = plan.competitors.map((c: any) => `${c.name} (${c.url})`).join(", ");
    run.logs.push(`Targets identified: ${names}`);
    run.logs.push(`Plan ready — will analyze ${plan.competitors.length} competitor${plan.competitors.length !== 1 ? "s" : ""} across ${plan.tasks.length} dimension${plan.tasks.length !== 1 ? "s" : ""} (${plan.tasks.join(", ")})`);

    const results = await executeIntelPlan(plan, (log) => {
      run.logs.push(log);
    }, abortController.signal);

    run.reports = results.reports;
    run.logs.push(`Intelligence report complete. ${results.reports.length} competitor${results.reports.length !== 1 ? "s" : ""} analyzed, ${results.activitiesCount} web actions performed.`);
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      run.logs.push("Agent stopped by user.");
    } else {
      run.logs.push(`Something went wrong: ${(error as Error).message}`);
    }
  } finally {
    run.done = true;
  }
}

export function streamLogs(req: Request, res: Response) {
  const { runId } = req.params;

  const run = runStore.get(runId as string);
  if (!run) {
    res.status(404).json({ success: false, error: "Run not found" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let lastIndex = 0;

  const interval = setInterval(() => {
    while (lastIndex < run.logs.length) {
      const message = run.logs[lastIndex];
      res.write(`data: ${JSON.stringify({ type: "log", message })}\n\n`);
      lastIndex++;
    }

    if (run.done && lastIndex >= run.logs.length) {
      // Strip internal TinyFish fields before sending to frontend
      console.log("[SSE] Raw reports before clean:", JSON.stringify(run.reports.map(r => ({
        company: r.company,
        hasPricing: !!r.pricing,
        pricingPlans: r.pricing?.plans?.length || 0,
        jobCount: r.jobs?.length || 0,
        hasReviews: !!r.reviews,
        blogCount: r.blog?.length || 0,
        featureCount: r.features?.length || 0,
        hasSocial: !!r.social,
      }))));
      const cleanReports = run.reports.map((r) => ({
        ...r,
        pricing: cleanObj(r.pricing),
        reviews: cleanObj(r.reviews),
        jobs: Array.isArray(r.jobs) ? r.jobs.map(cleanObj) : r.jobs,
        blog: Array.isArray(r.blog) ? r.blog.map(cleanObj) : r.blog,
        social: cleanObj(r.social),
      }));
      console.log("[SSE] Sending reports:", JSON.stringify(cleanReports).substring(0, 500));
      res.write(`data: ${JSON.stringify({ type: "complete", message: "Agent finished", reports: cleanReports })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 150);

  req.on("close", () => {
    clearInterval(interval);
  });
}

export function getRunReports(req: Request, res: Response) {
  const { runId } = req.params;
  const run = runStore.get(runId as string);
  if (!run) {
    res.status(404).json({ success: false, error: "Run not found" });
    return;
  }
  res.json({ success: true, reports: run.reports, done: run.done });
}

export function cancelAgent(req: Request, res: Response) {
  const { runId } = req.params;
  const run = runStore.get(runId as string);
  if (!run) {
    res.status(404).json({ success: false, error: "Run not found" });
    return;
  }
  if (run.abortController) {
    run.abortController.abort();
    run.logs.push("Agent stopped by user.");
  }
  res.json({ success: true, message: "Agent cancelled" });
}

/** Expose all runs for dashboard aggregation */
export function getAllRunReports() {
  return Array.from(runStore.values());
}

/** Strip internal TinyFish metadata fields that bloat SSE payloads */
function cleanObj(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const cleaned = { ...obj };
  delete cleaned._progressMessages;
  delete cleaned._progressData;
  delete cleaned._progressPurposes;
  return cleaned;
}
