# Sunday Natural — Magnesium Multi-Agent Advisor

## Project Overview
Multi-agent AI chatbot recommending magnesium supplements from Sunday Natural's catalog.
Uses 7+ specialized prompt agents in a sequential pipeline.
Product data comes from our own custom MCP endpoint (NOT Supabase, NOT n8n MCP).
Product URLs come from the database, pattern: https://www.sunday.de/en/{slug}.html
All agents run on Gemini (single LLM provider, simpler ops).
Pre-computed embeddings (from a separate pipeline) power semantic product matching.
Widget deploys as embeddable script on the Sunday Natural webshop.

## Tech Stack
- Frontend: React 18, TypeScript, Vite, TailwindCSS
- Backend: Node.js 20+, Express, TypeScript
- AI: Google Gemini API (all agents: intent classification, reasoning, composition)
- Product Data: Custom MCP endpoint → Sunday Natural database
- Embeddings: Pre-computed externally, consumed via MCP or embeddings API endpoint. Chatbot reads them, never generates them.
- Deployment: Docker (backend on GCP Cloud Run), static CDN (frontend widget)
- Analytics: BigQuery (event tracking) + Looker (dashboards)
- Package manager: pnpm

## Project Structure
```
src/
  server/
    index.ts                    — Express server entry point
    config.ts                   — Environment config (API keys, MCP URL, feature flags)
    pipeline/
      orchestrator.ts           — Runs agents sequentially, passes context
      agent-runner.ts           — Generic agent executor (handles retries, Zod validation)
    agents/
      intent-classifier.ts      — Gemini: classifies user intent into structured JSON
      health-profiler.ts        — Gemini: maps health signals to magnesium forms
      product-retriever.ts      — MCP: fetches products from database via custom endpoint
      embedding-matcher.ts      — Pre-computed embeddings: semantic similarity matching
      contraindication-checker.ts — Gemini: safety screening
      dosage-advisor.ts         — Gemini: dosing plans
      response-composer.ts      — Gemini: natural language recommendation
      followup-generator.ts     — Gemini: contextual follow-up suggestions
    mcp/
      client.ts                 — MCP client for Sunday Natural's custom endpoint
      types.ts                  — MCP request/response types
    embeddings/
      reader.ts                 — Reads pre-computed embeddings from your embeddings store/API
      similarity.ts             — Cosine similarity computation for re-ranking
      types.ts                  — Embedding vector types and store response interfaces
    products/
      types.ts                  — Product TypeScript interfaces (from Adriana's product DNA)
      url-builder.ts            — Builds sunday.de product URLs from slugs
    tracking/
      events.ts                 — Event type definitions
      tracker.ts                — Sends events to BigQuery
      middleware.ts             — Express middleware for request tracking
    types/
      pipeline.ts               — All agent input/output interfaces + Zod schemas
  client/
    App.tsx                     — Main widget mount
    components/
      ChatWindow.tsx            — Full chat container
      MessageBubble.tsx         — User and assistant message bubbles
      SuggestionBubbles.tsx     — Rounded pill suggestion buttons (cream background, sage text)
      ProductCard.tsx           — Product recommendation card with image, price, URL link
      PipelineTracker.tsx       — Shows which agent is running
      DebugPanel.tsx            — Raw JSON pipeline output
    hooks/
      useChat.ts                — Chat state management + API calls
    styles/
      theme.css                 — Sunday Natural brand tokens
    embed.ts                    — Embeddable widget script (Shadow DOM)
```

## Commands
- `pnpm dev` — Start backend (3001) + frontend (5173)
- `pnpm build` — Production build
- `pnpm dev:server` — Backend only
- `pnpm dev:client` — Frontend only
- `pnpm typecheck` — tsc --noEmit both client and server
- `pnpm lint` — ESLint everything
- `pnpm test` — Vitest unit tests
- `pnpm test:pipeline` — Integration test running full pipeline with mock MCP
- `pnpm embed:build` — Build embeddable widget.js bundle

