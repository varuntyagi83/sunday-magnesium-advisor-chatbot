import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import type { Plugin } from "vite";

// Suppress separate .css file output — CSS is injected manually into Shadow DOM via ?inline
function suppressCssEmit(): Plugin {
  return {
    name: "suppress-css-emit",
    generateBundle(_, bundle) {
      for (const key of Object.keys(bundle)) {
        if (key.endsWith(".css")) delete bundle[key];
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), suppressCssEmit()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": "{}",
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/client/embed.ts"),
      name: "SundayAdvisor",
      fileName: "widget",
      formats: ["iife"],
    },
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
