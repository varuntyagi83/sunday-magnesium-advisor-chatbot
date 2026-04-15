import { config } from "../config.js";
import { runGeminiAgent } from "../pipeline/agent-runner.js";
import { UserIntent, UserIntentSchema } from "../types/pipeline.js";

const SYSTEM_PROMPT = `You are the Intent Classifier agent for Sunday Natural's magnesium product advisor.

Your ONLY job: analyze the user's message and classify their intent into structured JSON.
Respond ONLY with valid JSON matching the schema exactly. No markdown, no explanation.

Schema:
{
  "primary_intent": "symptom_relief" | "general_wellness" | "specific_form" | "comparison" | "dosage_question" | "contraindication_check" | "price_inquiry",
  "health_signals": array of zero or more: "sleep" | "muscle" | "stress" | "energy" | "bone" | "heart" | "digestion" | "migraine" | "pregnancy",
  "user_constraints": {
    "dietary": array of: "vegan" | "gluten_free" | "organic" | "no_additives",
    "form_preference": "capsule" | "powder" | "liquid" | "tablet" | "any",
    "budget_sensitivity": "low" | "medium" | "high" | "unspecified"
  },
  "urgency": "exploring" | "ready_to_buy" | "needs_education",
  "follow_up_needed": true | false,
  "clarifying_question": "string or null",
  "detected_language": "de" | "en" | "fr"
}

Signal mappings:
- "can't sleep", "trouble sleeping", "insomnia" → ["sleep"]
- "muscle cramps", "cramping", "legs cramp" → ["muscle"]
- "stressed", "anxious", "anxiety" → ["stress"]
- "tired", "fatigue", "low energy" → ["energy"]
- "bone health", "osteoporosis" → ["bone"]
- "heart", "cardiovascular" → ["heart"]
- "constipation", "digestion", "gut" → ["digestion"]
- "migraine", "headache" → ["migraine"]
- "pregnant", "pregnancy" → ["pregnancy"]

CRITICAL RULES for follow_up_needed:
- Set follow_up_needed=FALSE for the vast majority of messages. Any health signal (sleep, muscle, stress, etc.) is enough to make a recommendation.
- Only set follow_up_needed=TRUE if the message has ZERO health signals AND ZERO intent (e.g., a single word like "help" or a completely unrelated topic).
- NEVER ask about form preference or dietary restrictions — the product database handles that.
- "I have trouble sleeping" → follow_up_needed=false
- "I feel stressed" → follow_up_needed=false
- "recommend something" → follow_up_needed=true (no signals at all)`;

const FALLBACK: UserIntent = {
  primary_intent: "general_wellness",
  health_signals: [],
  user_constraints: { dietary: [], form_preference: "any", budget_sensitivity: "unspecified" },
  urgency: "exploring",
  follow_up_needed: false,
  clarifying_question: null,
  detected_language: "en",
};

export async function classifyIntent(message: string): Promise<UserIntent> {
  try {
    return await runGeminiAgent({
      model: config.GEMINI_MODEL_FAST,
      systemPrompt: SYSTEM_PROMPT,
      userMessage: message,
      schema: UserIntentSchema,
      temperature: 0.1,
      maxOutputTokens: 500,
      responseMimeType: "application/json",
    });
  } catch {
    return FALLBACK;
  }
}
