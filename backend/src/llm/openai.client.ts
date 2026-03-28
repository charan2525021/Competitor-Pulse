import { getLLMConfig } from "./groq.client";

export async function callOpenAI(prompt: string, jsonMode = false): Promise<string> {
  const config = getLLMConfig();

  // Use runtime API key if provider is openai, otherwise fall back to env
  const apiKey = (config?.provider === "openai" && config.apiKey)
    ? config.apiKey
    : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const model = (config?.provider === "openai" && config.model)
    ? config.model
    : "gpt-3.5-turbo";

  const body: Record<string, any> = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}
