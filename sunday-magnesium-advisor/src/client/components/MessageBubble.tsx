import { useState } from "react";
import { Message, RecommendedProduct } from "../hooks/useChat.js";
import { ProductCarousel } from "./ProductCarousel.js";
import { SuggestionBubbles } from "./SuggestionBubbles.js";
import lotusImg from "../assets/lotus.png";

interface Props {
  message: Message;
  isLast: boolean;
  onSuggestionClick: (text: string) => void;
  onProductClick?: (product: RecommendedProduct) => void;
}

function renderContent(text: string) {
  const parts = text.split(/(\[.+?\]\(.+?\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(.+?)\]\((.+?)\)$/);
    if (match) {
      return (
        <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--gold-dark)", textDecoration: "underline" }}>
          {match[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function MessageBubble({ message, isLast, onSuggestionClick, onProductClick }: Props) {
  const isUser = message.role === "user";
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", animation: "fadeUp 0.35s ease" }}>
        <div style={{ maxWidth: "70%" }}>
          <div style={{
            background: "var(--user-bubble)",
            color: "white",
            padding: "12px 16px",
            borderRadius: "18px 18px 4px 18px",
            fontSize: 14,
            lineHeight: 1.6,
            boxShadow: "var(--shadow-user)",
          }}>
            {message.content}
          </div>
          <div style={{ fontSize: 11, color: "var(--stone)", textAlign: "right", marginTop: 4 }}>
            Delivered
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: "fadeUp 0.35s ease" }}>
      {/* Lotus avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: "50%",
        background: "linear-gradient(135deg, #d0cbc4, #b8b3ac)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, overflow: "hidden",
      }}>
        <img src={lotusImg} alt="Sunday Natural" style={{ width: 22, height: 22, objectFit: "contain" }} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        {/* Text bubble */}
        {message.content && (
          <div style={{
            background: "white",
            borderRadius: "4px 18px 18px 18px",
            padding: "14px 16px",
            boxShadow: "var(--shadow-card)",
            fontSize: 14,
            lineHeight: 1.75,
            color: "var(--bark)",
          }}>
            {renderContent(message.content)}

            {/* Learn more collapsible */}
            {message.magnesiumBackground && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => setShowLearnMore(v => !v)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--gold-dark)", fontSize: 13, padding: 0,
                    fontFamily: "Newsreader, serif",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <span style={{ fontSize: 11 }}>►</span>
                  {showLearnMore ? "Hide" : "Learn more about this form"}
                </button>
                {showLearnMore && (
                  <div style={{
                    marginTop: 8, padding: "10px 12px",
                    background: "var(--gold-subtle)", borderRadius: 8,
                    fontSize: 13, color: "var(--stone)", lineHeight: 1.6,
                  }}>
                    {message.magnesiumBackground}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Product carousel */}
        {message.products && message.products.length > 0 && (
          <ProductCarousel products={message.products} onClickTrack={onProductClick} />
        )}

        {/* Performance Metrics collapsible */}
        {message.agentDurations && (
          <div>
            <button
              onClick={() => setShowMetrics(v => !v)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--gold-dark)", fontSize: 13, padding: 0,
                fontFamily: "Newsreader, serif",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 11 }}>►</span>
              {showMetrics ? "Hide" : "Performance Metrics"}
            </button>
            {showMetrics && (
              <div style={{
                marginTop: 6, padding: "10px 12px",
                background: "white", borderRadius: 8, border: "1px solid var(--border)",
                fontSize: 12, color: "var(--stone)",
              }}>
                {Object.entries(message.agentDurations).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span>{k.replace(/_/g, " ")}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{v}ms</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggestion bubbles on last message */}
        {isLast && message.suggestions && message.suggestions.length > 0 && (
          <SuggestionBubbles suggestions={message.suggestions} onSelect={onSuggestionClick} />
        )}
      </div>
    </div>
  );
}
