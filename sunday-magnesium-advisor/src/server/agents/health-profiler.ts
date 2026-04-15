import { config } from "../config.js";
import { runGeminiAgent } from "../pipeline/agent-runner.js";
import { UserIntent, HealthProfile, HealthProfileSchema } from "../types/pipeline.js";

const SYSTEM_PROMPT = `You are the Health Profiler agent for Sunday Natural's magnesium advisor.

You receive the classified intent JSON and the original user message.
Your job: expand health signals into a detailed profile mapping to magnesium forms.
Respond ONLY with valid JSON.

Schema:
{
  "profile_summary": "Brief 1-sentence description of user needs",
  "magnesium_forms_ranked": [{ "form": string, "relevance_score": 0.0-1.0, "reason": string }],
  "contraindication_flags": array of: "kidney_disease" | "medication_interaction" | "pregnancy" | "gi_sensitivity" | "none",
  "dosage_range_mg": { "min": number, "max": number },
  "absorption_priority": "high" | "moderate" | "standard",
  "companion_nutrients": array of: "vitamin_d" | "vitamin_b6" | "zinc" | "calcium" | "riboflavin" | "none"
}

Key form mappings:
- Sleep → glycinate (0.95), threonate (0.85)
- Muscle/cramps → malate (0.90), citrate (0.80)
- Stress/anxiety → glycinate (0.90), taurate (0.80)
- Energy/fatigue → malate (0.90)
- Bone health → citrate (0.85) + calcium + vitamin_d
- Heart → taurate (0.90)
- Digestion → citrate (0.80), oxide (0.70)
- Migraine → oxide (0.80, high dose), threonate (0.70)
- Pregnancy → bisglycinate (0.95, gentle + well-absorbed)

Typical dosage ranges:
- General wellness: 200-400mg/day
- Therapeutic (sleep/stress): 300-450mg/day
- Athletes (muscle): 350-500mg/day`;

const FALLBACK: HealthProfile = {
  profile_summary: "Looking for a general magnesium supplement.",
  magnesium_forms_ranked: [
    { form: "glycinate", relevance_score: 0.9, reason: "Highly bioavailable, gentle on digestion" },
    { form: "citrate", relevance_score: 0.75, reason: "Good bioavailability and well tolerated" },
  ],
  contraindication_flags: ["none"],
  dosage_range_mg: { min: 200, max: 400 },
  absorption_priority: "standard",
  companion_nutrients: ["none"],
};

export async function profileHealth(
  message: string,
  intent: UserIntent
): Promise<HealthProfile> {
  const userMessage = `Original message: "${message}"\n\nIntent classification:\n${JSON.stringify(intent, null, 2)}`;

  try {
    return await runGeminiAgent({
      model: config.GEMINI_MODEL_REASONING,
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      schema: HealthProfileSchema,
      temperature: 0.3,
      maxOutputTokens: 800,
      responseMimeType: "application/json",
    });
  } catch {
    return FALLBACK;
  }
}
