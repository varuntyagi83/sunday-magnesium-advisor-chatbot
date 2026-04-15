import { config } from "../config.js";
import { runGeminiAgent } from "../pipeline/agent-runner.js";
import { z } from "zod";
import {
  UserIntent,
  HealthProfile,
  SafetyCheck,
  DosagePlan,
  Message,
} from "../types/pipeline.js";
import { RecommendedProduct } from "../products/types.js";
import { getLangInstruction, getComposerFallback } from "../i18n.js";

const SYSTEM_PROMPT_BASE = `You are the Response Composer for Sunday Natural's magnesium advisor.

Write a warm, knowledgeable, concise recommendation under 200 words.
NO bullet lists. NO markdown headers. Natural paragraphs only.
Do NOT use hyphens, em dashes, or en dashes.

CRITICAL: Include at least one product recommendation with a clickable markdown link.
Format product links as: [Product Name](product_url)
The URL comes directly from the product data. Use it exactly as provided.

Tone: warm, expert, like a trusted health practitioner friend.
Weave safety notes naturally into the response.
End with an invitation to ask follow-up questions.`;

export async function composeResponse(
  message: string,
  intent: UserIntent,
  profile: HealthProfile,
  products: RecommendedProduct[],
  safety: SafetyCheck,
  dosage: DosagePlan,
  history: Message[],
  mcpHealthSummary = "",
  locale = "de"
): Promise<string> {
  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${getLangInstruction(locale)}`;
  const productList = products
    .slice(0, 3)
    .map(
      (p) =>
        `- ${p.name} (${p.form}, ${p.mgPerServing}mg, EUR${p.price}): ${p.url}\n  Match reasons: ${p.matchReasons.join("; ")}`
    )
    .join("\n");

  const conversationContext =
    history.length > 0
      ? `\nConversation history (last 3 turns):\n${history
          .slice(-3)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")}\n`
      : "";

  const userMessage = `User asked: "${message}"
${mcpHealthSummary ? `\nHealth context from product database:\n${mcpHealthSummary}\n` : ""}
${conversationContext}
Health profile: ${profile.profile_summary}
Top magnesium form: ${profile.magnesium_forms_ranked[0]?.form ?? "glycinate"}
Dosage: ${dosage.daily_target_mg}mg/day, ${dosage.split_doses} doses
Timing: ${dosage.timing.join(", ")}
Safety status: ${safety.safety_status}
Safety advice: ${safety.general_advice}

Products to recommend (use these URLs exactly):
${productList || "No specific products available. Recommend magnesium glycinate generally."}

Write a warm, helpful response under 200 words that recommends the best product(s) with clickable links.`;

  try {
    return await runGeminiAgent({
      model: config.GEMINI_MODEL_REASONING,
      systemPrompt,
      userMessage,
      schema: z.string(),
      temperature: 0.7,
      maxOutputTokens: 400,
      responseMimeType: "text/plain",
    });
  } catch {
    const fb = getComposerFallback(locale);
    const topProduct = products[0];
    if (topProduct) {
      return fb.withProduct(topProduct.name, topProduct.url, topProduct.form, topProduct.mgPerServing, safety.disclaimer);
    }
    return fb.withoutProduct(safety.disclaimer);
  }
}
