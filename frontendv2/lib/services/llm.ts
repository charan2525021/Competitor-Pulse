import { createGroq } from "@ai-sdk/groq"
import { generateText } from "ai"

// LLM Configuration
export interface LLMConfig {
  provider: "groq" | "openai" | "ollama"
  apiKey?: string
  model?: string
  baseUrl?: string
}

// Runtime LLM config
let runtimeConfig: LLMConfig = {
  provider: "groq",
  model: "llama-3.3-70b-versatile"
}

export function setLLMConfig(config: Partial<LLMConfig>) {
  runtimeConfig = { ...runtimeConfig, ...config }
}

export function getLLMConfig(): LLMConfig {
  return { ...runtimeConfig }
}

/**
 * Call the configured LLM
 */
export async function callLLM(
  prompt: string,
  options: {
    systemPrompt?: string
    jsonMode?: boolean
    maxTokens?: number
  } = {}
): Promise<{ success: boolean; text?: string; error?: string }> {
  const config = getLLMConfig()
  
  try {
    if (config.provider === "groq") {
      return await callGroq(prompt, options)
    } else if (config.provider === "openai") {
      return await callOpenAI(prompt, options)
    } else if (config.provider === "ollama") {
      return await callOllama(prompt, options)
    }
    
    return { success: false, error: "Unknown LLM provider" }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "LLM call failed"
    }
  }
}

/**
 * Call Groq LLM
 */
async function callGroq(
  prompt: string,
  options: { systemPrompt?: string; jsonMode?: boolean; maxTokens?: number }
): Promise<{ success: boolean; text?: string; error?: string }> {
  const apiKey = runtimeConfig.apiKey || process.env.GROQ_API_KEY
  
  if (!apiKey) {
    return { success: false, error: "Groq API key not configured" }
  }

  const groq = createGroq({ apiKey })
  
  const messages: Array<{ role: "system" | "user"; content: string }> = []
  
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt })
  }
  messages.push({ role: "user", content: prompt })

  try {
    const { text } = await generateText({
      model: groq(runtimeConfig.model || "llama-3.3-70b-versatile"),
      messages,
      maxTokens: options.maxTokens || 4096,
    })

    return { success: true, text }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Groq call failed"
    }
  }
}

/**
 * Call OpenAI LLM
 */
async function callOpenAI(
  prompt: string,
  options: { systemPrompt?: string; jsonMode?: boolean; maxTokens?: number }
): Promise<{ success: boolean; text?: string; error?: string }> {
  const apiKey = runtimeConfig.apiKey || process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    return { success: false, error: "OpenAI API key not configured" }
  }

  const messages: Array<{ role: string; content: string }> = []
  
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt })
  }
  messages.push({ role: "user", content: prompt })

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: runtimeConfig.model || "gpt-4o-mini",
      messages,
      max_tokens: options.maxTokens || 4096,
      response_format: options.jsonMode ? { type: "json_object" } : undefined,
    }),
  })

  if (!response.ok) {
    return { success: false, error: `OpenAI API error: ${response.status}` }
  }

  const data = await response.json()
  return { success: true, text: data.choices?.[0]?.message?.content }
}

/**
 * Call Ollama LLM (local)
 */
async function callOllama(
  prompt: string,
  options: { systemPrompt?: string; jsonMode?: boolean; maxTokens?: number }
): Promise<{ success: boolean; text?: string; error?: string }> {
  const baseUrl = runtimeConfig.baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434"
  
  const fullPrompt = options.systemPrompt 
    ? `${options.systemPrompt}\n\n${prompt}` 
    : prompt

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: runtimeConfig.model || "llama3.1",
        prompt: fullPrompt,
        format: options.jsonMode ? "json" : undefined,
        stream: false,
      }),
    })

    if (!response.ok) {
      return { success: false, error: `Ollama error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, text: data.response }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ollama connection failed"
    }
  }
}

/**
 * Extract JSON from LLM response
 */
export function parseJSONFromLLM(text: string): unknown | null {
  // Try direct parse
  try {
    return JSON.parse(text)
  } catch {
    // Continue to other strategies
  }

  // Try code block extraction
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch {
      // Continue
    }
  }

  // Try regex match for JSON object/array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1])
    } catch {
      // Continue
    }
  }

  return null
}

/**
 * LLM-based data extraction from TinyFish results
 */
export async function llmExtract(
  context: string,
  extractionPrompt: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const prompt = `
Context from web scraping:
${context}

${extractionPrompt}

Respond with valid JSON only.
`

  const result = await callLLM(prompt, { jsonMode: true })
  
  if (!result.success || !result.text) {
    return { success: false, error: result.error }
  }

  const parsed = parseJSONFromLLM(result.text)
  if (parsed) {
    return { success: true, data: parsed }
  }

  return { success: false, error: "Failed to parse LLM response as JSON" }
}
