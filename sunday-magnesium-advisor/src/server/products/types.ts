import { z } from "zod";

export type { MCPProduct } from "../mcp/types.js";

export const RecommendedProductSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  slug: z.string(),
  url: z.string(),
  imageUrl: z.string(),
  price: z.number(),
  currency: z.string(),
  form: z.string(),
  mgPerServing: z.number(),
  formFactor: z.string(),
  description: z.string(),
  healthClaims: z.array(z.string()),
  inStock: z.boolean(),
  whyRecommended: z.string(),
  cautions: z.string(),
  unit: z.string(),
  matchScore: z.number().min(0).max(1),
  matchReasons: z.array(z.string()),
  relevanceRank: z.number().int().min(1),
});
export type RecommendedProduct = z.infer<typeof RecommendedProductSchema>;
