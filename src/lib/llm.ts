/**
 * Minimal LLM client (OpenAI-compatible chat completions, JSON output).
 * No SDK dependency; model + key from env.
 */

const API_URL = process.env.OPENAI_BASE_URL
  ? `${process.env.OPENAI_BASE_URL}/chat/completions`
  : "https://api.openai.com/v1/chat/completions";

export const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

export async function chatJSON<T>(
  system: string,
  user: string,
  opts: { temperature?: number; model?: string; maxTokens?: number } = {}
): Promise<T> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts.model ?? LLM_MODEL,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty response");
  return JSON.parse(content) as T;
}

/** Retry wrapper for transient failures / malformed JSON. */
export async function chatJSONRetry<T>(
  system: string,
  user: string,
  opts: { temperature?: number; model?: string; maxTokens?: number } = {},
  attempts = 3
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await chatJSON<T>(system, user, opts);
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}
