import { useState, useEffect } from "react";

const CONSENT_KEY = "sunday_advisor_consent";

interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentBanner({ onAccept, onDecline }: Props) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10,
      background: "rgba(61,57,40,0.55)",
      display: "flex", alignItems: "flex-end",
      borderRadius: "inherit",
    }}>
      <div style={{
        background: "white",
        borderRadius: "0 0 16px 16px",
        padding: "20px 20px 24px",
        width: "100%",
        fontFamily: "Newsreader, serif",
        animation: "fadeUp 0.3s ease",
      }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: "var(--bark)", marginBottom: 8 }}>
          Before we begin
        </p>
        <p style={{ fontSize: 13, color: "var(--stone)", lineHeight: 1.65, marginBottom: 16 }}>
          This advisor uses AI to personalise magnesium recommendations based on your health goals.
          Your conversation is processed by Google Gemini and our product database.
          No data is shared with third parties. See our{" "}
          <a
            href="https://www.sunday.de/en/privacy-policy.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--gold-dark)", textDecoration: "underline" }}
          >
            Privacy Policy
          </a>.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onAccept}
            style={{
              flex: 1,
              background: "var(--gold)",
              border: "none",
              borderRadius: 8,
              padding: "10px 0",
              color: "white",
              fontFamily: "Newsreader, serif",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Accept and continue
          </button>
          <button
            onClick={onDecline}
            style={{
              flex: 1,
              background: "transparent",
              border: "1.5px solid var(--border)",
              borderRadius: 8,
              padding: "10px 0",
              color: "var(--stone)",
              fontFamily: "Newsreader, serif",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}

/** Returns null while consent state is unknown (avoids flash). */
export function useConsent() {
  const [state, setState] = useState<"unknown" | "accepted" | "declined">("unknown");

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    setState(stored === "accepted" ? "accepted" : stored === "declined" ? "declined" : "unknown");
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setState("accepted");
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setState("declined");
  };

  return { state, accept, decline };
}
