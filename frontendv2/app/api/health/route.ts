import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTinyFishApiKey } from "@/lib/services/tinyfish"
import { getLLMConfig } from "@/lib/services/llm"

// GET /api/health - Health check endpoint
export async function GET() {
  const checks: Record<string, { status: string; message?: string }> = {}

  // Check Supabase connection
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("activity_history").select("id").limit(1)
    
    checks.database = error 
      ? { status: "error", message: error.message }
      : { status: "ok" }
  } catch (error) {
    checks.database = { 
      status: "error", 
      message: error instanceof Error ? error.message : "Connection failed" 
    }
  }

  // Check TinyFish API key
  const tinyFishKey = getTinyFishApiKey()
  checks.tinyfish = tinyFishKey 
    ? { status: "ok" }
    : { status: "warning", message: "API key not configured" }

  // Check LLM configuration
  const llmConfig = getLLMConfig()
  const hasLlmKey = llmConfig.apiKey || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  checks.llm = hasLlmKey
    ? { status: "ok", message: `Provider: ${llmConfig.provider}` }
    : { status: "warning", message: "No LLM API key configured" }

  // Overall status
  const hasError = Object.values(checks).some(c => c.status === "error")
  const hasWarning = Object.values(checks).some(c => c.status === "warning")

  return NextResponse.json({
    status: hasError ? "unhealthy" : hasWarning ? "degraded" : "healthy",
    timestamp: new Date().toISOString(),
    checks,
    version: "1.0.0"
  })
}
