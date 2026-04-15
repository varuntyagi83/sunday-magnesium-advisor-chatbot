import { z } from "zod";
import { config } from "../config.js";
import { createLogger } from "../logger.js";

const logger = createLogger("agent-runner");

interface GeminiRunOptions<T> {
  model: string;
  systemPrompt: string;
  userMessage: string;
  schema: z.ZodType<T>;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: "application/json" | "text/plain";
}

export async function runGeminiAgent<T>(opts: GeminiRunOptions<T>): Promise<T> {
  const {
    model,
    systemPrompt,
    userMessage,
    schema,
    temperature = 0.3,
    maxOutputTokens = 1024,
    responseMimeType = "application/json",
  } = opts;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    generationConfig: {
      responseMimeType,
      temperature,
      maxOutputTokens,
      // Disable thinking budget — we don't need chain-of-thought for these structured agents
      // and it would consume maxOutputTokens before producing any real output
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  let lastErr: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": config.GEMINI_API_KEY,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });

      if (res.status === 429 || res.status >= 500) {
        const wait = attempt === 1 ? 1000 : 3000;
        logger.warn({ status: res.status, attempt }, `Gemini ${res.status} — retrying in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        lastErr = new Error(`Gemini returned ${res.status}`);
        continue;
      }

      if (!res.ok) {
        throw new Error(`Gemini returned ${res.status}: ${await res.text()}`);
      }

      const data = await res.json() as {
        candidates: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        usageMetadata?: { totalTokenCount?: number; thoughtsTokenCount?: number };
      };

      const candidate = data.candidates[0];
      if (candidate?.finishReason === "MAX_TOKENS") {
        throw new Error(`Gemini hit MAX_TOKENS — increase maxOutputTokens or switch to a non-thinking model`);
      }

      // Thinking models may split output across multiple parts; join all non-empty text parts
      const parts = candidate?.content?.parts ?? [];
      const raw = parts.map((p) => p.text ?? "").join("").trim();

      if (responseMimeType === "text/plain") {
        return raw as unknown as T;
      }

      const parsed: unknown = JSON.parse(raw);
      return schema.parse(parsed);
    } catch (err) {
      lastErr = err;
      if (attempt < 2) {
        logger.warn({ err, attempt }, "Agent run failed — retrying");
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  throw lastErr;
}
