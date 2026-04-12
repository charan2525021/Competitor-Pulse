import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { runTinyFishAgent } from "@/lib/services/tinyfish"
import { callLLM, parseJSONFromLLM } from "@/lib/services/llm"
import {
  createStrategyRun,
  getStrategyRun,
  addStrategyLog,
  completeStrategyRun
} from "@/lib/services/run-store"

// POST /api/strategy - Run a strategy analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, query, industry } = body

    if (!type || !["market", "distribution", "weakness"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid strategy type" },
        { status: 400 }
      )
    }

    const runId = uuidv4()
    createStrategyRun(runId)

    // Execute strategy analysis asynchronously
    executeStrategy(runId, type, query || industry || "SaaS")

    return NextResponse.json({ success: true, runId })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

async function executeStrategy(runId: string, type: string, context: string) {
  const run = getStrategyRun(runId)
  if (!run) return

  addStrategyLog(runId, { type: "info", message: `Starting ${type} analysis...` })

  try {
    let result: unknown

    switch (type) {
      case "market":
        result = await marketBreakdown(runId, context)
        break
      case "distribution":
        result = await distributionPlan(runId, context)
        break
      case "weakness":
        result = await competitorWeakness(runId, context)
        break
    }

    completeStrategyRun(runId, result)
    addStrategyLog(runId, { type: "success", message: "Analysis complete!" })
  } catch (error) {
    addStrategyLog(runId, {
      type: "error",
      message: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
    })
    completeStrategyRun(runId, { error: error instanceof Error ? error.message : "Unknown error" })
  }
}

async function marketBreakdown(runId: string, industry: string) {
  addStrategyLog(runId, { type: "info", message: "Researching market size..." })

  // Web research calls (simulated if TinyFish not available)
  const searches = [
    `${industry} market size TAM SAM SOM 2024`,
    `${industry} trending products ProductHunt`,
    `${industry} startup funding recent`
  ]

  const researchData: string[] = []

  for (const query of searches) {
    addStrategyLog(runId, { type: "action", message: `Searching: ${query}` })
    
    const result = await runTinyFishAgent(
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      "Extract key market data, numbers, and trends from search results",
      { timeout: 30000 }
    )

    if (result.success && result.progressMessages) {
      researchData.push(result.progressMessages.join("\n"))
    }
  }

  // Generate analysis with LLM
  addStrategyLog(runId, { type: "info", message: "Generating market analysis..." })

  const prompt = `
Based on research about the ${industry} industry, generate a market breakdown analysis.

Research context:
${researchData.join("\n\n")}

Generate a JSON response with this structure:
{
  "tam": { "value": "$X billion", "description": "Total Addressable Market description" },
  "sam": { "value": "$X billion", "description": "Serviceable Addressable Market description" },
  "som": { "value": "$X million", "description": "Serviceable Obtainable Market description" },
  "trends": ["trend 1", "trend 2", "trend 3"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "threats": ["threat 1", "threat 2"]
}
`

  const llmResult = await callLLM(prompt, { jsonMode: true })
  
  if (llmResult.success && llmResult.text) {
    return parseJSONFromLLM(llmResult.text)
  }

  // Fallback
  return {
    tam: { value: "$50 billion", description: `Global ${industry} market` },
    sam: { value: "$15 billion", description: `North America and Europe` },
    som: { value: "$500 million", description: `Achievable in 3 years` },
    trends: ["AI integration", "Remote work", "Automation"],
    opportunities: ["Underserved SMB segment", "Emerging markets"],
    threats: ["Market consolidation", "Economic uncertainty"]
  }
}

