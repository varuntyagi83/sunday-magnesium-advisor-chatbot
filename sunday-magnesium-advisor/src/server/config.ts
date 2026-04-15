import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  // Gemini — single LLM provider for all agents
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL_FAST: z.string().default("gemini-2.5-flash"),
  GEMINI_MODEL_REASONING: z.string().default("gemini-2.5-pro"),

  // Custom MCP endpoint (Sunday Natural's own — NOT Supabase, NOT n8n)
  MCP_ENDPOINT_URL: z.string().url("MCP_ENDPOINT_URL must be a valid URL"),
  MCP_AUTH_TOKEN: z.string().min(1, "MCP_AUTH_TOKEN is required"),
  MCP_TRANSPORT: z.enum(["http", "sse"]).default("http"),

  // Embeddings — chatbot READS pre-computed embeddings, never generates product embeddings
  EMBEDDINGS_SOURCE: z.enum(["mcp", "api", "bigquery"]).default("mcp"),
  EMBEDDINGS_API_URL: z.string().url().optional(),
  EMBEDDING_MODEL: z.string().default("text-embedding-004"),
  EMBEDDINGS_REFRESH_INTERVAL_MIN: z.coerce.number().default(30),
  OPENAI_API_KEY: z.string().optional(),

  // Analytics
  BIGQUERY_PROJECT_ID: z.string().optional(),
  BIGQUERY_DATASET: z.string().optional(),

  // Caching
  REDIS_URL: z.string().url().optional(),

  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("debug"),
  RATE_LIMIT_RPM: z.coerce.number().default(10),
});

function loadConfig() {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${missing}`);
  }

  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
