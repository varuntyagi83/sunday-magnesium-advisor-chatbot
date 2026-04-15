import { z } from "zod";

export const ProductEmbeddingSchema = z.object({
  productId: z.string(),
  embedding: z.array(z.number()),
  metadata: z
    .object({
      model: z.string(),
      generatedAt: z.string(),
    })
    .optional(),
});
export type ProductEmbedding = z.infer<typeof ProductEmbeddingSchema>;

export const EmbeddingsStoreResponseSchema = z.object({
  embeddings: z.array(ProductEmbeddingSchema),
});
