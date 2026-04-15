import { PipelineStep } from "../hooks/useChat.js";

const ICONS: Record<string, string> = {
  intent_classifier:        "🎯",
  health_profiler:          "🧬",
  product_retriever:        "🔍",
  embedding_matcher:        "📊",
  contraindication_checker: "🛡️",
  dosage_advisor:           "⚖️",
  response_composer:        "✨",
  followup_generator:       "💬",
};

interface Props {
  steps: PipelineStep[];
}

export function PipelineTracker({ steps }: Props) {
  if (steps.every((s) => s.status === "pending")) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 12px",
        background: "var(--warm)",
        borderRadius: 10,
        overflowX: "auto",
        marginBottom: 8,
        flexWrap: "nowrap",
      }}
    >
      {steps.map((step, i) => (
        <div key={step.agentId} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontFamily: "Newsreader, serif",
              whiteSpace: "nowrap",
              transition: "all 0.3s",
              background:
                step.status === "done"
                  ? "rgba(91,140,90,0.22)"
                  : step.status === "error"
                  ? "rgba(200,80,80,0.15)"
                  : step.status === "running"
                  ? "transparent"
                  : "transparent",
              border:
                step.status === "running"
                  ? "1px solid var(--sage)"
                  : step.status === "done"
                  ? "1px solid transparent"
                  : "1px solid transparent",
              animation: step.status === "running" ? "pulse 1.5s ease infinite" : "none",
              color:
                step.status === "done"
                  ? "var(--sage-dark)"
                  : step.status === "running"
                  ? "var(--sage)"
                  : "var(--stone)",
            }}
          >
            <span>{ICONS[step.agentId] ?? "⚙️"}</span>
            <span>{step.agentName}</span>
            {step.status === "done" && <span>✓</span>}
          </div>
          {i < steps.length - 1 && (
            <span style={{ color: "var(--stone)", fontSize: 10 }}>›</span>
          )}
        </div>
      ))}
    </div>
  );
}
