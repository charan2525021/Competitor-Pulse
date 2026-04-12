import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { generatePlan } from "@/lib/services/planner"
import { executeIntelPlan } from "@/lib/services/orchestrator"
import { setTinyFishApiKey } from "@/lib/services/tinyfish"
import { setLLMConfig } from "@/lib/services/llm"
import {
  createAgentRun,
  getAgentRun,
  addAgentLog,
  completeAgentRun,
  failAgentRun,
  getCompletedAgentRuns
} from "@/lib/services/run-store"

// POST /api/agent - Start a new agent run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      prompt,
      urls,
      filters,
      llmConfig,
      tinyFishApiKey
    } = body

    // Set runtime API keys if provided
    if (tinyFishApiKey) {
      setTinyFishApiKey(tinyFishApiKey)
    }
    
    if (llmConfig) {
      setLLMConfig(llmConfig)
    }

    // Generate run ID
    const runId = uuidv4()
    const run = createAgentRun(runId)

    // Build plan
    let plan
    if (urls && urls.length > 0) {
      // Direct URLs mode
      plan = {
        competitors: urls.map((url: string) => ({
          name: new URL(url).hostname.replace("www.", ""),
          url
        })),
        tasks: filters?.tasks || ["pricing", "jobs", "reviews"]
      }
    } else {
      // Smart mode - use LLM to generate plan
      plan = await generatePlan(prompt, {
        maxCompetitors: filters?.maxCompetitors || 5,
        taskFilter: filters?.tasks
      })
    }

    addAgentLog(runId, {
      type: "info",
      message: `Planning complete: ${plan.competitors.length} competitors, ${plan.tasks.length} tasks`
    })

    // Execute plan asynchronously
    executeIntelPlan(
      plan,
      {
        onLog: (log) => addAgentLog(runId, log),
        onRunId: (tfRunId) => {
          const currentRun = getAgentRun(runId)
          if (currentRun) {
            currentRun.tinyFishRunId = tfRunId
          }
        }
      },
      run.abortController.signal
    )
      .then((reports) => {
        completeAgentRun(runId, reports)
      })
      .catch((error) => {
        failAgentRun(runId, error.message)
      })

    return NextResponse.json({
      success: true,
      runId,
      plan
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// GET /api/agent - Get all completed runs
export async function GET() {
  const runs = getCompletedAgentRuns()
  return NextResponse.json({
    success: true,
    runs: runs.map(run => ({
      id: run.id,
      reports: run.reports,
      startedAt: run.startedAt,
      completedAt: run.completedAt
    }))
  })
}
