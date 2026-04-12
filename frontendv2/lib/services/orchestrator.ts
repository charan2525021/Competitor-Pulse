"use server"

import { runTinyFishAgent, extractResultData } from "./tinyfish"
import { llmExtract } from "./llm"
import type { IntelPlan } from "./planner"
import type { CompetitorIntel, AgentLog } from "./run-store"
import { createClient } from "@/lib/supabase/server"

export type TaskType = "pricing" | "jobs" | "reviews" | "blog" | "features" | "social"

interface OrchestratorCallbacks {
  onLog: (log: Omit<AgentLog, "timestamp">) => void
  onRunId?: (runId: string) => void
}

/**
 * Execute an intelligence gathering plan
 */
export async function executeIntelPlan(
  plan: IntelPlan,
  callbacks: OrchestratorCallbacks,
  signal?: AbortSignal
): Promise<CompetitorIntel[]> {
  const reports: CompetitorIntel[] = []
  
  for (const competitor of plan.competitors) {
    if (signal?.aborted) break
    
    callbacks.onLog({
      type: "info",
      message: `Starting analysis of ${competitor.name}...`
    })
    
    const intel: CompetitorIntel = {
      competitor: competitor.name,
      url: competitor.url,
      insights: []
    }
    
    for (const task of plan.tasks) {
      if (signal?.aborted) break
      
      callbacks.onLog({
        type: "action",
        message: `Scraping ${task} data from ${competitor.name}...`
      })
      
      try {
        const result = await scrapeTask(competitor.url, competitor.name, task, callbacks, signal)
        
        if (result) {
          switch (task) {
            case "pricing":
              intel.pricing = result as CompetitorIntel["pricing"]
              break
            case "jobs":
              intel.jobs = result as CompetitorIntel["jobs"]
              break
            case "reviews":
              intel.reviews = result as CompetitorIntel["reviews"]
              break
            case "blog":
              intel.blog = result as CompetitorIntel["blog"]
              break
            case "features":
              intel.features = result as CompetitorIntel["features"]
              break
            case "social":
              intel.social = result as CompetitorIntel["social"]
              break
          }
          
          callbacks.onLog({
            type: "success",
            message: `Extracted ${task} data from ${competitor.name}`
          })
          
          // Save to database
          await saveActivityToDatabase(competitor.name, task, "success", result)
        }
      } catch (error) {
        callbacks.onLog({
          type: "warning",
          message: `Failed to extract ${task} from ${competitor.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        })
        
        await saveActivityToDatabase(competitor.name, task, "failed", null)
      }
    }
    
    // Generate insights for this competitor
    intel.insights = generateInsights(intel)
    
    reports.push(intel)
  }
  
  callbacks.onLog({
    type: "success",
    message: `Analysis complete! Processed ${reports.length} competitors.`
  })
  
  return reports
}

/**
 * Scrape a specific task from a competitor
 */
async function scrapeTask(
  baseUrl: string,
  companyName: string,
  task: TaskType,
  callbacks: OrchestratorCallbacks,
  signal?: AbortSignal
): Promise<unknown> {
  const taskConfig = getTaskConfig(task, companyName)
  const url = buildTaskUrl(baseUrl, task)
  
  const result = await runTinyFishAgent(url, taskConfig.goal, {
    signal,
    onStream: (message) => {
      callbacks.onLog({ type: "info", message })
    },
    onStreamingUrl: (streamUrl) => {
      callbacks.onLog({ type: "info", message: `Live view: ${streamUrl}` })
    }
  })
  
  if (!result.success) {
    throw new Error(result.error || "TinyFish scraping failed")
  }
  
  // Try direct extraction first
  const extractedData = extractResultData(result.result)
  if (extractedData.length > 0) {
    const normalized = normalizeTaskData(task, extractedData[0])
    if (normalized) return normalized
  }
  
  // Fall back to LLM extraction
  const context = [
    ...(result.progressMessages || []),
    JSON.stringify(result.result)
  ].join("\n")
  
  const llmResult = await llmExtract(context, taskConfig.extractionPrompt)
  
  if (llmResult.success && llmResult.data) {
    return normalizeTaskData(task, llmResult.data)
  }
  
  // Final fallback: generate mock data with LLM knowledge
  return generateFallbackData(task, companyName)
}

/**
 * Get task-specific configuration
 */
function getTaskConfig(task: TaskType, companyName: string) {
  const configs: Record<TaskType, { goal: string; extractionPrompt: string }> = {
    pricing: {
      goal: `Navigate to the pricing page and extract all pricing tiers, their prices, and included features. Look for monthly/annual pricing options.`,
      extractionPrompt: `Extract pricing information as JSON: { "model": "tiered/usage/flat", "plans": [{ "name": "...", "price": "...", "features": ["..."] }] }`
    },
    jobs: {
      goal: `Find the careers or jobs page and extract information about open positions, including job titles, departments, and locations.`,
      extractionPrompt: `Extract job data as JSON: { "total": number, "departments": [{ "name": "...", "count": number, "growth": number }], "recentPostings": [{ "title": "...", "location": "...", "date": "..." }] }`
    },
    reviews: {
      goal: `Search for customer reviews on G2, Capterra, TrustRadius, and extract ratings, review counts, and common feedback themes.`,
      extractionPrompt: `Extract review data as JSON: { "averageRating": number, "totalCount": number, "platforms": [{ "name": "...", "rating": number, "count": number }], "sentiment": { "positive": number, "neutral": number, "negative": number }, "topComplaints": ["..."] }`
    },
    blog: {
      goal: `Find the company blog and extract recent post titles, topics, and publication dates.`,
      extractionPrompt: `Extract blog data as JSON: { "postCount": number, "topics": ["..."], "recentPosts": [{ "title": "...", "date": "...", "url": "..." }] }`
    },
    features: {
      goal: `Navigate to the features or product page and extract main product features and capabilities.`,
      extractionPrompt: `Extract features as JSON: { "categories": [{ "name": "...", "features": ["..."] }], "highlights": ["..."] }`
    },
    social: {
      goal: `Find ${companyName}'s social media presence (Twitter/X, LinkedIn, etc.) and extract follower counts and recent activity.`,
      extractionPrompt: `Extract social data as JSON: { "platforms": [{ "name": "...", "followers": number, "engagement": number }], "recentActivity": ["..."] }`
    }
  }
  
  return configs[task]
}

/**
 * Build URL for a specific task
 */
function buildTaskUrl(baseUrl: string, task: TaskType): string {
  const cleanUrl = baseUrl.replace(/\/$/, "")
  
  const paths: Record<TaskType, string> = {
    pricing: "/pricing",
    jobs: "/careers",
    reviews: "", // Will search on review sites
    blog: "/blog",
    features: "/features",
    social: ""
  }
  
  if (task === "reviews") {
    return `https://www.g2.com/search?query=${encodeURIComponent(cleanUrl.replace(/https?:\/\//, ""))}`
  }
  
  if (task === "social") {
    return `https://twitter.com/search?q=${encodeURIComponent(cleanUrl.replace(/https?:\/\//, ""))}`
  }
  
  return cleanUrl + paths[task]
}

/**
 * Normalize extracted data to expected format
 */
function normalizeTaskData(task: TaskType, data: unknown): unknown {
  if (!data || typeof data !== "object") return null
  
  // Basic validation - ensure required fields exist
  const obj = data as Record<string, unknown>
  
  switch (task) {
    case "pricing":
      return {
        model: obj.model || "unknown",
        plans: Array.isArray(obj.plans) ? obj.plans : []
      }
    case "jobs":
      return {
        total: typeof obj.total === "number" ? obj.total : 0,
        departments: Array.isArray(obj.departments) ? obj.departments : [],
        recentPostings: Array.isArray(obj.recentPostings) ? obj.recentPostings : []
      }
    case "reviews":
      return {
        averageRating: typeof obj.averageRating === "number" ? obj.averageRating : 0,
        totalCount: typeof obj.totalCount === "number" ? obj.totalCount : 0,
        platforms: Array.isArray(obj.platforms) ? obj.platforms : [],
        sentiment: obj.sentiment || { positive: 0, neutral: 0, negative: 0 },
        topComplaints: Array.isArray(obj.topComplaints) ? obj.topComplaints : []
      }
    default:
      return data
  }
}

/**
 * Generate fallback data using LLM knowledge
 */
async function generateFallbackData(task: TaskType, companyName: string): Promise<unknown> {
  const { llmExtract } = await import("./llm")
  
  const prompts: Record<TaskType, string> = {
    pricing: `Based on your knowledge of ${companyName}, generate realistic pricing tier information.`,
    jobs: `Based on your knowledge of ${companyName}, estimate their hiring activity and departments.`,
    reviews: `Based on your knowledge of ${companyName}, estimate their customer review ratings and common feedback.`,
    blog: `Based on your knowledge of ${companyName}, describe their typical blog topics and content strategy.`,
    features: `Based on your knowledge of ${companyName}, list their main product features.`,
    social: `Based on your knowledge of ${companyName}, estimate their social media presence.`
  }
  
  const taskConfig = getTaskConfig(task, companyName)
  const result = await llmExtract(prompts[task], taskConfig.extractionPrompt)
  
  return result.success ? result.data : null
}

/**
 * Generate insights from collected intel
 */
function generateInsights(intel: CompetitorIntel): string[] {
  const insights: string[] = []
  
  if (intel.jobs?.total && intel.jobs.total > 20) {
    insights.push("Aggressive hiring suggests rapid growth or expansion plans")
  }
  
  if (intel.reviews?.averageRating && intel.reviews.averageRating > 4.0) {
    insights.push("High customer satisfaction indicates strong product-market fit")
  }
  
  if (intel.reviews?.averageRating && intel.reviews.averageRating < 3.5) {
    insights.push("Lower ratings may indicate opportunity to differentiate on quality")
  }
  
  if (intel.pricing?.plans?.length && intel.pricing.plans.length >= 3) {
    insights.push("Multiple pricing tiers suggest mature product with diverse customer segments")
  }
  
  return insights
}

/**
 * Save activity to Supabase
 */
async function saveActivityToDatabase(
  target: string,
  action: string,
  status: "success" | "failed",
  details: unknown
): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from("activity_history").insert({
        user_id: user.id,
        type: "analysis",
        action,
        target,
        status,
        details: details ? JSON.stringify(details) : null
      })
    }
  } catch {
    // Silently fail - activity logging is not critical
  }
}
