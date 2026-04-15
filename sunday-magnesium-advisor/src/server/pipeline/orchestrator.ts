import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../logger.js";
import { classifyIntent } from "../agents/intent-classifier.js";
import { profileHealth } from "../agents/health-profiler.js";
import { retrieveProducts, ProductRetrievalResult } from "../agents/product-retriever.js";
import { matchProducts } from "../agents/embedding-matcher.js";
import { checkContraindications } from "../agents/contraindication-checker.js";
import { adviseDosage } from "../agents/dosage-advisor.js";
import { composeResponse } from "../agents/response-composer.js";
import { generateFollowUps } from "../agents/followup-generator.js";
import { PipelineContext, PipelineResult, Message } from "../types/pipeline.js";

const logger = createLogger("orchestrator");

export type StepStatus = "pending" | "running" | "done" | "error";
export type StepUpdate = {
  agentId: string;
  agentName: string;
  status: StepStatus;
  durationMs?: number;
};

export interface RunPipelineOptions {
  message: string;
  sessionId?: string;
  history?: Message[];
  locale?: string;
  debug?: boolean;
  onStep?: (update: StepUpdate) => void;
}

async function timed<T>(
  agentId: string,
  agentName: string,
  ctx: PipelineContext,
  onStep: ((u: StepUpdate) => void) | undefined,
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  onStep?.({ agentId, agentName, status: "running" });
  const start = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    delete ctx.agentErrors[agentId];
    onStep?.({ agentId, agentName, status: "done", durationMs });
    return { result, durationMs };
  } catch (err) {
    const durationMs = Date.now() - start;
    ctx.agentErrors[agentId] = err instanceof Error ? err.message : String(err);
    onStep?.({ agentId, agentName, status: "error", durationMs });
    throw err;
  }
}

