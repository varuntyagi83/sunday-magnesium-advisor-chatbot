import { useState } from "react";
import { ChatWindow } from "./ChatWindow.js";

interface WidgetLauncherProps {
  apiUrl?: string;
  locale?: string;
}

export function WidgetLauncher({ apiUrl = "", locale = "en" }: WidgetLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const open = () => { setIsOpen(true); setHasOpened(true); };
  const close = () => setIsOpen(false);
  const reset = () => setResetKey((k) => k + 1);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        borderRadius: 0,
      }
    : {
        position: "absolute",
        bottom: 72,
        right: 0,
        width: 400,
        height: 600,
        borderRadius: 16,
      };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 2147483647 }}>
      {/* Chat panel */}
      {isOpen && (
        <div
          style={{
            ...panelStyle,
            background: "var(--cream, #FAF7F2)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            overflow: "hidden",
            animation: "slideUp 0.3s ease",
          }}
        >
          <ChatWindow key={resetKey} apiUrl={apiUrl} locale={locale} onClose={close} onReset={reset} />
        </div>
      )}

      {/* Floating launch button */}
      <button
        onClick={isOpen ? close : open}
        title={isOpen ? "Close advisor" : "Open magnesium advisor"}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #C4A882, #B8956A)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isOpen ? 22 : 26,
          color: "white",
          boxShadow: "0 4px 16px rgba(196,168,130,0.5)",
          animation: "none",
          transition: "transform 0.2s, box-shadow 0.2s",
          position: "relative",
        }}
      >
        {isOpen ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="2" x2="16" y2="16" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="16" y1="2" x2="2" y2="16" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path d="M3 4.5C3 3.12 4.12 2 5.5 2h15C21.88 2 23 3.12 23 4.5v11C23 16.88 21.88 18 20.5 18H9l-5 4.5V4.5z" fill="white"/>
          </svg>
        )}
        {/* Unread badge — shown after first open if panel is closed */}
        {!isOpen && hasOpened && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#e85d4a",
              border: "2px solid white",
            }}
          />
        )}
      </button>
    </div>
  );
}
