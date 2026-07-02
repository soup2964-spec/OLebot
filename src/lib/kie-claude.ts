/**
 * KIE AI — Anthropic-style Claude messages API.
 * @see https://docs.kie.ai/
 */

import { fetchWithTimeout } from "./fetch-timeout";

const KIE_MESSAGES_URL =
  process.env.KIE_API_URL ?? "https://api.kie.ai/claude/v1/messages";

export const KIE_MODEL = process.env.KIE_MODEL ?? "claude-opus-4-8";

export type KieChatOptions = {
  model?: string;
  maxTokens?: number;
  thinkingFlag?: boolean;
  temperature?: number;
};

type KieContentBlock =
  | { type: "text"; text: string }
  | { type: string; text?: string; thinking?: string };

function apiKey(): string {
  const key = process.env.KIE_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("KIE_API_KEY is not set (or set LLM_PROVIDER=openai with OPENAI_API_KEY)");
  }
  return key;
}

/** Strip markdown fences and parse JSON from model text. */
export function parseJSONFromModelText<T>(raw: string): T {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }

  return JSON.parse(text) as T;
}

function extractTextContent(data: {
  content?: KieContentBlock[];
  stop_reason?: string;
  type?: string;
}): string {
  const blocks = data.content ?? [];
  const textParts: string[] = [];
  const fallbackParts: string[] = [];

  for (const block of blocks) {
    if (block.type === "text" && block.text) {
      textParts.push(block.text);
      continue;
    }
    if (block.type === "thinking" && block.thinking) {
      fallbackParts.push(block.thinking);
      continue;
    }
    if (block.text) fallbackParts.push(block.text);
  }

  if (textParts.length) return textParts.join("\n");
  if (fallbackParts.length) return fallbackParts.join("\n");

  const anyData = data as { text?: string; output?: string; message?: { content?: string } };
  if (anyData.text) return anyData.text;
  if (anyData.output) return anyData.output;
  if (typeof anyData.message?.content === "string") return anyData.message.content;

  const preview = JSON.stringify(data).slice(0, 400);
  throw new Error(
    `KIE returned no text content (stop_reason=${data.stop_reason ?? "unknown"}): ${preview}`
  );
}

export async function kieChatJSON<T>(
  system: string,
  user: string,
  opts: KieChatOptions = {}
): Promise<T> {
  // Extended thinking can return thinking blocks with no JSON text block.
  const thinkingFlag = opts.thinkingFlag === true;

  const body: Record<string, unknown> = {
    model: opts.model ?? KIE_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    stream: false,
    thinkingFlag,
    system: `${system}\n\nRespond with ONLY valid JSON. No markdown, no prose outside the JSON object.`,
    messages: [{ role: "user", content: user }],
  };

  if (opts.temperature !== undefined) {
    body.temperature = opts.temperature;
  }

  const res = await fetchWithTimeout(KIE_MESSAGES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`KIE request failed (${res.status}): ${errBody.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    code?: number;
    msg?: string;
    content?: KieContentBlock[];
  };

  if (data.code != null && data.code !== 200 && data.code !== 0) {
    throw new Error(`KIE request failed (${data.code}): ${data.msg ?? "unknown error"}`);
  }

  const text = extractTextContent(data);
  return parseJSONFromModelText<T>(text);
}

export async function kieChatJSONRetry<T>(
  system: string,
  user: string,
  opts: KieChatOptions = {},
  attempts = 3
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await kieChatJSON<T>(system, user, {
        ...opts,
        thinkingFlag: false,
        maxTokens: (opts.maxTokens ?? 4096) + i * 1500,
      });
    } catch (err) {
      lastErr = err;
      if (err instanceof Error && /Credits insufficient|KIE request failed \(402\)/i.test(err.message)) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}
