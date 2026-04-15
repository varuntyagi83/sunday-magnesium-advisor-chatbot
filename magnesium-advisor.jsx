import { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// MULTI-AGENT PIPELINE ARCHITECTURE
// Each agent has a specialized system prompt and handles one step
// in the recommendation chain. The orchestrator runs them in
// sequence, passing structured JSON between agents.
// ═══════════════════════════════════════════════════════════════

const AGENTS = [
  {
    id: "intent_classifier",
    name: "Intent Classifier",
    icon: "🎯",
    color: "#5B8C5A",
    description: "Understands what the user is really looking for",
    systemPrompt: `You are the Intent Classifier agent for Sunday Natural's magnesium product advisor.

Your ONLY job: analyze the user's message and classify their intent into structured JSON.

Respond ONLY with valid JSON, no markdown, no explanation. Schema:
{
  "primary_intent": "symptom_relief" | "general_wellness" | "specific_form" | "comparison" | "dosage_question" | "contraindication_check" | "price_inquiry",
  "health_signals": ["sleep", "muscle", "stress", "energy", "bone", "heart", "digestion", "migraine", "pregnancy"],
  "user_constraints": {
    "dietary": ["vegan", "gluten_free", "organic", "no_additives"],
    "form_preference": "capsule" | "powder" | "liquid" | "tablet" | "topical" | "any",
    "budget_sensitivity": "low" | "medium" | "high" | "unspecified"
  },
  "urgency": "exploring" | "ready_to_buy" | "needs_education",
  "follow_up_needed": true | false,
  "clarifying_question": "string or null"
}

If the message is vague, set follow_up_needed to true and provide a clarifying_question.
If the user mentions symptoms, map them to health_signals precisely.
"I can't sleep" → ["sleep"]. "My legs cramp after running" → ["muscle"]. "I feel anxious" → ["stress"].`
  },
  {
    id: "health_profiler",
    name: "Health Profiler",
    icon: "🧬",
    color: "#7B9E6B",
    description: "Builds a health context profile from signals",
    systemPrompt: `You are the Health Profiler agent for Sunday Natural's magnesium advisor.

You receive the classified intent JSON from the previous agent and the original user message.

Your job: expand the health signals into a detailed profile that maps to magnesium forms and benefits.

Respond ONLY with valid JSON:
{
  "profile_summary": "Brief 1-sentence description of user's needs",
  "magnesium_forms_ranked": [
    {
      "form": "glycinate" | "citrate" | "malate" | "threonate" | "taurate" | "oxide" | "chloride" | "bisglycinate",
      "relevance_score": 0.0-1.0,
      "reason": "Why this form fits their needs"
    }
  ],
  "contraindication_flags": ["kidney_disease", "medication_interaction", "pregnancy", "none"],
  "dosage_range_mg": { "min": 200, "max": 400 },
  "absorption_priority": "high" | "moderate" | "standard",
  "companion_nutrients": ["vitamin_d", "vitamin_b6", "zinc", "calcium", "none"]
}

Key mappings:
- Sleep → glycinate, threonate (calming, crosses blood-brain barrier)
- Muscle/cramps → malate, citrate (energy production, bioavailability)
- Stress/anxiety → glycinate, taurate (nervous system support)
- Energy → malate (Krebs cycle support)
- Bone health → citrate, with calcium + vitamin D
- Heart → taurate (cardiovascular support)
- Digestion → citrate, oxide (gentle laxative effect can help)
- Migraine → oxide (high dose), threonate, riboflavin companion
- Pregnancy → bisglycinate (gentle, well-absorbed)`
  },
  {
    id: "product_filter",
    name: "Product Filter",
    icon: "🔍",
    color: "#A0B78C",
    description: "Matches profile against Sunday Natural catalog",
    systemPrompt: `You are the Product Filter agent for Sunday Natural's magnesium advisor.

You receive the health profile JSON. Your job: search Sunday Natural's magnesium product catalog and return matching products.

Sunday Natural Magnesium Catalog (use this as your product database):

1. Magnesium Glycinat 300 — 300mg elemental Mg from magnesium bisglycinate, 120 capsules, vegan, no additives. Best for: sleep, stress, nervous system. €18.90
2. Magnesium Citrat 400 — 400mg from tri-magnesium dicitrate, 180 capsules, vegan. Best for: general wellness, muscle, bioavailability. €16.90
3. Magnesium Malat 300 — 300mg from magnesium malate, 120 capsules, vegan. Best for: energy, muscle fatigue, fibromyalgia. €17.90
4. Magnesium Threonate 140 — 140mg from magnesium L-threonate (Magtein), 90 capsules, vegan. Best for: cognitive, sleep, brain health. Premium. €24.90
5. Magnesium Taurate 200 — 200mg from magnesium taurate, 120 capsules, vegan. Best for: heart, cardiovascular, blood pressure. €19.90
6. Magnesium Komplex — 5-form complex (citrate, malate, bisglycinate, taurate, oxide), 300mg, 180 caps. Best for: broad spectrum, unsure which form. €21.90
7. Magnesium Citrat Pulver — 300mg powder form, citrate, 250g. Best for: people who dislike capsules, flexible dosing. €14.90
8. Magnesium Bisglycinat Pulver — 300mg powder, bisglycinate, 250g. Best for: sleep, powder preference, sensitive stomach. €19.90
9. Magnesium Liquid — 200mg liquid ionic magnesium chloride, 100ml. Best for: topical + oral, rapid absorption. €12.90
10. Magnesium Oxide 400 — 400mg from magnesium oxide, 180 tablets. Best for: high dose needs, migraine prevention, budget-friendly. €11.90
11. Magnesium + B6 — 300mg bisglycinate + pyridoxine, 90 capsules. Best for: PMS, stress, enhanced absorption. €16.90
12. Magnesium + Vitamin D3 + K2 — 300mg citrate + 2000IU D3 + 200μg K2, 90 capsules. Best for: bone health, immunity, winter support. €22.90

Respond ONLY with valid JSON:
{
  "matched_products": [
    {
      "id": 1,
      "name": "Product Name",
      "form": "glycinate",
      "mg_per_serving": 300,
      "price_eur": 18.90,
      "match_score": 0.0-1.0,
      "match_reasons": ["reason1", "reason2"],
      "form_factor": "capsule" | "powder" | "liquid" | "tablet"
    }
  ],
  "total_matches": 3,
  "filter_criteria_applied": ["form_preference", "health_signals", "dietary"]
}`
  },
  {
    id: "contraindication_checker",
    name: "Safety Checker",
    icon: "🛡️",
    color: "#D4A373",
    description: "Screens for interactions and safety flags",
    systemPrompt: `You are the Contraindication Checker agent for Sunday Natural's magnesium advisor.

You receive the health profile and matched products. Your job: flag any safety concerns.

IMPORTANT: You are NOT a doctor. You flag risks and recommend consulting a healthcare professional when relevant.

Check for:
- Kidney disease (magnesium accumulation risk)
- Blood pressure medication interactions (taurate)
- Antibiotics (chelation reduces absorption — space 2hrs)
- Bisphosphonates (bone meds — space 2hrs)  
- Diuretics (may increase magnesium loss)
- Pregnancy (only bisglycinate/citrate recommended, consult doctor)
- Diabetes medication (may affect blood sugar)
- High-dose oxide (GI distress above 400mg for sensitive individuals)

Respond ONLY with valid JSON:
{
  "safety_status": "clear" | "caution" | "consult_required",
  "flags": [
    {
      "severity": "info" | "caution" | "warning",
      "message": "Description of concern",
      "affected_products": [1, 4],
      "recommendation": "What to do"
    }
  ],
  "general_advice": "Spacing, timing, or general safety note",
  "disclaimer": "Always present: consult healthcare professional"
}`
  },
  {
    id: "dosage_advisor",
    name: "Dosage Advisor",
    icon: "⚖️",
    color: "#8B7355",
    description: "Calculates optimal dosage and timing",
    systemPrompt: `You are the Dosage Advisor agent for Sunday Natural's magnesium advisor.

You receive the health profile, matched products, and safety check. Your job: recommend specific dosing.

General guidelines (elemental magnesium):
- Adults: 300-400mg/day is standard
- Sleep: 200-400mg, 30-60min before bed
- Muscle: 300-400mg, post-workout or with meals
- Stress: 200-300mg, 2x daily (morning + evening)
- Migraine prevention: 400-600mg (split doses), oxide or threonate
- Pregnancy: 300-360mg, consult doctor first
- Threonate: 140mg (lower elemental but high brain bioavailability)

Respond ONLY with valid JSON:
{
  "dosage_plan": {
    "daily_target_mg": 300,
    "split_doses": false,
    "timing": [
      { "time": "evening", "amount_mg": 300, "with_food": true, "note": "30 min before bed" }
    ]
  },
  "duration": "ongoing" | "8_weeks" | "seasonal",
  "loading_phase": false,
  "onset_expectation": "1-2 weeks for sleep improvement, 4-6 weeks for full effect",
  "absorption_tips": ["Take with food", "Avoid high-calcium meals at same time", "Vitamin C enhances absorption"]
}`
  },
  {
    id: "response_composer",
    name: "Response Composer",
    icon: "✨",
    color: "#6B8E5B",
    description: "Crafts the final natural-language recommendation",
    systemPrompt: `You are the Response Composer agent for Sunday Natural's magnesium advisor.

You receive ALL previous agent outputs (intent, profile, products, safety, dosage) as a combined JSON context.

Your job: synthesize everything into a warm, knowledgeable, conversational response that:
1. Acknowledges the user's specific need
2. Recommends 1-3 products with clear reasoning (top match first)
3. Includes dosage guidance naturally in the text
4. Mentions any safety notes without being alarming
5. Suggests companion products if relevant
6. Ends with an invitation to ask more

Tone: knowledgeable naturopath friend — warm, confident, never pushy. Like a Sunday Natural brand ambassador who genuinely cares about health.

Format: Natural paragraphs, not bullet lists. Use product names naturally. Include prices.
Keep it under 200 words. Be specific, not generic.

NEVER say "based on the analysis" or "according to my data" — just speak naturally as if you know this deeply.
If the safety checker flagged anything, weave the caution in naturally (e.g., "Since you mentioned taking blood pressure medication, I'd suggest checking with your doctor about...").`
  },
  {
    id: "followup_generator",
    name: "Follow-up Agent",
    icon: "💬",
    color: "#9CAF88",
    description: "Generates contextual follow-up suggestions",
    systemPrompt: `You are the Follow-up Generator agent for Sunday Natural's magnesium advisor.

You receive the full pipeline context. Generate 2-3 smart follow-up suggestions the user might want to ask next.

Respond ONLY with valid JSON:
{
  "suggestions": [
    "Can I combine this with my vitamin D supplement?",
    "What about the powder form instead?",
    "How long until I notice a difference with sleep?"
  ]
}

Make them specific to the user's situation, not generic. Reference their actual health signals and the products recommended.`
  }
];

// ═══════════════════════════════════════════════════════════════
// PIPELINE ORCHESTRATOR
// Runs agents sequentially, passing context between them
// ═══════════════════════════════════════════════════════════════

async function runAgent(agent, messages) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: agent.systemPrompt,
        messages,
      }),
    });
    const data = await res.json();
    const text = data.content?.map((b) => (b.type === "text" ? b.text : "")).join("") || "";
    return text;
  } catch (err) {
    return JSON.stringify({ error: `Agent ${agent.name} failed: ${err.message}` });
  }
}

