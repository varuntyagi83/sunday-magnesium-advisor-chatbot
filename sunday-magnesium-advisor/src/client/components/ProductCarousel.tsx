import { useState, useRef, useEffect } from "react";
import { RecommendedProduct } from "../hooks/useChat.js";

const PC_UI = {
  de: {
    intro: "Hier sind einige Produkte, die gut zu Ihnen passen könnten:",
    seeMore: "Mehr erfahren",
    whyFits: "Warum es passt:",
    ingredients: "Inhaltsstoffe:",
    note: "Hinweis:",
  },
  en: {
    intro: "Here are some products that could be a great fit for you:",
    seeMore: "See More",
    whyFits: "Why this fits:",
    ingredients: "Ingredients:",
    note: "Note:",
  },
} as const;
type PCLocale = keyof typeof PC_UI;

interface Props {
  products: RecommendedProduct[];
  locale?: PCLocale;
  onClickTrack?: (product: RecommendedProduct) => void;
}

export function ProductCarousel({ products, locale = "de", onClickTrack }: Props) {
  const t = PC_UI[locale];
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only show arrows/dots when cards actually overflow the container
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => setHasOverflow(el.scrollWidth > el.clientWidth + 2);
    check();

    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [products]);

  if (products.length === 0) return null;

  const CARD_W = 220;

  const scroll = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * (CARD_W + 12), behavior: "smooth" });
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 13, color: "var(--stone)", marginBottom: 10, fontStyle: "italic" }}>
        {t.intro}
      </div>

      <div style={{ position: "relative" }}>
        {/* Left arrow — only when overflowing */}
        {hasOverflow && (
          <button
            onClick={() => scroll(-1)}
            aria-label="Previous product"
            style={{
              position: "absolute", left: -10, top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3, width: 28, height: 28, borderRadius: "50%",
              background: "white", border: "1px solid var(--border)",
              cursor: "pointer", fontSize: 16, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--shadow-card)",
            }}
          >‹</button>
        )}

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            paddingBottom: 6,
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          } as React.CSSProperties}
        >
          {products.map((p, i) => (
            <ProductCard
              key={p.id}
              p={p}
              cardWidth={CARD_W}
              expanded={expandedIdx === i}
              onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
              onClickTrack={onClickTrack}
              t={t}
            />
          ))}
          <div style={{ minWidth: 4, flexShrink: 0 }} />
        </div>

        {/* Right arrow — only when overflowing */}
        {hasOverflow && (
          <button
            onClick={() => scroll(1)}
            aria-label="Next product"
            style={{
              position: "absolute", right: -10, top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3, width: 28, height: 28, borderRadius: "50%",
              background: "white", border: "1px solid var(--border)",
              cursor: "pointer", fontSize: 16, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--shadow-card)",
            }}
          >›</button>
        )}
      </div>

      {/* Dots — only when overflowing */}
      {hasOverflow && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
          {products.map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: expandedIdx === i ? "var(--gold)" : "var(--border)",
              transition: "background 0.2s",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  p, cardWidth, expanded, onToggle, onClickTrack, t,
}: {
  p: RecommendedProduct;
  cardWidth: number;
  expanded: boolean;
  onToggle: () => void;
  onClickTrack?: (p: RecommendedProduct) => void;
  t: typeof PC_UI[PCLocale];
}) {
  return (
    <div style={{
      minWidth: cardWidth,
      maxWidth: cardWidth,
      flexShrink: 0,
      scrollSnapAlign: "start",
      background: "white",
      borderRadius: 12,
      border: `1.5px solid ${expanded ? "var(--gold)" : "var(--border)"}`,
      overflow: "hidden",
      boxShadow: expanded ? "0 2px 12px rgba(196,168,130,0.2)" : "var(--shadow-card)",
      transition: "border-color 0.2s, box-shadow 0.2s",
      display: "flex", flexDirection: "column",
    }}>
      {/* Product image */}
      {p.imageUrl && (
        <div style={{
          background: "var(--warm)", height: 130,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 8,
        }}>
          <img
            src={p.imageUrl}
            alt={p.name}
            style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
          />
        </div>
      )}

      {/* Name + price + See More */}
      <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onClickTrack?.(p)}
          style={{
            fontSize: 11, fontWeight: 700,
            color: "var(--gold-dark)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            lineHeight: 1.3,
            textDecoration: "underline",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          } as React.CSSProperties}
        >
          {p.name}
        </a>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bark)" }}>
          €{typeof p.price === "number" ? p.price.toFixed(2) : p.price}
        </div>
        <div style={{ fontSize: 11, color: "var(--stone)" }}>
          {p.formFactor || p.form}{p.unit ? ` · ${p.unit}` : ""}
        </div>

        <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", gap: 6 }}>
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onClickTrack?.(p)}
            style={{
              flex: 1, textAlign: "center",
              background: "var(--gold)", color: "white",
              padding: "6px 0", borderRadius: 6,
              textDecoration: "none", fontSize: 12,
              fontFamily: "Newsreader, serif", fontWeight: 500,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--gold-dark)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "var(--gold)")}
          >
            {t.seeMore}
          </a>
          {(p.whyRecommended || p.cautions) && (
            <button
              onClick={onToggle}
              title={expanded ? "Hide details" : "Why this fits you"}
              style={{
                width: 32, background: expanded ? "var(--gold-subtle)" : "transparent",
                border: "1.5px solid var(--border)",
                borderRadius: 6, cursor: "pointer", fontSize: 14, lineHeight: 1,
                color: "var(--gold-dark)",
                transition: "background 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {expanded ? "▲" : "▼"}
            </button>
          )}
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div style={{
          borderTop: "1px solid var(--border)",
          padding: "10px 12px",
          fontSize: 12, lineHeight: 1.6, color: "var(--bark)",
          background: "var(--gold-subtle)",
        }}>
          {p.whyRecommended && (
            <p style={{ marginBottom: 6 }}>
              <strong>{t.whyFits}</strong>{" "}
              <span style={{ color: "var(--stone)" }}>{p.whyRecommended}</span>
            </p>
          )}
          {p.activeIngredients && (
            <p style={{ marginBottom: 6 }}>
              <strong>{t.ingredients}</strong>{" "}
              <span style={{ color: "var(--stone)" }}>{p.activeIngredients}</span>
            </p>
          )}
          {p.cautions && (
            <div style={{
              background: "white", borderRadius: 6,
              padding: "6px 10px", fontSize: 11, color: "var(--stone)",
            }}>
              <strong>{t.note}</strong> {p.cautions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
