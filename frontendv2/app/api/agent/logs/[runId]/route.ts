import { NextRequest } from "next/server"
import { getAgentRun } from "@/lib/services/run-store"

// GET /api/agent/logs/:runId - SSE endpoint for streaming logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params
  const run = getAgentRun(runId)

  if (!run) {
    return new Response(
      JSON.stringify({ error: "Run not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    )
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  let lastLogIndex = 0
  let intervalId: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      // Poll for new logs every 150ms
      intervalId = setInterval(() => {
        const currentRun = getAgentRun(runId)
        if (!currentRun) {
          controller.close()
          clearInterval(intervalId)
          return
        }

        // Send new logs
        while (lastLogIndex < currentRun.logs.length) {
          const log = currentRun.logs[lastLogIndex]
          const event = {
            type: "log",
            data: {
              timestamp: log.timestamp,
              type: log.type,
              message: log.message,
              details: log.details
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          lastLogIndex++
        }

        // Check if done
        if (currentRun.done) {
          // Send final event
          if (currentRun.error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: "error",
                error: currentRun.error
              })}\n\n`)
            )
          } else {
            // Strip internal TinyFish metadata from reports
            const cleanReports = currentRun.reports.map(report => {
              const clean = { ...report }
              // Remove any internal fields
              delete (clean as Record<string, unknown>)._progressMessages
              delete (clean as Record<string, unknown>)._progressData
              return clean
            })
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: "complete",
                reports: cleanReports
              })}\n\n`)
            )
          }
          controller.close()
          clearInterval(intervalId)
        }
      }, 150)
    },
    cancel() {
      clearInterval(intervalId)
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
