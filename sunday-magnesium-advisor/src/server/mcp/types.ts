import { z } from "zod";

// ── Query ──────────────────────────────────────────────────────
export const MCPProductQuerySchema = z.object({
  category: z.string().optional(),
  form: z.string().optional(),
  healthGoal: z.string().optional(),
  minMg: z.number().optional(),
  maxPrice: z.number().optional(),
  formFactor: z.string().optional(),
  locale: z.enum(["de", "en", "fr"]).optional(),
  limit: z.number().default(10),
});
export type MCPProductQuery = z.infer<typeof MCPProductQuerySchema>;

// ── Product ────────────────────────────────────────────────────
export const MCPProductSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  slug: z.string(),
  url: z.string(),
  imageUrl: z.string(),
  price: z.number(),
  currency: z.string().default("EUR"),
  form: z.string(),
  mgPerServing: z.number(),
  servingsPerContainer: z.number(),
  formFactor: z.string(),
  isVegan: z.boolean(),
  isOrganic: z.boolean(),
  noAdditives: z.boolean(),
  bestFor: z.array(z.string()),
  ingredients: z.array(z.string()),
  description: z.string(),
  healthClaims: z.array(z.string()),
  inStock: z.boolean(),
  rating: z.number(),
  reviewCount: z.number(),
});
export type MCPProduct = z.infer<typeof MCPProductSchema>;

// ── Response ───────────────────────────────────────────────────
export const MCPProductResponseSchema = z.object({
  products: z.array(MCPProductSchema),
  total: z.number(),
  query: MCPProductQuerySchema,
});
export type MCPProductResponse = z.infer<typeof MCPProductResponseSchema>;