## Architecture Rules
1. ALL agents run on Gemini. Single LLM provider. No Anthropic/Claude API, no OpenAI.
2. Use gemini-2.5-flash for intent classification (fast, structured JSON). Use gemini-2.5-pro for reasoning agents (health profiler, safety, dosage, composer, follow-ups).
3. Product data comes ONLY from the custom MCP endpoint, never hardcoded.
4. Product URLs are built from the slug field returned by the MCP: https://www.sunday.de/en/{slug}.html
5. All LLM calls happen server-side. Frontend NEVER touches API keys.
6. Frontend calls POST /api/chat with { message, sessionId, history, locale }
7. Backend returns { response, suggestions, products, debug?, sessionId }
8. Products array includes: name, slug, url, imageUrl, price, form, mgPerServing, matchScore
9. Every agent has Zod schemas for input AND output.
10. If any agent fails, pipeline returns graceful fallback, not a crash.
11. All events (message sent, recommendation shown, product clicked, suggestion tapped) go to BigQuery.
12. Widget uses Shadow DOM so webshop CSS cannot leak in.
13. Suggestion bubbles use the exact style from the design reference: cream background (#FAF7F2), sage green text (#5B6B4A), 1px solid #c8bfb1 border, rounded pills, Newsreader serif font. Hover: sage green bg (#5B8C5A) + white text.
14. For all frontend styling, match the design reference in src/client/reference/design-prototype.jsx exactly. Same colors, same border-radius, same padding, same animations.

## Code Style
- ES modules (import/export), never CommonJS
- const over let, never var
- Destructure imports
- Zod for all runtime validation
- No `any` types
- Template literals for strings
- No em dashes, en dashes, or hyphens in user-facing copy
- Error messages include which agent failed

## Design Reference
The visual prototype is in `src/client/reference/design-prototype.jsx`. Key design tokens:

### Colors
- --sage: #5B8C5A (primary green)
- --sage-light: #8FB87A (light green)
- --cream: #FAF7F2 (background)
- --warm: #F5F0E8 (secondary background)
- --bark: #3D3928 (text primary)
- --stone: #8B8272 (text secondary)
- --user-bubble: linear-gradient(135deg, #5B8C5A, #6B9E5B)

### Typography
- Font: Newsreader (Google Fonts, serif)
- Weights: 300, 400, 500, 600, 700
- Body: 14px, line-height 1.7
- Agent label: 10.5px, uppercase, letter-spacing 0.06em
- Suggestion bubbles: 14px, font-weight 400

### Suggestion Bubbles
- Background: #FAF7F2
- Text: #5B6B4A
- Border: 1px solid #c8bfb1
- Padding: 10px 18px
- Border-radius: 9999px (rounded-full)
- Hover: background #5B8C5A, text white, border #5B8C5A
- Transition: all 0.2s ease

### Message Bubbles
- User: border-radius 20px 20px 4px 20px, green gradient bg, white text
- Assistant: border-radius 20px 20px 20px 4px, white bg, dark text
- Assistant avatar: 34px circle, linear-gradient(135deg, #5B8C5A, #8FB87A), leaf emoji
- Shadow (user): 0 3px 12px rgba(91,140,90,0.3)
- Shadow (assistant): 0 1px 6px rgba(0,0,0,0.06)

### Pipeline Tracker
- Pill style: 4px 10px padding, 20px border-radius
- Running: pulse animation 1.5s ease infinite, agent color border
- Done: agent color background with 22% opacity, checkmark
- Chevron separator: › character, 10px font

### Animations
- fadeUp: from { opacity: 0; translateY(10px) } to { opacity: 1; translateY(0) }, 0.35s ease
- pulse: 0%,100% { opacity: 1 } 50% { opacity: 0.6 }, 1.5s
- dotBounce: 0%,60%,100% { translateY(0) } 30% { translateY(-5px) }, 1.2s
- leafSway: 0%,100% { rotate(-2deg) } 50% { rotate(2deg) }, 4s

## Agent Specifications

### Intent Classifier (gemini-2.5-flash)
- temperature: 0.1
- responseMimeType: application/json
- Output: UserIntent { primary_intent, health_signals[], user_constraints, urgency, follow_up_needed, clarifying_question, detected_language }

### Health Profiler (gemini-2.5-pro)
- temperature: 0.3
- responseMimeType: application/json
- Key mappings: sleep→glycinate/threonate, muscle→malate/citrate, stress→glycinate/taurate, energy→malate, bone→citrate, heart→taurate, digestion→citrate/oxide, migraine→oxide/threonate, pregnancy→bisglycinate
- Output: HealthProfile { profile_summary, magnesium_forms_ranked[], contraindication_flags, dosage_range, companion_nutrients }

### Product Retriever (MCP, no LLM)
- Converts HealthProfile into MCPProductQuery
- Calls MCP endpoint, returns MCPProduct[] with URLs from database

### Embedding Matcher (no LLM for products)
- Reads pre-computed product embeddings from embeddings store
- Generates ONE query embedding per user message (must use same model as pipeline)
- Cosine similarity re-ranking: 0.6 MCP score + 0.4 embedding similarity
- Output: top 3 RecommendedProduct[]

### Contraindication Checker (gemini-2.5-pro)
- temperature: 0.2
- responseMimeType: application/json
- Screens: kidney disease, medication interactions, pregnancy, GI sensitivity
- ALWAYS returns disclaimer. NEVER provides medical advice.

### Dosage Advisor (gemini-2.5-pro)
- temperature: 0.2
- responseMimeType: application/json
- Output: DosagePlan { daily_target_mg, split_doses, timing[], duration, onset_expectation, absorption_tips }

### Response Composer (gemini-2.5-pro)
- temperature: 0.7
- responseMimeType: text/plain (natural language, NOT JSON)
- Must include product names, prices, clickable URLs
- Format: [Product Name](https://www.sunday.de/en/{slug}.html)
- Tone: warm, knowledgeable. Under 200 words. No bullet lists.
- Weave safety notes naturally.

### Follow-up Generator (gemini-2.5-pro)
- temperature: 0.5
- responseMimeType: application/json
- Output: { suggestions: string[] } — 2-4 contextual follow-ups for suggestion bubbles
