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
    generationConfig: { responseMimeType, temperature, maxOutputTokens },
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
        candidates: { content: { parts: { text: string }[] } }[];
        usageMetadata?: { totalTokenCount?: number };
      };

      const raw = data.candidates[0]?.content?.parts[0]?.text ?? "";

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
