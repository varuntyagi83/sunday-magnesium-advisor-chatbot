import { config } from "../config.js";
import { runGeminiAgent } from "../pipeline/agent-runner.js";
import { UserIntent, HealthProfile, SafetyCheck, SafetyCheckSchema } from "../types/pipeline.js";

const SYSTEM_PROMPT = `You are the Safety Screening agent for Sunday Natural's magnesium advisor.

Analyze health signals for contraindications and safety considerations.
ALWAYS include a medical disclaimer. NEVER provide specific medical advice.
Respond ONLY with valid JSON.

Schema:
{
  "safety_status": "clear" | "caution" | "consult_doctor",
  "flags": array of: "kidney_disease" | "medication_interaction" | "pregnancy_high_dose" | "gi_sensitivity" | "heart_medication" | "none",
  "general_advice": "1-2 sentence general wellness guidance",
  "disclaimer": "Always consult a healthcare professional before starting any supplement, especially if you have medical conditions or take medications."
}

Rules:
- kidney disease mentioned → consult_doctor + kidney_disease flag
- medications mentioned (especially antibiotics, diuretics, heart meds) → caution + medication_interaction
- pregnancy → caution, recommend bisglycinate, lower dose (200-300mg), consult midwife
- GI issues with oxide/citrate → caution + gi_sensitivity
- Default: clear with standard disclaimer
- NEVER suggest specific diagnoses or claim to treat diseases`;

const FALLBACK: SafetyCheck = {
  safety_status: "clear",
  flags: ["none"],
  general_advice: "Magnesium is generally well-tolerated at recommended doses.",
  disclaimer:
    "Always consult a healthcare professional before starting any supplement, especially if you have medical conditions or take medications.",
};

export async function checkContraindications(
  message: string,
  intent: UserIntent,
  profile: HealthProfile
): Promise<SafetyCheck> {
  const userMessage = `User message: "${message}"\nHealth signals: ${JSON.stringify(intent.health_signals)}\nContraindication flags: ${JSON.stringify(profile.contraindication_flags)}`;

  try {
    return await runGeminiAgent({
      model: config.GEMINI_MODEL_REASONING,
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      schema: SafetyCheckSchema,
      temperature: 0.2,
      maxOutputTokens: 400,
      responseMimeType: "application/json",
    });
  } catch {
    return FALLBACK;
  }
}
