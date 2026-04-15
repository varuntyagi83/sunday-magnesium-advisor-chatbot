import { useState, useRef, useEffect } from "react";
import { useChat, RecommendedProduct } from "../hooks/useChat.js";
import { MessageBubble } from "./MessageBubble.js";
import { PipelineTracker } from "./PipelineTracker.js";
import { SuggestionBubbles } from "./SuggestionBubbles.js";

const INITIAL_SUGGESTIONS = [
  "I have trouble falling asleep and staying asleep",
  "My muscles cramp after exercise",
  "I feel stressed and anxious most days",
  "I just want a good general magnesium supplement",
];

export function ChatWindow() {
  const { messages, loading, pipelineSteps, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    sendMessage(trimmed);
  };

  const handleProductClick = (product: RecommendedProduct) => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session",
        eventType: "ProductClicked",
        payload: { productId: product.id, productSlug: product.slug, productUrl: product.url },
      }),
    }).catch(() => {});
  };

  const showInitialSuggestions = messages.length === 0 && !loading;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: 720,
        margin: "0 auto",
        background: "var(--cream)",
        fontFamily: "Newsreader, serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #5B8C5A, #8FB87A)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            🌿
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--bark)" }}>
              Magnesium Advisor
            </div>
            <div style={{ fontSize: 11, color: "var(--stone)" }}>Sunday Natural</div>
          </div>
        </div>
        <button
          onClick={() => setShowDebug((v) => !v)}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 11,
            color: "var(--stone)",
            cursor: "pointer",
            fontFamily: "Newsreader, serif",
          }}
        >
          {showDebug ? "Hide debug" : "Debug"}
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Welcome */}
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", animation: "fadeUp 0.35s ease" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "var(--bark)", marginBottom: 8 }}>
              Sunday Natural Magnesium Advisor
            </div>
            <div style={{ fontSize: 14, color: "var(--stone)", maxWidth: 380, margin: "0 auto" }}>
              Tell me about your health goals or symptoms and I will find the right magnesium for you.
            </div>
          </div>
        )}

        {/* Initial suggestion bubbles */}
        {showInitialSuggestions && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", padding: "0 8px" }}>
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
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #5B8C5A, #8FB87A)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              🌿
            </div>
            <div
              style={{
                background: "white",
                borderRadius: "20px 20px 20px 4px",
                padding: "14px 18px",
                boxShadow: "var(--shadow-card)",
                display: "flex",
                gap: 4,
                alignItems: "center",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--sage)",
                    animation: `dotBounce 1.2s ${i * 0.15}s ease infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          background: "white",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend(input)}
          placeholder="Describe your health goals or symptoms..."
          disabled={loading}
          style={{
            flex: 1,
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: "10px 18px",
            fontSize: 14,
            fontFamily: "Newsreader, serif",
            outline: "none",
            background: loading ? "var(--warm)" : "white",
            color: "var(--bark)",
          }}
        />
        <button
          onClick={() => handleSend(input)}
          disabled={loading || !input.trim()}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: loading || !input.trim() ? "var(--border)" : "var(--sage)",
            border: "none",
            color: "white",
            fontSize: 18,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>

      {/* Disclaimer */}
      <div
        style={{
          padding: "6px 16px 10px",
          textAlign: "center",
          fontSize: 10,
          color: "var(--stone)",
          background: "white",
          borderTop: "1px solid var(--border)",
        }}
      >
        This advisor uses AI for informational purposes only. Always consult a healthcare professional before starting supplements.
      </div>
    </div>
  );
}
