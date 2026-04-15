import { Message, RecommendedProduct } from "../hooks/useChat.js";
import { ProductCard } from "./ProductCard.js";
import { SuggestionBubbles } from "./SuggestionBubbles.js";

interface Props {
  message: Message;
  isLast: boolean;
  onSuggestionClick: (text: string) => void;
  onProductClick?: (product: RecommendedProduct) => void;
}

function renderContent(text: string) {
  // Parse markdown links: [text](url)
  const parts = text.split(/(\[.+?\]\(.+?\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(.+?)\]\((.+?)\)$/);
    if (match) {
      return (
        <a
          key={i}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--sage)", textDecoration: "underline" }}
        >
          {match[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function MessageBubble({ message, isLast, onSuggestionClick, onProductClick }: Props) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        gap: 10,
        animation: "fadeUp 0.35s ease",
        alignItems: "flex-start",
      }}
    >
      {/* Avatar */}
      {!isUser && (
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
            animation: "leafSway 4s ease infinite",
          }}
        >
          🌿
        </div>
      )}

      <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: 6 }}>
        {!isUser && (
          <div
            style={{
              fontSize: 10.5,
              color: "var(--stone)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 2,
            }}
          >
            Sunday Natural Advisor
          </div>
        )}

        {/* Bubble */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
            background: isUser ? "var(--user-bubble)" : "white",
            color: isUser ? "white" : "var(--bark)",
            boxShadow: isUser ? "var(--shadow-user)" : "var(--shadow-card)",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          {renderContent(message.content)}
        </div>

        {/* Product cards */}
        {!isUser && message.products && message.products.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              paddingBottom: 4,
              marginTop: 4,
            }}
          >
            {message.products.map((p) => (
              <ProductCard key={p.id} product={p} onClickTrack={onProductClick} />
            ))}
          </div>
        )}

        {/* Suggestion bubbles on last assistant message */}
        {!isUser && isLast && message.suggestions && message.suggestions.length > 0 && (
          <SuggestionBubbles suggestions={message.suggestions} onSelect={onSuggestionClick} />
        )}
      </div>
    </div>
  );
}
