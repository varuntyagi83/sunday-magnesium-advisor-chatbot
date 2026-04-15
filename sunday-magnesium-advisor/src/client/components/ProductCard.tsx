import { RecommendedProduct } from "../hooks/useChat.js";

interface Props {
  product: RecommendedProduct;
  onClickTrack?: (product: RecommendedProduct) => void;
}

export function ProductCard({ product, onClickTrack }: Props) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        minWidth: 200,
        maxWidth: 240,
        flexShrink: 0,
        animation: "fadeUp 0.35s ease",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{ width: "100%", height: 120, objectFit: "contain", borderRadius: 8, marginBottom: 10 }}
        />
      )}

      <div style={{ fontSize: 11, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {product.form}
      </div>

      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, lineHeight: 1.3 }}>
        {product.name}
      </div>

      <div style={{ color: "var(--stone)", fontSize: 12, marginBottom: 8 }}>
        {product.mgPerServing}mg · EUR {product.price.toFixed(2)}
      </div>

      {product.matchReasons[0] && (
        <div style={{ fontSize: 12, color: "var(--stone)", marginBottom: 10, lineHeight: 1.4 }}>
          {product.matchReasons[0]}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div
          style={{
            height: 4,
            flex: 1,
            background: "var(--warm)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(product.matchScore * 100)}%`,
              background: "var(--sage)",
              borderRadius: 2,
            }}
          />
        </div>
        <span style={{ fontSize: 11, color: "var(--stone)" }}>
          {Math.round(product.matchScore * 100)}% match
        </span>
      </div>

      <a
        href={product.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onClickTrack?.(product)}
        style={{
          display: "block",
          textAlign: "center",
          background: "var(--sage)",
          color: "white",
          padding: "8px 12px",
          borderRadius: 8,
          textDecoration: "none",
          fontSize: 13,
          fontFamily: "Newsreader, serif",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--sage-dark)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--sage)")}
      >
        View Product
      </a>
    </div>
  );
}
