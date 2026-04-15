import { config } from "../config.js";
import { createLogger } from "../logger.js";
import {
  RecoFastPathResult,
  RecoFastPathResultSchema,
  RecommendProductsResult,
} from "./types.js";

const logger = createLogger("mcp");

// ── Session management ─────────────────────────────────────────
// Each call requires an initialized session. We cache the session
// ID and re-use it; re-initialize on failure.
let cachedSessionId: string | null = null;

async function getSessionId(): Promise<string> {
  if (cachedSessionId) return cachedSessionId;
  return initSession();
}

async function initSession(): Promise<string> {
  const res = await fetch(config.MCP_ENDPOINT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${config.MCP_AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "sunday-advisor", version: "1.0" },
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const sessionId = res.headers.get("mcp-session-id");
  if (!sessionId) throw new Error("MCP initialize did not return a session ID");
  cachedSessionId = sessionId;
  logger.debug({ sessionId }, "MCP session initialized");
  return sessionId;
}

// ── JSON-RPC call via HTTP+SSE ─────────────────────────────────
async function callTool<T>(toolName: string, args: Record<string, unknown>): Promise<T> {
  const sessionId = await getSessionId();

  const res = await fetch(config.MCP_ENDPOINT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${config.MCP_AUTH_TOKEN}`,
      "Mcp-Session-Id": sessionId,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (res.status === 400 || res.status === 401) {
    // Session may have expired — re-init once
    cachedSessionId = null;
    throw new Error(`MCP returned ${res.status} — session may be expired`);
  }

  if (!res.ok) {
    throw new Error(`MCP tool ${toolName} returned ${res.status}`);
  }

  const text = await res.text();

  // Parse SSE: extract the data line
  const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
  if (!dataLine) throw new Error(`MCP tool ${toolName} returned no data line`);

  const rpc = JSON.parse(dataLine.slice(5).trim()) as {
    result?: { content?: { type: string; text: string }[]; structuredContent?: unknown; isError?: boolean };
    error?: { message: string };
  };

  if (rpc.error) throw new Error(`MCP RPC error: ${rpc.error.message}`);
  if (!rpc.result) throw new Error("MCP RPC returned no result");
  if (rpc.result.isError) throw new Error(`MCP tool ${toolName} returned isError=true`);

  // Prefer structuredContent, fall back to parsing text content
  if (rpc.result.structuredContent) return rpc.result.structuredContent as T;

  const textContent = rpc.result.content?.find((c) => c.type === "text")?.text;
  if (!textContent) throw new Error("MCP result has no text content");
  return JSON.parse(textContent) as T;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Full pipeline in one call: validates query, searches, extracts health context,
 * returns ranked product recommendations.
 */
export async function recoFastPath(userQuery: string): Promise<RecoFastPathResult> {
  let lastErr: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callTool<unknown>("reco_fast_path", { user_query: userQuery });
      return RecoFastPathResultSchema.parse(raw);
    } catch (err) {
      lastErr = err;
      cachedSessionId = null; // force re-init on retry
      logger.warn({ err, attempt }, "reco_fast_path failed — retrying");
    }
  }

  throw lastErr;
}

/**
 * Full pipeline with explicit user profile fields.
 */
export async function recommendProducts(params: {
  goal: string;
  age?: string;
  gender?: string;
  diet?: string;
  preferences?: string;
  allergies?: string;
  medical_history?: string;
  target_magnesium_form?: string;
  language?: string;
  user_query?: string;
}): Promise<RecommendProductsResult> {
  const raw = await callTool<unknown>("recommend_products", params);
  return RecoFastPathResultSchema.parse(raw);
}

/**
 * Health check — returns true if MCP is reachable.
 */
export async function testMcpConnection(): Promise<boolean> {
  try {
    await getSessionId();
    return true;
  } catch {
    return false;
  }
}
