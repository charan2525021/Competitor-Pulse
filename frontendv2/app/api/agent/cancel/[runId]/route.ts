import { NextRequest, NextResponse } from "next/server"
import { getAgentRun, failAgentRun } from "@/lib/services/run-store"
import { cancelTinyFishRun } from "@/lib/services/tinyfish"

// POST /api/agent/cancel/:runId - Cancel a running agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params
  const run = getAgentRun(runId)

  if (!run) {
    return NextResponse.json(
      { success: false, error: "Run not found" },
      { status: 404 }
    )
  }

  if (run.done) {
    return NextResponse.json(
      { success: false, error: "Run already completed" },
      { status: 400 }
    )
  }

  // Cancel TinyFish run if active
  if (run.tinyFishRunId) {
    await cancelTinyFishRun(run.tinyFishRunId)
  }

  // Abort local controller
  run.abortController.abort()
  
  // Mark as failed
  failAgentRun(runId, "Cancelled by user")

  return NextResponse.json({ success: true })
}
