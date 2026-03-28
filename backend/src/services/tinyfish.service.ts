import { callGroq, getLLMConfig } from "../llm/groq.client";
import { callOpenAI } from "../llm/openai.client";
import { callOllama } from "../llm/ollama.client";

/** Call the currently configured LLM */
async function callCurrentLLM(prompt: string, jsonMode: boolean): Promise<string> {
  const config = getLLMConfig();
  const provider = config?.provider || "groq";
  switch (provider) {
    case "openai": return callOpenAI(prompt, jsonMode);
    case "meta": return callOllama(prompt, jsonMode);
    default: return callGroq(prompt, jsonMode);
  }
}

export async function runTinyFishAgent(
  url: string,
  goal: string,
  onStream?: (friendlyMsg: string, rawData?: any) => void,
  options?: { signal?: AbortSignal }
): Promise<any> {
  const apiKey = process.env.TINYFISH_API_KEY_RUNTIME || process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    throw new Error("TINYFISH_API_KEY not configured — set it in the Settings panel or .env file");
  }

  const controller = new AbortController();
  const externalSignal = options?.signal;

  // Link external abort signal
  if (externalSignal) {
    if (externalSignal.aborted) { controller.abort(); }
    else { externalSignal.addEventListener("abort", () => controller.abort(), { once: true }); }
  }

  let response: globalThis.Response;
  try {
    response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, goal }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { type: "COMPLETE", status: "ABORTED", _progressMessages: [], _progressData: [] };
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(`TinyFish API error: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("No response body from TinyFish");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let finalResult: any = null;
  let allProgressMessages: string[] = [];
  let allProgressData: any[] = [];
  let buffer = "";

  try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const cleaned = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed;
      if (!cleaned) continue;

      try {
        const parsed = JSON.parse(cleaned);
        const friendly = toFriendlyMessage(parsed);
        if (friendly) {
          onStream?.(friendly, parsed);
        }

        // Capture ALL progress messages — these often contain the actual scraped data
        if (parsed.type === "PROGRESS") {
          if (parsed.purpose) allProgressMessages.push(parsed.purpose);
          if (parsed.message) allProgressMessages.push(parsed.message);
          if (parsed.data) allProgressData.push(parsed.data);
          // Capture any text content from progress events
          if (parsed.content) allProgressMessages.push(typeof parsed.content === "string" ? parsed.content : JSON.stringify(parsed.content));
          if (parsed.result) allProgressMessages.push(typeof parsed.result === "string" ? parsed.result : JSON.stringify(parsed.result));
          if (parsed.output) allProgressMessages.push(typeof parsed.output === "string" ? parsed.output : JSON.stringify(parsed.output));
        }

        if (parsed.type === "COMPLETE") {
          finalResult = parsed;
          // Log everything for debugging
          console.log("[TinyFish] COMPLETE keys:", Object.keys(parsed));
          console.log("[TinyFish] COMPLETE raw (1500 chars):", JSON.stringify(parsed).substring(0, 1500));
          // Also capture the result text as a progress message so llmExtract can use it
          if (parsed.result) {
            const resultStr = typeof parsed.result === "string" ? parsed.result : JSON.stringify(parsed.result);
            allProgressMessages.push("=== FINAL RESULT ===");
            allProgressMessages.push(resultStr);
          }
          if (parsed.output) {
            const outputStr = typeof parsed.output === "string" ? parsed.output : JSON.stringify(parsed.output);
            allProgressMessages.push("=== FINAL OUTPUT ===");
            allProgressMessages.push(outputStr);
          }
          if (parsed.message && typeof parsed.message === "string" && parsed.message.length > 50) {
            allProgressMessages.push("=== FINAL MESSAGE ===");
            allProgressMessages.push(parsed.message);
          }
          if (parsed.answer) {
            const answerStr = typeof parsed.answer === "string" ? parsed.answer : JSON.stringify(parsed.answer);
            allProgressMessages.push("=== FINAL ANSWER ===");
            allProgressMessages.push(answerStr);
          }
          if (parsed.text) {
            const textStr = typeof parsed.text === "string" ? parsed.text : JSON.stringify(parsed.text);
            allProgressMessages.push("=== FINAL TEXT ===");
            allProgressMessages.push(textStr);
          }
        }
      } catch {
        // Non-JSON line, skip
      }
    }
  }

  // Attach all collected context to the result for LLM fallback
  if (finalResult) {
    finalResult._progressMessages = allProgressMessages;
    finalResult._progressData = allProgressData;
  } else {
    // Even if no COMPLETE event, return what we gathered from progress
    finalResult = {
      type: "COMPLETE",
      status: "PARTIAL",
      _progressMessages: allProgressMessages,
      _progressData: allProgressData,
    };
  }

  return finalResult;

  } catch (err: any) {
    // On abort, return partial results
    if (err.name === "AbortError") {
      return {
        type: "COMPLETE",
        status: "ABORTED",
        _progressMessages: allProgressMessages,
        _progressData: allProgressData,
      };
    }
    throw err;
  }
}

/**
 * Extract structured data from TinyFish's COMPLETE response.
 * Tries direct extraction first, then falls back to LLM parsing.
 */
export function extractResultData(completeEvent: any): any[] {
  if (!completeEvent) return [];

  // Collect ALL string values and objects from the event
  const allStrings: string[] = [];
  const allObjects: any[] = [];

  function collectValues(obj: any, depth = 0) {
    if (depth > 5) return;
    if (typeof obj === "string") {
      allStrings.push(obj);
    } else if (Array.isArray(obj)) {
      if (obj.length > 0 && typeof obj[0] === "object") {
        allObjects.push(...obj);
      }
      obj.forEach((item) => collectValues(item, depth + 1));
    } else if (obj && typeof obj === "object") {
      for (const val of Object.values(obj)) {
        collectValues(val, depth + 1);
      }
    }
  }

  collectValues(completeEvent);

  // If we found object arrays directly, return them
  if (allObjects.length > 0) {
    return allObjects;
  }

  // Try to extract JSON from all collected strings
  for (const text of allStrings) {
    if (text.length < 5) continue;
    const extracted = extractJsonFromText(text);
    if (extracted.length > 0) return extracted;
  }

  return [];
}

/**
 * LLM-powered extraction fallback.
 * Sends the raw TinyFish response + progress messages to Groq
 * with a task-specific prompt to get structured JSON back.
 */
export async function llmExtract(completeEvent: any, extractionPrompt: string): Promise<any> {
  // Build context from everything TinyFish gave us
  const contextParts: string[] = [];

  // Add progress messages (these often contain the actual scraped content)
  const progressMsgs = completeEvent?._progressMessages || [];
  if (progressMsgs.length > 0) {
    contextParts.push("=== Agent Progress Messages ===");
    contextParts.push(progressMsgs.join("\n"));
  }

  // Add progress data objects
  const progressData = completeEvent?._progressData || [];
  if (progressData.length > 0) {
    contextParts.push("=== Agent Data Objects ===");
    contextParts.push(JSON.stringify(progressData, null, 2).substring(0, 5000));
  }

  // Add the COMPLETE event itself (minus our internal fields)
  if (completeEvent) {
    const cleaned = { ...completeEvent };
    delete cleaned._progressMessages;
    delete cleaned._progressData;
    const eventStr = JSON.stringify(cleaned, null, 2);
    if (eventStr.length > 10) {
      contextParts.push("=== Agent Final Result ===");
      contextParts.push(eventStr.substring(0, 5000));
    }
  }

  const rawContext = contextParts.join("\n\n");

  console.log("[LLM Extract] Context length:", rawContext.length, "chars, progress msgs:", progressMsgs.length);
  console.log("[LLM Extract] First 500 chars of context:", rawContext.substring(0, 500));

  if (rawContext.trim().length < 20) {
    console.log("[LLM Extract] Not enough context to extract from");
    return null;
  }

  const prompt = `You are a data extraction assistant. A web scraping agent visited a website and produced the following raw output. Extract the requested structured data from it.

${extractionPrompt}

IMPORTANT:
- Return ONLY valid JSON, no markdown, no explanation
- If the data is not present in the raw output, return null
- Extract as much relevant data as you can find

=== RAW AGENT OUTPUT ===
${rawContext}`;

  try {
    const result = await callCurrentLLM(prompt, true);
    console.log("[LLM Extract] Raw response (300 chars):", result.substring(0, 300));
    
    // Try direct parse first
    try { return JSON.parse(result); } catch {}
    
    // Try extracting JSON from markdown code blocks
    const codeBlock = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch {} }
    
    // Try finding JSON object in the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch {} }
    
    // Try finding JSON array
    const arrMatch = result.match(/\[[\s\S]*\]/);
    if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
    
    console.warn("[LLM Extract] Could not parse any JSON from response");
    return null;
  } catch (err) {
    console.warn("[LLM Extract] LLM call failed:", (err as Error).message);
    return null;
  }
}

function extractJsonFromText(text: string): any[] {
  // Try markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];
    } catch { /* continue */ }
  }

  // Try JSON array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* continue */ }
  }

  // Try JSON object
  const objMatches = text.match(/\{[\s\S]*\}/g);
  if (objMatches) {
    const sorted = objMatches.sort((a, b) => b.length - a.length);
    for (const m of sorted) {
      try {
        const parsed = JSON.parse(m);
        if (parsed && typeof parsed === "object") return [parsed];
      } catch { /* continue */ }
    }
  }

  return [];
}

function toFriendlyMessage(data: any): string | null {
  switch (data.type) {
    case "STARTED":
      return "AI agent started working";
    case "STREAMING_URL":
      return "Connected to live browser session";
    case "PROGRESS":
      return data.purpose || data.message || "Working...";
    case "HEARTBEAT":
      return null;
    case "COMPLETE":
      return data.status === "COMPLETED"
        ? "Step completed successfully"
        : `Step finished with status: ${data.status}`;
    case "ERROR":
      return `Error: ${data.message || "Something went wrong"}`;
    default:
      return null;
  }
}