function tryParseJSON(str) {
  try {
    const cleaned = str.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function runPipeline(userMessage, conversationHistory, onStepUpdate) {
  const agentMap = {};
  AGENTS.forEach((a) => (agentMap[a.id] = a));
  const context = {};

  // Step 1: Intent Classification
  onStepUpdate("intent_classifier", "running");
  const intentRaw = await runAgent(agentMap.intent_classifier, [
    { role: "user", content: userMessage },
  ]);
  context.intent = tryParseJSON(intentRaw) || { raw: intentRaw };
  onStepUpdate("intent_classifier", "done");

  // If follow-up needed and no clear intent, return clarifying question
  if (context.intent.follow_up_needed && context.intent.clarifying_question) {
    onStepUpdate("response_composer", "running");
    const clarifyResponse = await runAgent(agentMap.response_composer, [
      {
        role: "user",
        content: `The user said: "${userMessage}"\n\nThe intent classifier needs more info. Suggested clarifying question: "${context.intent.clarifying_question}"\n\nCompose a warm, conversational response that naturally asks for this clarification. Don't mention agents or classifiers. Just be a helpful advisor asking a relevant question. Keep it under 60 words.`,
      },
    ]);
    onStepUpdate("response_composer", "done");
    return {
      response: clarifyResponse,
      suggestions: [],
      pipelineSteps: ["intent_classifier", "response_composer"],
      context,
    };
  }

  // Step 2: Health Profiling
  onStepUpdate("health_profiler", "running");
  const profileRaw = await runAgent(agentMap.health_profiler, [
    {
      role: "user",
      content: `User message: "${userMessage}"\n\nClassified intent:\n${JSON.stringify(context.intent, null, 2)}`,
    },
  ]);
  context.profile = tryParseJSON(profileRaw) || { raw: profileRaw };
  onStepUpdate("health_profiler", "done");

  // Step 3: Product Filtering
  onStepUpdate("product_filter", "running");
  const productsRaw = await runAgent(agentMap.product_filter, [
    {
      role: "user",
      content: `Health profile:\n${JSON.stringify(context.profile, null, 2)}\n\nUser constraints from intent:\n${JSON.stringify(context.intent.user_constraints, null, 2)}`,
    },
  ]);
  context.products = tryParseJSON(productsRaw) || { raw: productsRaw };
  onStepUpdate("product_filter", "done");

  // Step 4: Safety Check
  onStepUpdate("contraindication_checker", "running");
  const safetyRaw = await runAgent(agentMap.contraindication_checker, [
    {
      role: "user",
      content: `User message: "${userMessage}"\n\nHealth profile:\n${JSON.stringify(context.profile, null, 2)}\n\nMatched products:\n${JSON.stringify(context.products, null, 2)}`,
    },
  ]);
  context.safety = tryParseJSON(safetyRaw) || { raw: safetyRaw };
  onStepUpdate("contraindication_checker", "done");

  // Step 5: Dosage
  onStepUpdate("dosage_advisor", "running");
  const dosageRaw = await runAgent(agentMap.dosage_advisor, [
    {
      role: "user",
      content: `Health profile:\n${JSON.stringify(context.profile, null, 2)}\n\nTop product match:\n${JSON.stringify(context.products?.matched_products?.[0] || {}, null, 2)}\n\nSafety check:\n${JSON.stringify(context.safety, null, 2)}`,
    },
  ]);
  context.dosage = tryParseJSON(dosageRaw) || { raw: dosageRaw };
  onStepUpdate("dosage_advisor", "done");

  // Step 6: Compose Response
  onStepUpdate("response_composer", "running");
  const composedResponse = await runAgent(agentMap.response_composer, [
    ...conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    {
      role: "user",
      content: `User's latest message: "${userMessage}"

Full pipeline context:
- Intent: ${JSON.stringify(context.intent)}
- Health Profile: ${JSON.stringify(context.profile)}
- Matched Products: ${JSON.stringify(context.products)}
- Safety Check: ${JSON.stringify(context.safety)}
- Dosage Plan: ${JSON.stringify(context.dosage)}

Compose the final recommendation response now.`,
    },
  ]);
  onStepUpdate("response_composer", "done");

  // Step 7: Follow-up Suggestions
  onStepUpdate("followup_generator", "running");
  const followupRaw = await runAgent(agentMap.followup_generator, [
    {
      role: "user",
      content: `Pipeline context:\n${JSON.stringify(context, null, 2)}\n\nFinal response given: "${composedResponse}"`,
    },
  ]);
  const followups = tryParseJSON(followupRaw);
  onStepUpdate("followup_generator", "done");

  return {
    response: composedResponse,
    suggestions: followups?.suggestions || [],
    pipelineSteps: AGENTS.map((a) => a.id),
    context,
  };
}

// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════

const PipelineTracker = ({ steps }) => (
  <div style={{
    display: "flex", gap: 2, alignItems: "center", padding: "10px 0",
    flexWrap: "wrap",
  }}>
    {AGENTS.map((agent, i) => {
      const status = steps[agent.id] || "pending";
      return (
        <div key={agent.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            background: status === "done" ? `${agent.color}22`
              : status === "running" ? `${agent.color}44` : "#f5f1eb",
            border: status === "running" ? `1.5px solid ${agent.color}` : "1.5px solid transparent",
            transition: "all 0.4s ease",
            animation: status === "running" ? "pulse 1.5s ease infinite" : "none",
          }}>
            <span style={{ fontSize: 11 }}>{agent.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.03em",
              color: status === "done" ? agent.color : status === "running" ? agent.color : "#b8a99a",
              fontFamily: "'Newsreader', serif",
            }}>
              {agent.name}
            </span>
            {status === "done" && <span style={{ fontSize: 10, color: agent.color }}>✓</span>}
          </div>
          {i < AGENTS.length - 1 && (
            <span style={{
              color: status === "done" ? "#8B9A6B" : "#d4cdc4", fontSize: 10,
              transition: "color 0.4s ease",
            }}>›</span>
          )}
        </div>
      );
    })}
  </div>
);

