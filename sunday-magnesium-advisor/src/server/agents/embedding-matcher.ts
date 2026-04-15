import { getCachedEmbeddings, generateQueryEmbedding } from "../embeddings/reader.js";
import { rankBySimilarity } from "../embeddings/similarity.js";
import { MCPProduct, RecommendedProduct } from "../products/types.js";
import { createLogger } from "../logger.js";

const logger = createLogger("embedding-matcher");

export async function matchProducts(
  userMessage: string,
  products: MCPProduct[]
): Promise<RecommendedProduct[]> {
  if (products.length === 0) return [];

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

  // Products already ranked by MCP — boost with embedding similarity if available
  const scored: RecommendedProduct[] = products.map((product, index) => {
    const mcpRankScore = 1 - index * 0.15; // 1.0, 0.85, 0.70 ...
    const embScore = similarityScores.get(product.id) ?? 0;
    const combined =
      similarityScores.size > 0
        ? mcpRankScore * 0.6 + embScore * 0.4
        : mcpRankScore;

    return {
      ...product,
      matchScore: Math.min(1, Math.max(0, combined)),
      matchReasons: [product.whyRecommended].filter(Boolean),
      relevanceRank: index + 1,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, 3).map((p, i) => ({ ...p, relevanceRank: i + 1 }));
}
