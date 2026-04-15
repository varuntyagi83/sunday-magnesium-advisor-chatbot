import { config } from "../config.js";
import { createLogger } from "../logger.js";
import {
  MCPProductQuery,
  MCPProductResponse,
  MCPProductResponseSchema,
  MCPProduct,
} from "./types.js";

const logger = createLogger("mcp");

const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${config.MCP_AUTH_TOKEN}`,
};

async function callTool<T>(tool: string, body: unknown): Promise<T> {
  const url = `${config.MCP_ENDPOINT_URL}/tools/${tool}`;
  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  });

  if (!res.ok) {
    throw new Error(`MCP tool ${tool} returned ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

// ── Public API ─────────────────────────────────────────────────

export async function queryProducts(query: MCPProductQuery): Promise<MCPProductResponse> {
  try {
    const raw = await callTool<unknown>("query-products", query);
    return MCPProductResponseSchema.parse(raw);
  } catch (err) {
    logger.warn({ err, query }, "MCP queryProducts failed — returning empty result");
    return { products: [], total: 0, query };
  }
}

export async function getProductById(id: string): Promise<MCPProduct | null> {
  try {
    const raw = await callTool<{ product: unknown }>("get-product-by-id", { id });
    const result = MCPProductResponseSchema.shape.products.element.safeParse(raw.product);
    return result.success ? result.data : null;
  } catch (err) {
    logger.warn({ err, id }, "MCP getProductById failed");
    return null;
  }
}

export async function getProductCategories(): Promise<string[]> {
  try {
    const raw = await callTool<{ categories: string[] }>("get-product-categories", {});
    return raw.categories;
  } catch (err) {
    logger.warn({ err }, "MCP getProductCategories failed");
    return [];
  }
}

export async function testMcpConnection(): Promise<boolean> {
  try {
    const cats = await getProductCategories();
    return cats.length >= 0;
  } catch {
    return false;
  }
}
