type AiMessage = { role: "system" | "user" | "assistant"; content: string };

export type JsonSchema = Record<string, unknown>;

export function isAiConfigured() {
  return Boolean(process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL);
}

function aiEndpoint() {
  const base = process.env.AI_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("AI_BASE_URL is not configured");
  return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) ?? trimmed.match(/(\{[\s\S]*\})/);
  return match?.[1]?.trim() ?? trimmed;
}

export async function chatCompletionJson<T>(input: { messages: AiMessage[]; fallback: T; timeoutMs?: number }) {
  if (!isAiConfigured()) return { data: input.fallback, provider: "fallback" as const, reason: "ai_not_configured" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? Number(process.env.AI_TIMEOUT_MS ?? 30_000));
  try {
    const response = await fetch(aiEndpoint(), {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.AI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        messages: input.messages,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) throw new Error(`AI provider failed (${response.status}): ${text.slice(0, 500)}`);
    const body = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI provider returned empty content");
    return { data: JSON.parse(extractJson(content)) as T, provider: "llm" as const };
  } catch (error) {
    return { data: input.fallback, provider: "fallback" as const, reason: error instanceof Error ? error.message : "unknown_ai_error" };
  } finally {
    clearTimeout(timeout);
  }
}
