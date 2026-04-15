import { config } from "../config.js";
import { runGeminiAgent } from "../pipeline/agent-runner.js";
import { UserIntent, FollowUpOutput, FollowUpOutputSchema } from "../types/pipeline.js";
import { RecommendedProduct } from "../products/types.js";

const SYSTEM_PROMPT_BASE = `You are the Follow-up Generator for Sunday Natural's magnesium advisor.

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

const LANG_INSTRUCTION: Record<string, string> = {
  de: "WICHTIG: Schreibe alle Vorschläge auf Deutsch.",
  en: "IMPORTANT: Write all suggestions in English.",
};

const FALLBACK: Record<string, FollowUpOutput> = {
  de: {
    suggestions: [
      "Was ist der Unterschied zwischen Glycinat und Citrat",
      "Wann merke ich erste Ergebnisse",
      "Kann ich Magnesium mit anderen Supplements nehmen",
    ],
  },
  en: {
    suggestions: [
      "What is the difference between glycinate and citrate",
      "How long until I notice results",
      "Can I take magnesium with my other supplements",
    ],
  },
};

export async function generateFollowUps(
  message: string,
  intent: UserIntent,
  products: RecommendedProduct[],
  locale = "de"
): Promise<string[]> {
  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${LANG_INSTRUCTION[locale] ?? LANG_INSTRUCTION.de}`;
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
      systemPrompt,
      userMessage,
      schema: FollowUpOutputSchema,
      temperature: 0.5,
      maxOutputTokens: 200,
      responseMimeType: "application/json",
    });
    return result.suggestions;
  } catch {
    return (FALLBACK[locale] ?? FALLBACK.de).suggestions;
  }
}
