// Embeddable widget entry point
// Build: pnpm embed:build → dist/widget.js
// Usage: <script src="widget.js" data-api-url="https://..." data-locale="en"></script>

import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";
import { WidgetLauncher } from "./components/WidgetLauncher.js";
import themeCSS from "./styles/theme.css?inline";

(function () {
  const script = document.currentScript as HTMLScriptElement | null;
  const apiUrl = script?.dataset.apiUrl ?? "";
  const locale = script?.dataset.locale ?? "en";

  // Shadow DOM host — fixed so it floats above the webshop
  const host = document.createElement("div");
  host.id = "sunday-advisor-host";
  host.style.cssText = "position:fixed;bottom:0;right:0;z-index:2147483647;pointer-events:none;";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Inject CSS into shadow root (replace :root with :host so variables work inside)
  const style = document.createElement("style");
  style.textContent = themeCSS.replace(/:root\b/g, ":host") + "\n* { pointer-events: auto; }";
  shadow.appendChild(style);

  // Fonts go in document <head> — they don't work inside Shadow DOM
  if (!document.querySelector("#sunday-advisor-fonts")) {
    const link = document.createElement("link");
    link.id = "sunday-advisor-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap";
    document.head.appendChild(link);
  }

  const container = document.createElement("div");
  shadow.appendChild(container);

  createRoot(container).render(
    createElement(StrictMode, null, createElement(WidgetLauncher, { apiUrl, locale }))
  );

  console.log(`[Sunday Advisor] Widget loaded — api: ${apiUrl || "(relative)"}, locale: ${locale}`);
})();