export async function runPipeline(opts: RunPipelineOptions): Promise<PipelineResult> {
  const {
    message,
    sessionId = uuidv4(),
    history = [],
    locale = "en",
    debug = false,
    onStep,
  } = opts;

  const overallStart = Date.now();
  const agentDurations: Record<string, number> = {};

  const ctx: PipelineContext = {
    message,
    sessionId,
    history,
    locale,
    agentErrors: {},
  };

  logger.info({ sessionId, message: message.slice(0, 80) }, "Pipeline start");

  // ── Step 1: Intent Classification ─────────────────────────
  try {
    const { result, durationMs } = await timed("intent_classifier", "Intent", ctx, onStep, () =>
      classifyIntent(message)
    );
    ctx.intent = result;
    agentDurations.intent_classifier = durationMs;
  } catch {
    ctx.intent = {
      primary_intent: "general_wellness",
      health_signals: [],
      user_constraints: { dietary: [], form_preference: "any", budget_sensitivity: "unspecified" },
      urgency: "exploring",
      follow_up_needed: false,
      clarifying_question: null,
      detected_language: "en",
    };
  }

  // ── Short-circuit: clarifying question needed ─────────────
  if (ctx.intent.follow_up_needed && ctx.intent.clarifying_question) {
    return {
      response: ctx.intent.clarifying_question,
      suggestions: [
        "I have trouble sleeping",
        "My muscles cramp after exercise",
        "I feel stressed",
        "General magnesium supplement",
      ],
      products: [],
      sessionId,
      debug: debug ? ctx : undefined,
      metadata: {
        totalDurationMs: Date.now() - overallStart,
        agentDurations,
        locale,
      },
    };
  }

  // ── Step 2: Product Retrieval via MCP (reco_fast_path) ────
  // This replaces both the old health-profiler + product-retriever +
  // embedding-matcher, as the MCP already runs a full pipeline internally.
  let retrievalResult: ProductRetrievalResult = {
    products: [],
    healthSummary: "",
    magnesiumBackground: "",
    category: "",
    mcpResult: { success: false, is_valid: false, recommendations: [] },
  };

  try {
    const { result, durationMs } = await timed("product_retriever", "Products", ctx, onStep, () =>
      retrieveProducts(message)
    );
    retrievalResult = result;
    ctx.products = result.products;
    agentDurations.product_retriever = durationMs;
  } catch {
    ctx.products = [];
  }

  // ── Step 3: Health Profiling (enriches with form rankings) ─
  try {
    const { result, durationMs } = await timed("health_profiler", "Profile", ctx, onStep, () =>
      profileHealth(message, ctx.intent!)
    );
    ctx.healthProfile = result;
    agentDurations.health_profiler = durationMs;
  } catch {
    ctx.healthProfile = {
      profile_summary: retrievalResult.healthSummary || "General magnesium support.",
      magnesium_forms_ranked: [{ form: "glycinate", relevance_score: 0.9, reason: "Well-tolerated" }],
      contraindication_flags: ["none"],
      dosage_range_mg: { min: 200, max: 400 },
      absorption_priority: "standard",
      companion_nutrients: ["none"],
    };
  }

  // ── Step 4: Embedding re-ranking ──────────────────────────
  try {
    const { result, durationMs } = await timed("embedding_matcher", "Match", ctx, onStep, () =>
      matchProducts(message, ctx.products!)
    );
    ctx.recommendedProducts = result;
    agentDurations.embedding_matcher = durationMs;
  } catch {
    ctx.recommendedProducts = ctx.products?.slice(0, 3).map((p, i) => ({
      ...p,
      matchScore: 1 - i * 0.1,
      matchReasons: [p.whyRecommended],
      relevanceRank: i + 1,
    })) ?? [];
  }

  // ── Step 5: Contraindication Check ───────────────────────
  try {
    const { result, durationMs } = await timed("contraindication_checker", "Safety", ctx, onStep, () =>
      checkContraindications(message, ctx.intent!, ctx.healthProfile!)
    );
    ctx.safetyCheck = result;
    agentDurations.contraindication_checker = durationMs;
  } catch {
    ctx.safetyCheck = {
      safety_status: "clear",
      flags: ["none"],
      general_advice: "Magnesium is generally well-tolerated.",
      disclaimer: "Always consult a healthcare professional before starting supplements.",
    };
  }

  // ── Step 6: Dosage Advice ─────────────────────────────────
  try {
    const { result, durationMs } = await timed("dosage_advisor", "Dosage", ctx, onStep, () =>
      adviseDosage(ctx.healthProfile!, ctx.safetyCheck!)
    );
    ctx.dosagePlan = result;
    agentDurations.dosage_advisor = durationMs;
  } catch {
    ctx.dosagePlan = {
      daily_target_mg: 300,
      split_doses: 2,
      timing: ["150mg with lunch", "150mg with dinner"],
      duration: "4-8 weeks",
      onset_expectation: "2-4 weeks for noticeable results",
      absorption_tips: ["Take with food"],
    };
  }

  // ── Step 7: Response Composition ─────────────────────────
  try {
    const { result, durationMs } = await timed("response_composer", "Compose", ctx, onStep, () =>
      composeResponse(
        message,
        ctx.intent!,
        ctx.healthProfile!,
        ctx.recommendedProducts!,
        ctx.safetyCheck!,
        ctx.dosagePlan!,
        history,
        retrievalResult.healthSummary
      )
    );
    ctx.response = result;
    agentDurations.response_composer = durationMs;
  } catch {
    ctx.response =
      "I would be happy to help you find the right magnesium supplement. Could you tell me more about your specific health goals?";
  }

  // ── Step 8: Follow-up Generation ─────────────────────────
  try {
    const { result, durationMs } = await timed("followup_generator", "Suggest", ctx, onStep, () =>
      generateFollowUps(message, ctx.intent!, ctx.recommendedProducts!)
    );
    ctx.suggestions = result;
    agentDurations.followup_generator = durationMs;
  } catch {
    ctx.suggestions = [
      "What is the best time to take magnesium",
      "How long until I notice results",
      "Can I take this with other supplements",
    ];
  }

  const totalDurationMs = Date.now() - overallStart;
  logger.info({ sessionId, totalDurationMs, errors: Object.keys(ctx.agentErrors) }, "Pipeline complete");

  return {
    response: ctx.response!,
    suggestions: ctx.suggestions!,
    products: ctx.recommendedProducts!,
    sessionId,
    debug: debug ? ctx : undefined,
    metadata: { totalDurationMs, agentDurations, locale },
  };
}
