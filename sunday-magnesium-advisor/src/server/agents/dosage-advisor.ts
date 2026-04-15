import { config } from "../config.js";
import { runGeminiAgent } from "../pipeline/agent-runner.js";
import { HealthProfile, SafetyCheck, DosagePlan, DosagePlanSchema } from "../types/pipeline.js";

const SYSTEM_PROMPT = `You are the Dosage Advisor agent for Sunday Natural's magnesium advisor.

Create a practical dosing plan based on the health profile and safety check.
Respond ONLY with valid JSON.

Schema:
{
  "daily_target_mg": number,
  "split_doses": number,
  "timing": array of strings (e.g. "200mg with dinner", "100mg before bed"),
  "duration": string (e.g. "4-8 weeks for initial assessment"),
  "onset_expectation": string (e.g. "Most people notice improvements within 2-4 weeks"),
  "absorption_tips": array of strings (practical tips)
}

Guidelines:
- Start low, go slow: begin at 200mg/day, increase if tolerated
- Split doses improve absorption and reduce GI side effects
- Evening/bedtime timing benefits sleep and muscle relaxation
- Take with food for better tolerance
- Avoid taking with calcium (competes for absorption)
- Therapeutic range: 200-500mg/day elemental magnesium
- Do not exceed 400mg/day without practitioner guidance
- Onset for sleep: 1-2 weeks; muscle cramps: 2-4 weeks; energy: 4-8 weeks`;

const FALLBACK: DosagePlan = {
  daily_target_mg: 300,
  split_doses: 2,
  timing: ["150mg with lunch", "150mg with dinner"],
  duration: "4-8 weeks for initial assessment",
  onset_expectation: "Most people notice improvements within 2-4 weeks of consistent use.",
  absorption_tips: [
    "Take with food to improve absorption",
    "Avoid taking with calcium-rich foods",
    "Stay consistent — daily use is more effective than sporadic use",
  ],
};

export async function adviseDosage(
  profile: HealthProfile,
  safety: SafetyCheck
): Promise<DosagePlan> {
  const userMessage = `Health profile:\n${JSON.stringify(profile, null, 2)}\n\nSafety status: ${safety.safety_status}\nFlags: ${JSON.stringify(safety.flags)}`;

  try {
    return await runGeminiAgent({
      model: config.GEMINI_MODEL_REASONING,
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      schema: DosagePlanSchema,
      temperature: 0.2,
      maxOutputTokens: 600,
      responseMimeType: "application/json",
    });
  } catch {
    return FALLBACK;
  }
}
