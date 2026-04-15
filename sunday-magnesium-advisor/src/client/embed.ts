// Embeddable widget entry point (Phase 10)
// Builds to dist/widget.js via: pnpm embed:build
// Usage on webshop: <script src="widget.js" data-api-url="..." data-locale="en"></script>

import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";

(function () {
  const script = document.currentScript as HTMLScriptElement | null;
  const apiUrl = script?.dataset.apiUrl ?? "";
  const locale = script?.dataset.locale ?? "en";

  // Shadow DOM container
  const host = document.createElement("div");
  host.id = "sunday-advisor-host";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Inject Google Fonts into shadow root
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://fonts.googleapis.com/css2?family=Newsreader:wght@300;400;500;600;700&display=swap";
  shadow.appendChild(fontLink);

  const container = document.createElement("div");
  shadow.appendChild(container);

  createRoot(container).render(createElement(StrictMode, null, createElement(App, null)));

  console.log(`[Sunday Advisor] Widget loaded — api: ${apiUrl}, locale: ${locale}`);
})();
