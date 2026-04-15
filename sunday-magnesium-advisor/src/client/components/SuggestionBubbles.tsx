interface Props {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export function SuggestionBubbles({ suggestions, onSelect }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
      {suggestions.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          style={{
            background: "transparent",
            color: "var(--gold-dark)",
            border: "1.5px solid var(--gold)",
            borderRadius: 9999,
            padding: "8px 16px",
            fontSize: 13,
            fontFamily: "Newsreader, serif",
            cursor: "pointer",
            transition: "all 0.2s ease",
            lineHeight: 1.4,
          }}
          onMouseEnter={(e) => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = "var(--gold)";
            b.style.color = "white";
          }}
          onMouseLeave={(e) => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = "transparent";
            b.style.color = "var(--gold-dark)";
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
