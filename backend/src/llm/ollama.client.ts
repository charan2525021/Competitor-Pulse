import { getLLMConfig } from "./groq.client";

export async function callOllama(prompt: string, jsonMode = false): Promise<string> {
  const config = getLLMConfig();
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = (config?.provider === "meta" && config.model) ? config.model : "llama3.1";

  const body: Record<string, any> = {
    model,
    prompt,
    stream: false,
  };

  if (jsonMode) {
    body.format = "json";
  }

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { response: string };
  return data.response;
}