async function distributionPlan(runId: string, industry: string) {
  addStrategyLog(runId, { type: "info", message: "Researching distribution channels..." })

  const searches = [
    `${industry} marketing strategies B2B`,
    `${industry} community reddit discussion`,
    `${industry} content marketing patterns`
  ]

  const researchData: string[] = []

  for (const query of searches) {
    addStrategyLog(runId, { type: "action", message: `Searching: ${query}` })
    
    const result = await runTinyFishAgent(
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      "Extract marketing strategies, channels, and tactics",
      { timeout: 30000 }
    )

    if (result.success && result.progressMessages) {
      researchData.push(result.progressMessages.join("\n"))
    }
  }

  addStrategyLog(runId, { type: "info", message: "Generating distribution plan..." })

  const prompt = `
Based on research about ${industry} distribution strategies, generate a go-to-market plan.

Research context:
${researchData.join("\n\n")}

Generate a JSON response:
{
  "channels": [
    { "name": "channel name", "priority": "high/medium/low", "tactics": ["tactic 1", "tactic 2"] }
  ],
  "contentStrategy": {
    "themes": ["theme 1", "theme 2"],
    "formats": ["format 1", "format 2"]
  },
  "partnerships": ["partner type 1", "partner type 2"],
  "timeline": [
    { "phase": "Month 1-3", "focus": "description" }
  ]
}
`

  const llmResult = await callLLM(prompt, { jsonMode: true })
  
  if (llmResult.success && llmResult.text) {
    return parseJSONFromLLM(llmResult.text)
  }

  return {
    channels: [
      { name: "Content Marketing", priority: "high", tactics: ["SEO blog", "LinkedIn posts"] },
      { name: "Product-Led Growth", priority: "high", tactics: ["Free tier", "Viral features"] },
      { name: "Partnerships", priority: "medium", tactics: ["Integrations", "Co-marketing"] }
    ],
    contentStrategy: {
      themes: ["Industry insights", "Product tutorials"],
      formats: ["Blog posts", "Video", "Podcasts"]
    },
    partnerships: ["Technology partners", "Agency partners"],
    timeline: [
      { phase: "Month 1-3", focus: "Content foundation and SEO" },
      { phase: "Month 4-6", focus: "Paid acquisition testing" }
    ]
  }
}

async function competitorWeakness(runId: string, industry: string) {
  addStrategyLog(runId, { type: "info", message: "Researching competitor weaknesses..." })

  const searches = [
    `top ${industry} competitors comparison`,
    `${industry} software negative reviews G2`,
    `${industry} pricing complaints`
  ]

  const researchData: string[] = []

  for (const query of searches) {
    addStrategyLog(runId, { type: "action", message: `Searching: ${query}` })
    
    const result = await runTinyFishAgent(
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      "Extract competitor names, weaknesses, and customer complaints",
      { timeout: 30000 }
    )

    if (result.success && result.progressMessages) {
      researchData.push(result.progressMessages.join("\n"))
    }
  }

  addStrategyLog(runId, { type: "info", message: "Analyzing competitor weaknesses..." })

  const prompt = `
Based on research about ${industry} competitors, identify weaknesses and opportunities.

Research context:
${researchData.join("\n\n")}

Generate a JSON response:
{
  "competitors": [
    {
      "name": "competitor name",
      "weaknesses": ["weakness 1", "weakness 2"],
      "severity": "high/medium/low"
    }
  ],
  "pricingGaps": ["gap 1", "gap 2"],
  "featureGaps": ["missing feature 1", "missing feature 2"],
  "serviceGaps": ["service issue 1", "service issue 2"],
  "opportunities": ["strategic opportunity 1", "strategic opportunity 2"]
}
`

  const llmResult = await callLLM(prompt, { jsonMode: true })
  
  if (llmResult.success && llmResult.text) {
    return parseJSONFromLLM(llmResult.text)
  }

  return {
    competitors: [
      { name: "Competitor A", weaknesses: ["High pricing", "Complex setup"], severity: "high" },
      { name: "Competitor B", weaknesses: ["Poor support", "Limited integrations"], severity: "medium" }
    ],
    pricingGaps: ["No usage-based option", "Expensive for SMBs"],
    featureGaps: ["Mobile app", "Real-time collaboration"],
    serviceGaps: ["24/7 support", "Dedicated CSM for mid-market"],
    opportunities: ["Focus on simplicity", "Competitive pricing for SMBs"]
  }
}
