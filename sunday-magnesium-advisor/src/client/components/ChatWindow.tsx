import { useState, useRef, useEffect } from "react";
import { useChat, RecommendedProduct } from "../hooks/useChat.js";
import { MessageBubble } from "./MessageBubble.js";
import { PipelineTracker } from "./PipelineTracker.js";
import { SuggestionBubbles } from "./SuggestionBubbles.js";
import { ConsentBanner, useConsent } from "./ConsentBanner.js";
import lotusImg from "../assets/lotus.png";

const INITIAL_SUGGESTIONS = [
  "Magnesium for stress and anxiety",
  "I need magnesium for better sleep",
  "What magnesium is best for muscle relaxation?",
  "Best general magnesium supplement",
];

const FORM_PILLS = [
  { emoji: "💊", label: "Capsule" },
  { emoji: "🔵", label: "Tablet" },
  { emoji: "🥄", label: "Powder" },
  { emoji: "💧", label: "Liquid" },
  { emoji: "🍬", label: "Gummy" },
];

interface ChatWindowProps {
  apiUrl?: string;
  locale?: string;
  onClose?: () => void;
  onReset?: () => void;
}

export function ChatWindow({ apiUrl = "", onClose, onReset }: ChatWindowProps) {
  const { messages, loading, pipelineSteps, sendMessage } = useChat(apiUrl);
  const [input, setInput] = useState("");
  const [refinementInput, setRefinementInput] = useState("");
  const [hasRefined, setHasRefined] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { state: consentState, accept: acceptConsent, decline: declineConsent } = useConsent();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setRefinementInput("");
    sendMessage(trimmed);
  };

  const handleRefinementSend = (text: string) => {
    setHasRefined(true);
    handleSend(text);
  };

  const handleReset = () => {
    setHasRefined(false);
    if (onReset) { onReset(); return; }
    window.location.reload();
  };

  const handleProductClick = (product: RecommendedProduct) => {
    fetch(`${apiUrl}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session",
        eventType: "ProductClicked",
        payload: { productId: product.id, productSlug: product.slug, productUrl: product.url },
      }),
    }).catch(() => {});
  };

  const lastMsg = messages[messages.length - 1];
  const showRefinement = !loading && !hasRefined && lastMsg?.role === "assistant" && (lastMsg.products?.length ?? 0) > 0;
  const showInitialSuggestions = messages.length === 0 && !loading;

  // Only offer form pills for forms NOT already present in the recommendations.
  // e.g. if all products are capsules, don't show the Capsule pill — it's a false choice.
  // Normalise to singular lowercase ("Capsules" → "capsule", "Tablets" → "tablet")
  const normalize = (s: string) => s.toLowerCase().replace(/s$/, "");
  const presentForms = new Set(
    (lastMsg?.products ?? []).map((p) => normalize(p.formFactor || p.form || ""))
  );
  // Only show pills for forms that ARE in the recommendations (not alternatives).
  // Multiple forms → let user pick their preference among what's actually available.
  const availableFormPills = FORM_PILLS.filter(
    ({ label }) => presentForms.has(normalize(label))
  );

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", background: "var(--chat-bg, #EEEAE5)",
      fontFamily: "Newsreader, Georgia, serif",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* ── GDPR consent banner ─────────────────────────────────── */}
      {consentState === "unknown" && (
        <ConsentBanner onAccept={acceptConsent} onDecline={declineConsent} />
      )}
      {consentState === "declined" && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "white",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 24, textAlign: "center", fontFamily: "Newsreader, serif",
        }}>
          <p style={{ fontSize: 14, color: "var(--bark)", marginBottom: 16 }}>
            You have declined data processing. The advisor is unavailable.
          </p>
          <button
            onClick={acceptConsent}
            style={{
              background: "var(--gold)", border: "none", borderRadius: 8,
              padding: "10px 24px", color: "white", fontFamily: "Newsreader, serif",
              fontSize: 13, cursor: "pointer",
            }}
          >
            Change my mind
          </button>
        </div>
      )}
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        background: "var(--gold, #C4A882)",
        padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            <img src={lotusImg} alt="Sunday Natural" style={{ width: 24, height: 24, objectFit: "contain" }} />
          </div>
          <span style={{
            color: "white", fontWeight: 700, fontSize: 14,
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            Sunday Natural
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleReset}
            title="Reset conversation"
            style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)", border: "none",
              color: "white", cursor: "pointer", fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ↺
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close"
              style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "rgba(255,255,255,0.2)", border: "none",
                color: "white", cursor: "pointer", fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 14px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        {/* Welcome card */}
        {messages.length === 0 && (
          <div style={{
            background: "white", borderRadius: 14,
            padding: "16px 18px", boxShadow: "var(--shadow-card)",
            animation: "fadeUp 0.35s ease",
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #d0cbc4, #b8b3ac)",
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              }}>
                <img src={lotusImg} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--bark)", margin: 0 }}>
                Hello 👋 I am your Sunday Natural Advisor. I can help you discover the best magnesium for you! 🌿
              </p>
            </div>
            <p style={{ fontSize: 13, color: "var(--stone)", marginBottom: 10 }}>Try one of these:</p>
            <SuggestionBubbles suggestions={INITIAL_SUGGESTIONS} onSelect={handleSend} />
          </div>
        )}

        {/* Pipeline tracker */}
        {loading && pipelineSteps.length > 0 && (
          <PipelineTracker steps={pipelineSteps} />
        )}

        {/* Message history */}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={i === messages.length - 1}
            onSuggestionClick={handleSend}
            onProductClick={handleProductClick}
          />
        ))}

        {/* Loading dots */}
        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #d0cbc4, #b8b3ac)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", flexShrink: 0,
            }}>
              <img src={lotusImg} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
            </div>
            <div style={{
              background: "white", borderRadius: "4px 18px 18px 18px",
              padding: "14px 18px", boxShadow: "var(--shadow-card)",
              display: "flex", gap: 5, alignItems: "center",
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "var(--gold)",
                  animation: `dotBounce 1.2s ${i * 0.15}s ease infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Refinement panel ───────────────────────────────────── */}
      {showRefinement && (
        <div style={{
          background: "white", borderTop: "1px solid var(--border)",
          padding: "12px 14px", flexShrink: 0,
        }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: "var(--bark)", margin: "0 0 8px 0" }}>
            Are these a good fit — or do you have special preferences?
          </p>
          {presentForms.size > 1 && availableFormPills.length > 0 && (
            <>
              <p style={{ fontSize: 10.5, color: "var(--stone)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px 0" }}>
                Try a different form
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {availableFormPills.map(({ emoji, label }) => (
                  <button
                    key={label}
                    onClick={() => handleRefinementSend(`I prefer ${label.toLowerCase()} form magnesium`)}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: 9999,
                      padding: "5px 12px",
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4,
                      fontFamily: "Newsreader, serif",
                      color: "var(--bark)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.background = "var(--gold-subtle)";
                      b.style.borderColor = "var(--gold)";
                    }}
                    onMouseLeave={(e) => {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.background = "transparent";
                      b.style.borderColor = "var(--border)";
                    }}
                  >
                    {emoji} {label}
                  </button>
                ))}
              </div>
            </>
          )}
          <input
            value={refinementInput}
            onChange={(e) => setRefinementInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRefinementSend(refinementInput)}
            placeholder="e.g. high dose, vegan, powder only..."
            style={{
              width: "100%", border: "1px solid var(--border)", borderRadius: 8,
              padding: "8px 12px", fontSize: 13, fontFamily: "Newsreader, serif",
              outline: "none", color: "var(--bark)", background: "var(--warm)",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* ── Input bar ──────────────────────────────────────────── */}
      <div style={{
        background: "white", padding: "10px 14px",
        borderTop: showRefinement ? "none" : "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend(input)}
            placeholder="Ask me about magnesium..."
            disabled={loading}
            style={{
              flex: 1, border: "1px solid var(--border)",
              borderRadius: 24, padding: "10px 16px",
              fontSize: 14, fontFamily: "Newsreader, serif",
              outline: "none", color: "var(--bark)",
              background: loading ? "var(--warm)" : "var(--chat-bg)",
            }}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 38, height: 38, borderRadius: "50%",
              background: loading || !input.trim() ? "var(--border)" : "var(--gold)",
              border: "none", color: "white", fontSize: 16,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s", flexShrink: 0,
            }}
          >
            ›
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 6, fontSize: 11, color: "var(--stone)" }}>
          ⚡ Powered by Sunday Natural
        </div>
      </div>
    </div>
  );
}
