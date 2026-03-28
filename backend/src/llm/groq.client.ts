// Runtime LLM config — set per-request from the frontend
let runtimeConfig: { provider: string; model: string; apiKey: string } | null = null;

export function setLLMConfig(config: { provider: string; model: string; apiKey: string } | null) {
  runtimeConfig = config;
}

export function getLLMConfig() {
  return runtimeConfig;
}

export async function callGroq(prompt: string, jsonMode = false): Promise<string> {
  // Use runtime API key if available, otherwise fall back to env
  const apiKey = (runtimeConfig?.provider === "groq" && runtimeConfig.apiKey)
    ? runtimeConfig.apiKey
    : process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Groq API key not configured");
  }

  const model = (runtimeConfig?.provider === "groq" && runtimeConfig.model)
    ? runtimeConfig.model
    : "llama-3.3-70b-versatile";

  console.log("[Groq] Using model:", model);

  const body: Record<string, any> = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 2048,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq error: ${res.status} ${res.statusText} ${errText}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}