const SuggestionChips = ({ suggestions, onSelect }) => (
  <div style={{
    display: "flex", gap: 8, flexWrap: "wrap", padding: "8px 0",
    animation: "fadeUp 0.5s ease",
  }}>
    {suggestions.map((s, i) => (
      <button key={i} onClick={() => onSelect(s)} style={{
        padding: "8px 14px", borderRadius: 20,
        border: "1px solid #c8bfb1", background: "#faf7f2",
        color: "#5B6B4A", fontSize: 12.5, fontFamily: "'Newsreader', serif",
        cursor: "pointer", transition: "all 0.2s ease",
        lineHeight: 1.4,
      }}
      onMouseEnter={(e) => {
        e.target.style.background = "#5B8C5A";
        e.target.style.color = "#fff";
        e.target.style.borderColor = "#5B8C5A";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "#faf7f2";
        e.target.style.color = "#5B6B4A";
        e.target.style.borderColor = "#c8bfb1";
      }}>
        {s}
      </button>
    ))}
  </div>
);

const MessageBubble = ({ msg }) => {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-start", gap: 12,
      maxWidth: "88%", alignSelf: isUser ? "flex-end" : "flex-start",
      animation: "fadeUp 0.35s ease",
    }}>
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "linear-gradient(135deg, #5B8C5A, #8FB87A)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, flexShrink: 0, marginTop: 2,
          boxShadow: "0 2px 8px rgba(91,140,90,0.25)",
        }}>🌿</div>
      )}
      <div>
        {!isUser && (
          <span style={{
            fontSize: 10.5, fontWeight: 600, color: "#8B9A6B",
            letterSpacing: "0.06em", textTransform: "uppercase",
            marginBottom: 4, display: "block",
            fontFamily: "'Newsreader', serif",
          }}>Sunday Natural Advisor</span>
        )}
        <div style={{
          padding: "14px 18px",
          borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
          background: isUser
            ? "linear-gradient(135deg, #5B8C5A, #6B9E5B)"
            : "#FFFFFF",
          color: isUser ? "#fff" : "#3D3928",
          fontSize: 14, lineHeight: 1.7,
          fontFamily: "'Newsreader', serif",
          boxShadow: isUser
            ? "0 3px 12px rgba(91,140,90,0.3)"
            : "0 1px 6px rgba(0,0,0,0.06)",
          whiteSpace: "pre-wrap",
        }}>
          {msg.content}
        </div>
        {msg.pipeline && (
          <PipelineTracker steps={msg.pipelineSteps || {}} />
        )}
        {msg.suggestions?.length > 0 && (
          <SuggestionChips suggestions={msg.suggestions} onSelect={msg.onSuggest} />
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function MagnesiumAdvisor() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome to Sunday Natural's magnesium advisor. I'll help you find the right magnesium for your specific needs.\n\nTell me what's going on — are you dealing with sleep issues, muscle tension, low energy, stress, or something else entirely? The more specific you are, the better I can match you.",
      suggestions: [
        "I have trouble falling asleep and staying asleep",
        "My muscles cramp after exercise",
        "I feel stressed and anxious most days",
        "I just want a good general magnesium supplement"
      ],
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState({});
  const [showDebug, setShowDebug] = useState(false);
  const [debugContext, setDebugContext] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, pipelineSteps]);

  const handleSend = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);
    setPipelineSteps({});

    const userMsg = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);

    // Build conversation history for context
    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    const onStepUpdate = (agentId, status) => {
      setPipelineSteps((prev) => ({ ...prev, [agentId]: status }));
    };

    try {
      const result = await runPipeline(msg, history, onStepUpdate);
      setDebugContext(result.context);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.response,
          pipeline: true,
          pipelineSteps: Object.fromEntries(
            result.pipelineSteps.map((id) => [id, "done"])
          ),
          suggestions: result.suggestions,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I ran into a technical issue processing your request. Could you try rephrasing? Error: ${err.message}`,
        },
      ]);
    }

    setLoading(false);
    setPipelineSteps({});
  }, [input, loading, messages]);

  // Attach onSuggest to last assistant message
  const displayMessages = messages.map((m, i) => {
    if (m.suggestions && i === messages.length - 1 && !loading) {
      return { ...m, onSuggest: (s) => handleSend(s) };
    }
    return m;
  });

  return (
    <div style={{
      "--sage": "#5B8C5A", "--sage-light": "#8FB87A",
      "--cream": "#FAF7F2", "--warm": "#F5F0E8",
      "--bark": "#3D3928", "--stone": "#8B8272",
      fontFamily: "'Newsreader', serif",
      background: "linear-gradient(180deg, #FAF7F2 0%, #F0EBE1 100%)",
      color: "var(--bark)",
      width: "100%", height: "100vh",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500;6..72,600;6..72,700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes leafSway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        input::placeholder { color: #b8a99a; }
        *::-webkit-scrollbar { width: 4px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: #d4cdc4; border-radius: 10px; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "18px 24px 14px",
        borderBottom: "1px solid #e8e0d4",
        background: "rgba(250,247,242,0.95)",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, #5B8C5A, #A0B78C)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, boxShadow: "0 2px 10px rgba(91,140,90,0.2)",
              animation: "leafSway 4s ease-in-out infinite",
            }}>🌿</div>
            <div>
              <h1 style={{
                margin: 0, fontSize: 18, fontWeight: 600,
                letterSpacing: "-0.01em", color: "#3D3928",
              }}>Sunday Natural</h1>
              <p style={{
                margin: 0, fontSize: 11.5, color: "#8B8272",
                fontWeight: 400, letterSpacing: "0.04em",
              }}>Magnesium Advisor · 7-Agent Pipeline</p>
            </div>
          </div>
          <button
            onClick={() => setShowDebug(!showDebug)}
            style={{
              padding: "6px 12px", borderRadius: 16,
              border: showDebug ? "1.5px solid #5B8C5A" : "1.5px solid #d4cdc4",
              background: showDebug ? "#5B8C5A15" : "transparent",
              color: showDebug ? "#5B8C5A" : "#b8a99a",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Newsreader', serif",
              transition: "all 0.2s ease",
              letterSpacing: "0.03em",
            }}>
            {showDebug ? "◉ Debug ON" : "○ Debug"}
          </button>
        </div>
      </div>

      {/* Pipeline Status (visible during loading) */}
      {loading && Object.keys(pipelineSteps).length > 0 && (
        <div style={{
          padding: "8px 24px",
          background: "#F5F0E8",
          borderBottom: "1px solid #e8e0d4",
        }}>
          <PipelineTracker steps={pipelineSteps} />
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto",
        padding: "20px 24px",
        display: "flex", flexDirection: "column", gap: 18,
      }}>
        {displayMessages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 0", animation: "fadeUp 0.3s ease",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #5B8C5A, #8FB87A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15,
            }}>🌿</div>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#5B8C5A", opacity: 0.5,
                  animation: `dotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
              <span style={{
                fontSize: 11, color: "#8B8272", marginLeft: 8,
                fontStyle: "italic",
              }}>
                {Object.values(pipelineSteps).filter(s => s === "running").length > 0
                  ? `Running ${AGENTS.find(a => pipelineSteps[a.id] === "running")?.name || ""}...`
                  : "Thinking..."}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      {showDebug && debugContext && (
        <div style={{
          maxHeight: 200, overflowY: "auto",
          padding: "12px 24px",
          background: "#2D2A20", color: "#C8C0A8",
          fontSize: 11, fontFamily: "monospace",
          borderTop: "2px solid #5B8C5A",
          lineHeight: 1.5,
        }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {JSON.stringify(debugContext, null, 2)}
          </pre>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: "14px 24px 22px",
        borderTop: "1px solid #e8e0d4",
        background: "rgba(250,247,242,0.95)",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{
          display: "flex", gap: 10, alignItems: "center",
          background: "#FFFFFF", borderRadius: 24,
          padding: "6px 6px 6px 20px",
          border: "1.5px solid #e0d8cc",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          transition: "border-color 0.2s ease",
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Describe your health goals or symptoms..."
            disabled={loading}
            style={{
              flex: 1, background: "transparent",
              border: "none", outline: "none",
              color: "#3D3928", fontSize: 14,
              fontFamily: "'Newsreader', serif",
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            style={{
              width: 42, height: 42, borderRadius: "50%",
              border: "none",
              background: loading || !input.trim()
                ? "#d4cdc4"
                : "linear-gradient(135deg, #5B8C5A, #6B9E5B)",
              color: "#fff", fontSize: 18,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s ease", flexShrink: 0,
              boxShadow: loading || !input.trim()
                ? "none"
                : "0 2px 10px rgba(91,140,90,0.3)",
            }}>↑</button>
        </div>
        <p style={{
          margin: "8px 0 0", fontSize: 10, color: "#b8a99a",
          textAlign: "center", letterSpacing: "0.02em",
        }}>
          This advisor is for informational purposes only. Always consult a healthcare professional for medical advice.
        </p>
      </div>
    </div>
  );
}
