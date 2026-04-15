import { recoFastPath } from "../mcp/client.js";
import { mapToMCPProduct, RecoFastPathResult } from "../mcp/types.js";
import { MCPProduct } from "../products/types.js";
import { createLogger } from "../logger.js";

const logger = createLogger("product-retriever");

export interface ProductRetrievalResult {
  products: MCPProduct[];
  healthSummary: string;
  magnesiumBackground: string;
  category: string;
  mcpResult: RecoFastPathResult;
}

export async function retrieveProducts(userMessage: string): Promise<ProductRetrievalResult> {
  try {
    const result = await recoFastPath(userMessage);

    const products = (result.recommendations ?? []).map(mapToMCPProduct);

    return {
      products,
      healthSummary: result.health_benefits_summary ?? "",
      magnesiumBackground: result.magnesium_background ?? "",
      category: result.category ?? "",
      mcpResult: result,
    };
  } catch (err) {
    logger.warn({ err }, "Product retriever failed — returning empty");
    return {
      products: [],
      healthSummary: "",
      magnesiumBackground: "",
      category: "",
      mcpResult: { success: false, is_valid: false, recommendations: [] },
    };
  }
}
