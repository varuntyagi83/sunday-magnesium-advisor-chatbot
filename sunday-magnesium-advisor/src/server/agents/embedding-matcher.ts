import { getCachedEmbeddings, generateQueryEmbedding } from "../embeddings/reader.js";
import { rankBySimilarity } from "../embeddings/similarity.js";
import { buildProductUrl } from "../products/url-builder.js";
import { MCPProduct, RecommendedProduct } from "../products/types.js";
import { HealthProfile } from "../types/pipeline.js";
import { createLogger } from "../logger.js";

const logger = createLogger("embedding-matcher");

const MCP_SCORE_WEIGHT = 0.6;
const EMBEDDING_SCORE_WEIGHT = 0.4;

export async function matchProducts(
  userMessage: string,
  products: MCPProduct[],
  profile: HealthProfile
): Promise<RecommendedProduct[]> {
  if (products.length === 0) {
    return getFallbackProducts();
  }

  // Generate ONE query embedding for the user's message
  let similarityScores: Map<string, number> = new Map();
  try {
    const queryEmbedding = await generateQueryEmbedding(userMessage);
    const cached = getCachedEmbeddings();

    if (cached.length > 0) {
      const ranked = rankBySimilarity(queryEmbedding, cached);
      for (const { productId, score } of ranked) {
        similarityScores.set(productId, score);
      }
    }
  } catch (err) {
    logger.warn({ err }, "Query embedding failed — using MCP order only");
  }

  // Build form relevance map from profile
  const formRelevance = new Map(
    profile.magnesium_forms_ranked.map((f) => [f.form.toLowerCase(), f.relevance_score])
  );

  const scored: RecommendedProduct[] = products.map((product, index) => {
    const mcpScore = formRelevance.get(product.form.toLowerCase()) ?? (1 - index * 0.1);
    const embScore = similarityScores.get(product.id) ?? 0;
    const combined =
      similarityScores.size > 0
        ? mcpScore * MCP_SCORE_WEIGHT + embScore * EMBEDDING_SCORE_WEIGHT
        : mcpScore;

    const matchReasons: string[] = [];
    if (formRelevance.has(product.form.toLowerCase())) {
      const form = profile.magnesium_forms_ranked.find(
        (f) => f.form.toLowerCase() === product.form.toLowerCase()
      );
      if (form) matchReasons.push(form.reason);
    }
    if (product.bestFor.some((b) => profile.magnesium_forms_ranked.some(() => true))) {
      matchReasons.push(`Suitable for: ${product.bestFor.slice(0, 2).join(", ")}`);
    }

    return {
      ...product,
      // Prefer URL from MCP, fall back to url-builder
      url: product.url || buildProductUrl(product.slug),
      matchScore: Math.min(1, combined),
      matchReasons: matchReasons.slice(0, 3),
      relevanceRank: 0,
    };
  });

  // Sort and assign rank
  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, 3).map((p, i) => ({ ...p, relevanceRank: i + 1 }));
}

function getFallbackProducts(): RecommendedProduct[] {
  return [];
}
