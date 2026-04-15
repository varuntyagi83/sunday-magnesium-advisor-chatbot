import { config } from "../config.js";
import { runGeminiAgent } from "../pipeline/agent-runner.js";
import { UserIntent, FollowUpOutput, FollowUpOutputSchema } from "../types/pipeline.js";
import { RecommendedProduct } from "../products/types.js";

const SYSTEM_PROMPT = `You are the Follow-up Generator for Sunday Natural's magnesium advisor.

Generate 2-4 short, natural follow-up questions or statements the user might want to explore next.
These appear as clickable suggestion bubbles in the chat interface.

Rules:
- Each suggestion: 5-12 words
- Write as the user would say it (first person)
- Make them genuinely useful and contextually relevant
- Vary the topics: dosage, form comparison, lifestyle, specific concerns
- No bullet points, no numbering in the strings themselves

Respond ONLY with valid JSON:
{ "suggestions": ["string", "string", "string"] }`;

const FALLBACK: FollowUpOutput = {
  suggestions: [
    "What is the difference between glycinate and citrate",
    "How long until I notice results",
    "Can I take magnesium with my other supplements",
  ],
};

export async function generateFollowUps(
  message: string,
  intent: UserIntent,
  products: RecommendedProduct[]
): Promise<string[]> {
  const topProduct = products[0];
  const userMessage = `User asked: "${message}"
Intent: ${intent.primary_intent}
Health signals: ${JSON.stringify(intent.health_signals)}
Recommended product: ${topProduct?.name ?? "magnesium glycinate"}
Form: ${topProduct?.form ?? "glycinate"}

Generate 3 relevant follow-up suggestions.`;

  try {
    const result = await runGeminiAgent({
      model: config.GEMINI_MODEL_REASONING,
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      schema: FollowUpOutputSchema,
      temperature: 0.5,
      maxOutputTokens: 200,
      responseMimeType: "application/json",
    });
    return result.suggestions;
  } catch {
    return FALLBACK.suggestions;
  }
}
