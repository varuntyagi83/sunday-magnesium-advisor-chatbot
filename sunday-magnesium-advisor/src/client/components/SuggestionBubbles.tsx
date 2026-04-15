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
            background: "var(--cream)",
            color: "#5B6B4A",
            border: "1px solid var(--border)",
            borderRadius: 9999,
            padding: "10px 18px",
            fontSize: 14,
            fontFamily: "Newsreader, serif",
            cursor: "pointer",
            transition: "all 0.2s ease",
            lineHeight: 1.4,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--sage)";
            (e.currentTarget as HTMLButtonElement).style.color = "white";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--sage)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--cream)";
            (e.currentTarget as HTMLButtonElement).style.color = "#5B6B4A";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
