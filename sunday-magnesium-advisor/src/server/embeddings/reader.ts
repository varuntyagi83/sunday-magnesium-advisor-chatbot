import { config } from "../config.js";
import { createLogger } from "../logger.js";
import { ProductEmbedding, EmbeddingsStoreResponseSchema } from "./types.js";

const logger = createLogger("embeddings");

// ── In-memory cache of pre-computed product embeddings ────────
let embeddingCache: ProductEmbedding[] = [];
let lastFetchedAt: Date | null = null;
let fetchError: string | null = null;

export function getEmbeddingsStatus() {
  return {
    loaded: embeddingCache.length > 0,
    count: embeddingCache.length,
    lastFetchedAt,
    error: fetchError,
  };
}

export function getCachedEmbeddings(): ProductEmbedding[] {
  return embeddingCache;
}

// ── Fetch pre-computed embeddings from your pipeline's store ──
export async function fetchProductEmbeddings(): Promise<ProductEmbedding[]> {
  switch (config.EMBEDDINGS_SOURCE) {
    case "mcp":
      return fetchFromMcp();
    case "api":
      return fetchFromApi();
    case "bigquery":
      logger.warn("BigQuery embeddings source not yet implemented — returning empty");
      return [];
    default:
      return [];
  }
}

async function fetchFromMcp(): Promise<ProductEmbedding[]> {
  const url = `${config.MCP_ENDPOINT_URL}/tools/get-product-embeddings`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.MCP_AUTH_TOKEN}`,
    },
    body: JSON.stringify({ category: "magnesium" }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`MCP get-product-embeddings returned ${res.status}`);
  }

  const raw = await res.json();
  return EmbeddingsStoreResponseSchema.parse(raw).embeddings;
}

async function fetchFromApi(): Promise<ProductEmbedding[]> {
  if (!config.EMBEDDINGS_API_URL) {
    throw new Error("EMBEDDINGS_API_URL is required when EMBEDDINGS_SOURCE=api");
  }

  const res = await fetch(`${config.EMBEDDINGS_API_URL}/products?category=magnesium`, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Embeddings API returned ${res.status}`);
  }

  const raw = await res.json();
  return EmbeddingsStoreResponseSchema.parse(raw).embeddings;
}

// ── Startup init + periodic refresh ──────────────────────────
export async function initEmbeddings() {
  await refreshEmbeddings();

  const intervalMs = config.EMBEDDINGS_REFRESH_INTERVAL_MIN * 60_000;
  setInterval(refreshEmbeddings, intervalMs);
}

async function refreshEmbeddings() {
  try {
    const fresh = await fetchProductEmbeddings();
    embeddingCache = fresh;
    lastFetchedAt = new Date();
    fetchError = null;
    logger.info(`Loaded ${fresh.length} pre-computed product embeddings`);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
    logger.warn({ err }, "Failed to fetch product embeddings — using last-known cache");
  }
}

// ── Query embedding (the ONE embedding generated at runtime) ──
export async function generateQueryEmbedding(text: string): Promise<number[]> {
  if (config.EMBEDDING_MODEL.startsWith("text-embedding-0")) {
    return generateGeminiEmbedding(text);
  }
  if (config.EMBEDDING_MODEL.startsWith("text-embedding-3")) {
    return generateOpenAIEmbedding(text);
  }
  throw new Error(`Unknown EMBEDDING_MODEL: ${config.EMBEDDING_MODEL}`);
}

async function generateGeminiEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1/models/${config.EMBEDDING_MODEL}:embedContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.GEMINI_API_KEY,
    },
    body: JSON.stringify({ content: { parts: [{ text }] } }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    throw new Error(`Gemini embedContent returned ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  if (!config.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for OpenAI embedding model");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: config.EMBEDDING_MODEL, input: text }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    throw new Error(`OpenAI embeddings returned ${res.status}`);
  }

  const data = await res.json() as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}
