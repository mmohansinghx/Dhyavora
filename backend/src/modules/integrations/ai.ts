import { env } from "../../config/env.js";

export type AIMessage = { role: "system" | "user"; content: string };
export interface AIProvider { complete(messages: AIMessage[]): Promise<string> }

class OpenAIProvider implements AIProvider {
  async complete(messages: AIMessage[]) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal: AbortSignal.timeout(30000),
      headers: { authorization: `Bearer ${env.AI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: env.AI_MODEL, messages, temperature: 0.3 }),
    });
    if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}.`);
    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI provider returned no text.");
    return content;
  }
}

class GeminiProvider implements AIProvider {
  async complete(messages: AIMessage[]) {
    const contents = messages.filter((item) => item.role === "user").map((item) => ({ role: "user", parts: [{ text: item.content }] }));
    const systemInstruction = messages.find((item) => item.role === "system")?.content;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.AI_MODEL!)}:generateContent`;
    const response = await fetch(endpoint, { method: "POST", signal: AbortSignal.timeout(30000), headers: { "content-type": "application/json", "x-goog-api-key": env.AI_API_KEY! }, body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction ?? "" }] }, contents, generationConfig: { temperature: 0.3 } }) });
    if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}.`);
    const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const content = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!content) throw new Error("AI provider returned no text.");
    return content;
  }
}

export function getAIProvider(): AIProvider | undefined {
  if (!env.AI_API_KEY || !env.AI_MODEL) return undefined;
  if (env.AI_PROVIDER === "openai") return new OpenAIProvider();
  if (env.AI_PROVIDER === "gemini") return new GeminiProvider();
  return undefined;
}
