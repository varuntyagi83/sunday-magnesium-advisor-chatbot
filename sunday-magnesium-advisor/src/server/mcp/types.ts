import { z } from "zod";

// ── Real product data from the MCP server ─────────────────────
export const MCPProductMetaSchema = z.object({
  sku: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  product_view_name: z.string().optional(),
  product_url: z.string(),
  product_image_url: z.string().optional(),
  product_image_fullsize_url: z.string().optional(),
  product_unit: z.string().optional(),
  price: z.string(),
  store_base_currency_code: z.string().default("EUR"),
  reporting_product_form: z.string().optional(),
  subtitle: z.string().optional(),
  category_level_1: z.string().optional(),
  category_level_2: z.string().optional(),
  category_level_3: z.string().optional(),
  category_level_4: z.string().optional(),
  product_dosage: z.string().optional(),
  product_ingredients: z.string().optional(),
  product_effect: z.string().optional(),
});
export type MCPProductMeta = z.infer<typeof MCPProductMetaSchema>;

export const MCPRecommendationSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  source_category: z.string().optional(),
  why_recommended: z.string(),
  active_ingredients: z.string().optional(),
  cautions: z.string().optional(),
  meta: MCPProductMetaSchema,
});
export type MCPRecommendation = z.infer<typeof MCPRecommendationSchema>;

// ── reco_fast_path response ────────────────────────────────────
export const RecoFastPathResultSchema = z.object({
  success: z.boolean(),
  is_valid: z.boolean(),
  language: z.string().optional(),
  category: z.string().optional(),
  product_names: z.array(z.string()).optional(),
  health_benefits_summary: z.string().optional(),
  magnesium_background: z.string().optional(),
  recommendations: z.array(MCPRecommendationSchema),
  timings: z.record(z.number()).optional(),
});
export type RecoFastPathResult = z.infer<typeof RecoFastPathResultSchema>;

// ── recommend_products response (same shape) ──────────────────
export const RecommendProductsResultSchema = RecoFastPathResultSchema;
export type RecommendProductsResult = RecoFastPathResult;

// ── Convenience: legacy MCPProduct shape mapped from real data ─
export interface MCPProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  url: string;
  imageUrl: string;
  price: number;
  currency: string;
  form: string;
  mgPerServing: number;
  formFactor: string;
  description: string;
  healthClaims: string[];
  inStock: boolean;
  whyRecommended: string;
  cautions: string;
  unit: string;
}

export function mapToMCPProduct(rec: MCPRecommendation): MCPProduct {
  const m = rec.meta;
  return {
    id: m.product_id,
    sku: m.sku,
    name: rec.product_name,
    slug: m.product_name,
    url: m.product_url,
    imageUrl: m.product_image_url ?? "",
    price: parseFloat(m.price) || 0,
    currency: m.store_base_currency_code,
    form: extractForm(rec.active_ingredients ?? ""),
    mgPerServing: extractMg(m.product_view_name ?? ""),
    formFactor: m.reporting_product_form ?? "capsule",
    description: rec.why_recommended,
    healthClaims: [],
    inStock: true,
    whyRecommended: rec.why_recommended,
    cautions: rec.cautions ?? "",
    unit: m.product_unit ?? "",
  };
}

function extractForm(ingredients: string): string {
  const lower = ingredients.toLowerCase();
  if (lower.includes("bisglycinate") || lower.includes("glycinat")) return "glycinate";
  if (lower.includes("citrate") || lower.includes("citrat")) return "citrate";
  if (lower.includes("malate") || lower.includes("malat")) return "malate";
  if (lower.includes("taurate") || lower.includes("taurat")) return "taurate";
  if (lower.includes("threonate") || lower.includes("threonat")) return "threonate";
  if (lower.includes("oxide") || lower.includes("oxid")) return "oxide";
  return "complex";
}

function extractMg(viewName: string): number {
  const match = viewName.match(/(\d+)\s*mg/i);
  return match ? parseInt(match[1]) : 0;
}
