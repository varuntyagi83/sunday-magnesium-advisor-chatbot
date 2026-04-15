import { z } from "zod";
import { RecommendedProductSchema } from "../products/types.js";

// ── Intent Classifier output ───────────────────────────────────
export const UserIntentSchema = z.object({
  primary_intent: z.enum([
    "symptom_relief",
    "general_wellness",
    "specific_form",
    "comparison",
    "dosage_question",
    "contraindication_check",
    "price_inquiry",
  ]),
  health_signals: z.array(
    z.enum(["sleep", "muscle", "stress", "energy", "bone", "heart", "digestion", "migraine", "pregnancy"])
  ),
  user_constraints: z.object({
    dietary: z.array(z.string()),
    form_preference: z.string(),
    budget_sensitivity: z.enum(["low", "medium", "high", "unspecified"]),
  }),
  urgency: z.enum(["exploring", "ready_to_buy", "needs_education"]),
  follow_up_needed: z.boolean(),
  clarifying_question: z.string().nullable(),
  detected_language: z.enum(["de", "en", "fr"]),
});
export type UserIntent = z.infer<typeof UserIntentSchema>;

// ── Health Profiler output ────────────────────────────────────
export const HealthProfileSchema = z.object({
  profile_summary: z.string(),
  magnesium_forms_ranked: z.array(
    z.object({
      form: z.string(),
      relevance_score: z.number().min(0).max(1),
      reason: z.string(),
    })
  ),
  contraindication_flags: z.array(z.string()),
  dosage_range_mg: z.object({ min: z.number(), max: z.number() }),
  absorption_priority: z.enum(["high", "moderate", "standard"]),
  companion_nutrients: z.array(z.string()),
});
export type HealthProfile = z.infer<typeof HealthProfileSchema>;

// ── Safety Check output ───────────────────────────────────────
export const SafetyCheckSchema = z.object({
  safety_status: z.enum(["clear", "caution", "consult_doctor"]),
  flags: z.array(z.string()),
  general_advice: z.string(),
  disclaimer: z.string(),
});
export type SafetyCheck = z.infer<typeof SafetyCheckSchema>;

// ── Dosage Plan output ────────────────────────────────────────
export const DosagePlanSchema = z.object({
  daily_target_mg: z.number(),
  split_doses: z.number(),
  timing: z.array(z.string()),
  duration: z.string(),
  onset_expectation: z.string(),
  absorption_tips: z.array(z.string()),
});
export type DosagePlan = z.infer<typeof DosagePlanSchema>;

// ── Follow-up suggestions output ─────────────────────────────
export const FollowUpOutputSchema = z.object({
  suggestions: z.array(z.string()).min(2).max(4),
});
export type FollowUpOutput = z.infer<typeof FollowUpOutputSchema>;

// ── Full pipeline context (built incrementally) ───────────────
export interface PipelineContext {
  message: string;
  sessionId: string;
  history: Message[];
  locale: string;
  intent?: UserIntent;
  healthProfile?: HealthProfile;
  products?: import("../products/types.js").MCPProduct[];
  recommendedProducts?: import("../products/types.js").RecommendedProduct[];
  safetyCheck?: SafetyCheck;
  dosagePlan?: DosagePlan;
  response?: string;
  suggestions?: string[];
  agentErrors: Record<string, string>;
}

// ── Pipeline result returned to client ───────────────────────
export interface PipelineResult {
  response: string;
  suggestions: string[];
  products: import("../products/types.js").RecommendedProduct[];
  sessionId: string;
  magnesiumBackground?: string;
  debug?: PipelineContext;
  metadata: {
    totalDurationMs: number;
    agentDurations: Record<string, number>;
    locale: string;
  };
}

// ── Message type for conversation history ────────────────────
export const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string().optional(),
});
export type Message = z.infer<typeof MessageSchema>;

// ── Chat request body ─────────────────────────────────────────
export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
  history: z.array(MessageSchema).optional(),
  locale: z.enum(["de", "en", "fr"]).optional(),
  debug: z.boolean().optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export { RecommendedProductSchema };
