"use server"

// TinyFish Browser Automation Service
// Integrates with TinyFish AI agent for web scraping and form automation

export interface TinyFishOptions {
  apiKey?: string
  signal?: AbortSignal
  onStream?: (message: string) => void
  onStreamingUrl?: (url: string) => void
  timeout?: number
}

export interface TinyFishResult {
  success: boolean
  runId?: string
  streamingUrl?: string
  result?: unknown
  progressMessages?: string[]
  progressData?: unknown[]
  error?: string
}

// Runtime API key storage
let runtimeApiKey: string | null = null

export function setTinyFishApiKey(key: string) {
  runtimeApiKey = key
}

export function getTinyFishApiKey(): string | null {
  return runtimeApiKey || process.env.TINYFISH_API_KEY || null
}

/**
 * Run TinyFish agent with SSE streaming
 */
export async function runTinyFishAgent(
  url: string,
  goal: string,
  options: TinyFishOptions = {}
): Promise<TinyFishResult> {
  const apiKey = options.apiKey || getTinyFishApiKey()
  
  if (!apiKey) {
    return {
      success: false,
      error: "TinyFish API key not configured. Please add it in Settings."
    }
  }

  const controller = new AbortController()
  const signal = options.signal
  
  // Link external abort signal
  if (signal) {
    signal.addEventListener("abort", () => controller.abort())
  }

  try {
    const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        goal,
        timeout: options.timeout || 120000,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `TinyFish API error: ${response.status} - ${errorText}`
      }
    }

    // Parse SSE stream
    const reader = response.body?.getReader()
    if (!reader) {
      return { success: false, error: "No response body" }
    }

    const decoder = new TextDecoder()
    const progressMessages: string[] = []
    const progressData: unknown[] = []
    let runId: string | undefined
    let streamingUrl: string | undefined
    let completeResult: unknown

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split("\n")

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        
        try {
          const data = JSON.parse(line.slice(6))
          
          switch (data.type) {
            case "STARTED":
              options.onStream?.("AI agent started working")
              break
              
            case "STREAMING_URL":
              streamingUrl = data.streaming_url || data.url
              options.onStreamingUrl?.(streamingUrl!)
              break
              
            case "PROGRESS":
              const message = data.purpose || data.message || data.content
              if (message) {
                progressMessages.push(message)
                options.onStream?.(message)
              }
              if (data.data) {
                progressData.push(data.data)
              }
              break
              
            case "COMPLETE":
              completeResult = data.result || data.output || data.answer || data.text || data
              break
              
            case "ERROR":
              return {
                success: false,
                runId,
                error: data.error || data.message || "Unknown error"
              }
              
            case "RUN_ID":
              runId = data.run_id || data.id
              break
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    }

    return {
      success: true,
      runId,
      streamingUrl,
      result: completeResult,
      progressMessages,
      progressData,
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Request cancelled" }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

/**
 * Cancel a running TinyFish agent
 */
export async function cancelTinyFishRun(runId: string): Promise<boolean> {
  const apiKey = getTinyFishApiKey()
  if (!apiKey || !runId) return false

  try {
    const response = await fetch(`https://agent.tinyfish.ai/v1/runs/${runId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Extract structured data from TinyFish result
 */
export function extractResultData(result: unknown): unknown[] {
  const extracted: unknown[] = []
  
  function recurse(obj: unknown) {
    if (!obj) return
    
    if (typeof obj === "string") {
      // Try to parse JSON from string
      try {
        const parsed = JSON.parse(obj)
        extracted.push(parsed)
      } catch {
        // Not JSON, skip
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(recurse)
    } else if (typeof obj === "object") {
      extracted.push(obj)
      Object.values(obj as Record<string, unknown>).forEach(recurse)
    }
  }
  
  recurse(result)
  return extracted
}
