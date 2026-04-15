import { queryProducts } from "../mcp/client.js";
import { MCPProduct } from "../products/types.js";
import { HealthProfile } from "../types/pipeline.js";
import { createLogger } from "../logger.js";

const logger = createLogger("product-retriever");

export async function retrieveProducts(profile: HealthProfile): Promise<MCPProduct[]> {
  const topForm = profile.magnesium_forms_ranked[0];

  try {
    const result = await queryProducts({
      category: "magnesium",
      form: topForm?.form,
      minMg: profile.dosage_range_mg.min,
      locale: "en",
      limit: 8,
    });

    if (result.products.length < 3) {
      // Broaden query if few results
      const broader = await queryProducts({ category: "magnesium", locale: "en", limit: 8 });
      return broader.products;
    }

    return result.products;
  } catch (err) {
    logger.warn({ err }, "Product retriever failed — returning empty");
    return [];
  }
}
