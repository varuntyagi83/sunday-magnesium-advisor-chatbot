import { z } from "zod";
import { MCPProductSchema } from "../mcp/types.js";

export type { MCPProduct } from "../mcp/types.js";

export const RecommendedProductSchema = MCPProductSchema.extend({
  matchScore: z.number().min(0).max(1),
  matchReasons: z.array(z.string()),
  relevanceRank: z.number().int().min(1),
});
export type RecommendedProduct = z.infer<typeof RecommendedProductSchema>;
