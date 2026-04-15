# Sunday Natural — Magnesium Multi-Agent Advisor
## Complete Production Build Instructions for Claude Code

---

## 1. What This Is

A production chatbot for Sunday Natural's webshop that recommends magnesium supplements using a multi-agent (multi-prompt) pipeline. 7+ specialized prompts run sequentially per user message. Each prompt handles one job: intent classification, health profiling, product filtering, embedding-based semantic matching, safety checking, dosage advice, response composition, and follow-up generation.

**Key infrastructure facts:**
1. Sunday Natural has its own custom MCP endpoint for product data. NOT Supabase MCP, NOT n8n MCP.
2. Product URLs come from the database via that MCP endpoint. URL pattern: `https://www.sunday.de/en/{product-slug}.html`
3. Gemini is used for intent classification (cheaper, faster for structured classification tasks).
4. Gemini is used for ALL agents: intent classification, health profiling, safety checking, dosage, response composition. Single LLM provider, simpler ops.
5. Embeddings are pre-computed by a separate pipeline. The chatbot CONSUMES them (reads from the embeddings store), it does NOT generate them.
6. No Algolia in this build. Direct database queries via your MCP.
7. Adriana's product DNA data is the source of truth for product attributes.
8. The widget deploys as an embeddable `<script>` tag on the webshop.

---

## 2. Initialize the Project

```bash
mkdir sunday-magnesium-advisor && cd sunday-magnesium-advisor
claude
```

Once Claude Code starts, run `/init`, then replace the generated CLAUDE.md with the one in Section 3.

---

## 3. CLAUDE.md

```markdown
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
2. Use gemini-2.0-flash for intent classification (fast, structured JSON). Use gemini-2.5-pro for reasoning agents (health profiler, safety, dosage, composer, follow-ups).
3. Product data comes ONLY from the custom MCP endpoint, never hardcoded
4. Product URLs are built from the slug field returned by the MCP: https://www.sunday.de/en/{slug}.html
5. All LLM calls happen server-side. Frontend NEVER touches API keys.
6. Frontend calls POST /api/chat with { message, sessionId, history, locale }
7. Backend returns { response, suggestions, products, debug?, sessionId }
8. Products array includes: name, slug, url, imageUrl, price, form, mgPerServing, matchScore
9. Every agent has Zod schemas for input AND output
10. If any agent fails, pipeline returns graceful fallback, not a crash
11. All events (message sent, recommendation shown, product clicked, suggestion tapped) go to BigQuery
12. Widget uses Shadow DOM so webshop CSS cannot leak in
13. Suggestion bubbles use the exact style from the JSX prototype: cream background, sage green text, rounded pills, hover turns green with white text

## Code Style
- ES modules (import/export), never CommonJS
- const over let, never var
- Destructure imports
- Zod for all runtime validation
- No `any` types
- Template literals for strings
- No em dashes, en dashes, or hyphens in user-facing copy
- Error messages include which agent failed
```

---

## 4. Phase-Gated Build Plan

### Phase 1 — Scaffolding + Config

**Prompt for Claude Code:**
```
Read CLAUDE.md. Scaffold the full project structure as described.
Use pnpm, Vite for frontend, Express for backend, both TypeScript.

Create src/server/config.ts that loads all env vars with validation:
- GEMINI_API_KEY (required — used for ALL agents + query embeddings)
- GEMINI_MODEL_FAST ("gemini-2.0-flash", for intent classification)
- GEMINI_MODEL_REASONING ("gemini-2.5-pro", for health profiler, safety, dosage, composer, follow-ups)
- MCP_ENDPOINT_URL (required — our custom MCP, e.g. https://mcp.sundaynatural.internal/v1)
- MCP_AUTH_TOKEN (required)
- MCP_TRANSPORT ("http" or "sse", default "http")
- BIGQUERY_PROJECT_ID (optional, for tracking)
- BIGQUERY_DATASET (optional)
- EMBEDDINGS_SOURCE ("mcp" or "api" or "bigquery", default "mcp") — where to read pre-computed embeddings
- EMBEDDINGS_API_URL (optional, only if EMBEDDINGS_SOURCE is "api")
- EMBEDDING_MODEL ("text-embedding-004" or "text-embedding-3-small") — MUST match the model your separate pipeline used
- EMBEDDINGS_REFRESH_INTERVAL_MIN (default 30) — how often to re-fetch product embeddings
- OPENAI_API_KEY (optional, only if your pipeline uses OpenAI embeddings)
- CORS_ORIGIN (default http://localhost:5173)
- PORT (default 3001)
- NODE_ENV (default development)
- REDIS_URL (optional, for caching)
- LOG_LEVEL (default "debug")

Validate with Zod. Fail fast on missing required vars.
Create .env.example with all vars documented.
Create a GET /api/health endpoint returning { status: "ok", mcp: "connected|disconnected", embeddings: "loaded|empty|error" }.
The health check should ping the MCP endpoint to verify connectivity
and confirm pre-computed product embeddings are loaded in memory.

Verify: pnpm dev starts without errors. curl /api/health returns ok.
```

### Phase 2 — MCP Client + Product Types

**Prompt for Claude Code:**
```
Build the MCP client layer. This connects to Sunday Natural's custom MCP endpoint.

1. src/server/mcp/types.ts — Define MCP request/response types:

   MCPProductQuery {
     category?: string           // e.g. "magnesium"
     form?: string               // e.g. "glycinate", "citrate", "malate"
     healthGoal?: string         // e.g. "sleep", "muscle", "stress"
     minMg?: number              // minimum mg per serving
     maxPrice?: number           // max price EUR
     formFactor?: string         // "capsule", "powder", "liquid", "tablet"
     locale?: "de" | "en" | "fr"
     limit?: number
   }

   MCPProductResponse {
     products: MCPProduct[]
     total: number
     query: MCPProductQuery
   }

   MCPProduct {
     id: string
     sku: string
     name: string
     slug: string                 // e.g. "magnesium-glycinate-pure-capsules-xl"
     url: string                  // full URL returned from DB, e.g. https://www.sunday.de/en/magnesium-glycinate-pure-capsules-xl.html
     imageUrl: string             // product image CDN URL
     price: number                // EUR
     currency: string
     form: string                 // glycinate, citrate, malate, threonate, taurate, oxide, complex
     mgPerServing: number         // elemental mg
     servingsPerContainer: number
     formFactor: string           // capsule, powder, liquid, tablet
     isVegan: boolean
     isOrganic: boolean
     noAdditives: boolean
     bestFor: string[]            // ["sleep", "stress", "muscle", "energy", "bone", "heart"]
     ingredients: string[]
     description: string          // product description (used by your separate embeddings pipeline)
     healthClaims: string[]       // EU-approved health claims
     inStock: boolean
     rating: number               // average customer rating
     reviewCount: number
   }

2. src/server/mcp/client.ts — MCP HTTP client:
   - POST to ${MCP_ENDPOINT_URL}/tools/query-products with MCPProductQuery body
   - Auth header: Authorization: Bearer ${MCP_AUTH_TOKEN}
   - Timeout: 5 seconds
   - Retry: 1 retry on failure
   - Parse response with Zod MCPProductResponse schema
   - If MCP is down, return empty results with a warning flag, not an error
   - Export: queryProducts(query: MCPProductQuery): Promise<MCPProductResponse>

3. src/server/products/url-builder.ts:
   - buildProductUrl(slug: string, locale: string = "en"): string
   - Pattern: https://www.sunday.de/${locale}/${slug}.html
   - If the MCP already returns full URLs, prefer those. This is the fallback.

4. src/server/products/types.ts — Re-export MCPProduct as the canonical product type.
   Add a RecommendedProduct type that extends MCPProduct with:
   - matchScore: number (0-1)
   - matchReasons: string[]
   - relevanceRank: number

Verify: Write a simple test that mocks the MCP endpoint and returns 3 products.
pnpm typecheck passes.
```

### Phase 3 — Embeddings Consumer Layer

**Prompt for Claude Code:**
```
Build the embeddings CONSUMER layer. IMPORTANT: Embeddings are pre-computed by a
SEPARATE pipeline that already exists. This chatbot READS those embeddings.
It does NOT generate, create, or compute embeddings itself.

Your team's embeddings pipeline already produces vector embeddings for all products
and stores them somewhere accessible (database table, vector store, or API endpoint).
The chatbot needs to:
  a) Fetch pre-computed product embeddings on startup
  b) Generate a query embedding for the user's message at runtime (this is the ONLY
     embedding the chatbot creates — one per user message, for similarity matching)
  c) Compute cosine similarity to rank products

1. src/server/embeddings/types.ts:
   ProductEmbedding {
     productId: string
     embedding: number[]         // the pre-computed vector from your pipeline
     metadata?: {
       model: string             // which model generated it (for version tracking)
       generatedAt: string       // ISO timestamp
     }
   }

   EmbeddingsStoreConfig {
     type: "mcp" | "api" | "bigquery"  // where to read embeddings from
     endpoint?: string                  // API URL if type is "api"
     tableName?: string                 // BQ table if type is "bigquery"
   }

2. src/server/embeddings/reader.ts:
   - Reads pre-computed product embeddings from your existing embeddings store
   - Support multiple backends depending on where your pipeline stores them:

   Option A — Via MCP (if your MCP endpoint exposes an embeddings tool):
     POST ${MCP_ENDPOINT_URL}/tools/get-product-embeddings
     Body: { category: "magnesium" }
     Returns: { embeddings: ProductEmbedding[] }

   Option B — Via a dedicated embeddings API endpoint:
     GET ${EMBEDDINGS_API_URL}/products?category=magnesium
     Returns: { embeddings: ProductEmbedding[] }

   Option C — Via BigQuery (if embeddings are stored in a BQ table):
     Query: SELECT product_id, embedding FROM product_embeddings WHERE category = 'magnesium'
     Parse the embedding column (stored as JSON array or ARRAY<FLOAT64>)

   - Export: fetchProductEmbeddings(): Promise<ProductEmbedding[]>
   - On startup: fetch all magnesium product embeddings, store in memory
   - Refresh: every 30 minutes (in case the pipeline updated embeddings)
   - If fetch fails: log warning, use last-known embeddings from memory cache

3. src/server/embeddings/similarity.ts:
   - cosineSimilarity(a: number[], b: number[]): number
   - rankBySimilarity(queryEmbedding: number[], candidates: ProductEmbedding[]): { productId: string, score: number }[]

4. Query embedding generation (the ONE embedding the chatbot creates per request):
   - For the user's message, generate a query embedding at runtime
   - Use the SAME model your pipeline uses (critical for compatibility)
   - If your pipeline uses Gemini text-embedding-004:
     POST https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent
     Body: { content: { parts: [{ text: userMessage }] } }
   - If your pipeline uses OpenAI text-embedding-3-small:
     POST https://api.openai.com/v1/embeddings
     Body: { model: "text-embedding-3-small", input: userMessage }
   - The EMBEDDING_MODEL env var must match whatever model your pipeline used
   - Export: generateQueryEmbedding(text: string): Promise<number[]>

5. Wire into server startup in index.ts:
   - On boot: fetch pre-computed product embeddings from store
   - Log: "Loaded N pre-computed product embeddings"
   - If zero loaded: log error, set health status to degraded

6. Environment variables for this layer:
   EMBEDDINGS_SOURCE=mcp              # "mcp", "api", or "bigquery"
   EMBEDDINGS_API_URL=               # only if source is "api"
   EMBEDDING_MODEL=text-embedding-004 # must match whatever your pipeline uses
   EMBEDDINGS_REFRESH_INTERVAL_MIN=30

Verify: Server starts, logs pre-computed embedding count.
Test: fetch embeddings, generate query embedding for "I can't sleep",
compute similarity against product embeddings, glycinate ranks highest.
```

### Phase 4 — All Agents (Gemini Only)

**Prompt for Claude Code:**
```
Build all agents. ALL agents use GEMINI. No Anthropic/Claude API calls anywhere.
Use gemini-2.0-flash for intent classification (fast, structured JSON output).
Use gemini-2.5-pro for all reasoning agents (health profiler, safety, dosage, composer, follow-ups).

1. src/server/pipeline/agent-runner.ts — Generic Gemini runner:
   - runGeminiAgent(model, systemPrompt, userMessage, schema): calls Gemini API, parses with Zod
   - model param: either GEMINI_MODEL_FAST or GEMINI_MODEL_REASONING from config
   - API pattern for ALL agents:
     POST https://generativelanguage.googleapis.com/v1/models/${model}:generateContent
     Header: x-goog-api-key: ${GEMINI_API_KEY}
     Body: {
       system_instruction: { parts: [{ text: systemPrompt }] },
       contents: [{ role: "user", parts: [{ text: userMessage }] }],
       generationConfig: { responseMimeType: "application/json", temperature, maxOutputTokens }
     }
   - For JSON agents: use responseMimeType: "application/json" (forces clean JSON, no fences)
   - For response composer: use responseMimeType: "text/plain" (natural language output)
   - Parse: data.candidates[0].content.parts[0].text
   - 1 retry on failure, log raw output on parse failure, return typed fallback

2. src/server/agents/intent-classifier.ts — GEMINI 2.0 FLASH
   - Model: gemini-2.0-flash (fast, cheap, great for classification)
   - responseMimeType: "application/json"
   - temperature: 0.1
   - Output schema (UserIntent):
     primary_intent: "symptom_relief" | "general_wellness" | "specific_form" | "comparison" |
                     "dosage_question" | "contraindication_check" | "price_inquiry"
     health_signals: string[] (sleep, muscle, stress, energy, bone, heart, digestion, migraine, pregnancy)
     user_constraints: { dietary: string[], form_preference: string, budget_sensitivity: string }
     urgency: "exploring" | "ready_to_buy" | "needs_education"
     follow_up_needed: boolean
     clarifying_question: string | null
     detected_language: "de" | "en" | "fr"

3. src/server/agents/health-profiler.ts — GEMINI 2.5 PRO
   - Model: gemini-2.5-pro
   - responseMimeType: "application/json"
   - temperature: 0.3
   - Maps health signals to magnesium form rankings with relevance scores
   - Output includes: magnesium_forms_ranked[], contraindication_flags, dosage_range, companion_nutrients
   - Key mappings hardcoded in prompt:
     sleep → glycinate/threonate, muscle → malate/citrate, stress → glycinate/taurate,
     energy → malate, bone → citrate, heart → taurate, digestion → citrate/oxide,
     migraine → oxide/threonate, pregnancy → bisglycinate

4. src/server/agents/product-retriever.ts — USES MCP (no LLM)
   - Takes HealthProfile output
   - Converts ranked magnesium forms into MCPProductQuery
   - Calls MCP client to fetch matching products
   - Returns raw MCPProduct[] (no LLM involved, pure database query)

5. src/server/agents/embedding-matcher.ts — USES PRE-COMPUTED EMBEDDINGS
   - Takes user message + products from MCP
   - Generates ONE query embedding for the user message (this is the only embedding created at runtime)
   - Reads pre-computed product embeddings from the embeddings reader (fetched on startup from your pipeline)
   - Computes cosine similarity: query embedding vs each product embedding
   - Re-ranks products by combining: MCP match score (0.6 weight) + embedding similarity (0.4 weight)
   - Returns top 3 RecommendedProduct[] with matchScore and matchReasons
   - CRITICAL: the query embedding model MUST match whatever model your pipeline used for product embeddings

6. src/server/agents/contraindication-checker.ts — GEMINI 2.5 PRO
   - Model: gemini-2.5-pro
   - responseMimeType: "application/json"
   - temperature: 0.2 (conservative for safety)
   - Screens for: kidney disease, medication interactions, pregnancy, GI sensitivity
   - Output: safety_status, flags[], general_advice, disclaimer
   - ALWAYS returns a disclaimer. NEVER provides medical advice.

7. src/server/agents/dosage-advisor.ts — GEMINI 2.5 PRO
   - Model: gemini-2.5-pro
   - responseMimeType: "application/json"
   - temperature: 0.2
   - Output: daily_target_mg, split_doses, timing[], duration, onset_expectation, absorption_tips

8. src/server/agents/response-composer.ts — GEMINI 2.5 PRO
   - Model: gemini-2.5-pro
   - responseMimeType: "text/plain" (this agent outputs natural language, NOT JSON)
   - temperature: 0.7 (warmer for natural language)
   - Receives ALL upstream context + conversation history
   - CRITICAL: response must include product names, prices, and CLICKABLE URLs
   - Format URLs as: [Product Name](https://www.sunday.de/en/{slug}.html)
   - Tone: warm, knowledgeable. Under 200 words. No bullet lists.
   - Weave safety notes naturally.
   - Must mention that product URLs link to the webshop.

9. src/server/agents/followup-generator.ts — GEMINI 2.5 PRO
   - Model: gemini-2.5-pro
   - responseMimeType: "application/json"
   - temperature: 0.5
   - Output: { suggestions: string[] } — 2-4 contextual follow-ups
   - These become the suggestion bubbles in the UI

Verify: Test each agent individually. ALL should call Gemini API, zero Claude API calls.
Confirm: "I have trouble sleeping" → intent classifier returns structured JSON.
Confirm: health profiler returns glycinate/threonate as top forms.
```

### Phase 5 — Pipeline Orchestrator + API

**Prompt for Claude Code:**
```
Build the pipeline orchestrator and wire to Express.

1. src/server/pipeline/orchestrator.ts:
   - runPipeline(message, sessionId, history, locale): Promise<PipelineResult>
   - Sequential execution:
     Step 1: Intent Classifier (Gemini Flash) → UserIntent
     Step 2: If follow_up_needed, short-circuit to response composer for clarifying question
     Step 3: Health Profiler (Gemini Pro) → HealthProfile
     Step 4: Product Retriever (MCP) → MCPProduct[]
     Step 5: Embedding Matcher → reads pre-computed product embeddings, generates ONE query embedding
              for user message, cosine similarity re-ranks → RecommendedProduct[] (top 3)
     Step 6: Contraindication Checker (Gemini Pro) → SafetyCheck
     Step 7: Dosage Advisor (Gemini Pro) → DosagePlan
     Step 8: Response Composer (Gemini Pro) → natural language with product URLs
     Step 9: Follow-up Generator (Gemini Pro) → suggestion strings

   - Build PipelineContext object incrementally
   - Emit step progress via callback: onStepUpdate(agentId, status)
   - If any agent fails: log error, use fallback, continue pipeline
   - Default fallback: recommend Magnesium Komplex as safe general choice

   PipelineResult {
     response: string                  // final natural language
     suggestions: string[]             // follow-up bubble texts
     products: RecommendedProduct[]    // for product cards in UI
     sessionId: string
     debug?: PipelineContext           // full context if debug=true
     metadata: {
       totalDurationMs: number
       agentDurations: Record<string, number>
       tokensUsed: { geminiFlash: number, geminiPro: number }
       locale: string
     }
   }

2. Express API endpoints:

   POST /api/chat
   Body: { message: string, sessionId?: string, history?: Message[], locale?: string, debug?: boolean }
   Response: PipelineResult
   - If no sessionId, generate one (uuid v4)
   - Rate limit: 10 req/min per IP
   - Input validation with Zod
   - CORS from config

   GET /api/health
   Response: { status, mcp, embeddings_loaded, product_count }

   GET /api/products/magnesium
   Response: { products: MCPProduct[] }
   - Public endpoint for debugging, returns all magnesium products from MCP cache

3. Server-Sent Events (SSE) for streaming pipeline progress:

   POST /api/chat/stream
   Same body as /api/chat but returns SSE stream:
   - event: step_start, data: { agentId, agentName }
   - event: step_done, data: { agentId, durationMs }
   - event: products, data: { products: RecommendedProduct[] }
   - event: suggestions, data: { suggestions: string[] }
   - event: response, data: { response: string }
   - event: done, data: { metadata }

   This powers the real-time pipeline tracker in the frontend.

Verify: curl POST /api/chat with "I have trouble sleeping" returns full recommendation
with product URLs from the MCP. Test SSE with curl --no-buffer.
```

### Phase 6 — Analytics Tracking

**Prompt for Claude Code:**
```
Build the analytics tracking system. Events go to BigQuery.

1. src/server/tracking/events.ts — Event type definitions:

   ChatSessionStarted { sessionId, locale, userAgent, referrerUrl, timestamp }
   MessageSent { sessionId, message, messageIndex, timestamp }
   IntentClassified { sessionId, primaryIntent, healthSignals[], durationMs }
   ProductsRecommended { sessionId, productIds[], productSlugs[], matchScores[] }
   ProductClicked { sessionId, productId, productSlug, productUrl, position }
   SuggestionTapped { sessionId, suggestionText, suggestionIndex }
   PipelineCompleted { sessionId, totalDurationMs, agentDurations, tokensUsed, agentErrors[] }
   ConversationEnded { sessionId, messageCount, productsRecommended, productsClicked, durationSeconds }
   WidgetOpened { sessionId, pageUrl, timestamp }
   WidgetClosed { sessionId, durationSeconds, messageCount }

2. src/server/tracking/tracker.ts:
   - Uses @google-cloud/bigquery package
   - Table: sundaynatural.advisor_events (auto-created if not exists)
   - Schema: event_type STRING, session_id STRING, payload JSON, timestamp TIMESTAMP
   - Batch insert: collect events in buffer, flush every 5 seconds or 50 events
   - If BigQuery not configured (no BIGQUERY_PROJECT_ID), log events to console instead
   - Export: trackEvent(type, payload): void (fire and forget, never blocks pipeline)

3. src/server/tracking/middleware.ts:
   - Express middleware that auto-tracks ChatSessionStarted on first request per session
   - Adds sessionId to request context
   - Tracks PipelineCompleted after every /api/chat response

4. Frontend tracking (in useChat hook):
   - POST /api/track with { sessionId, eventType, payload }
   - Fire on: suggestion bubble tapped, product card clicked, widget opened/closed
   - Product clicks: also track which position (1st, 2nd, 3rd recommendation)

5. POST /api/track endpoint in Express:
   - Accepts { sessionId, eventType, payload }
   - Validates eventType against known enum
   - Forwards to BigQuery tracker

Verify: Run a chat session. Check BigQuery table (or console logs) for events.
Confirm product clicks track the correct slug and URL.
```

### Phase 7 — React Chat Widget with Suggestion Bubbles

**Prompt for Claude Code:**
```
Build the frontend chat widget. CRITICAL UI REQUIREMENTS from the prototype:

1. SUGGESTION BUBBLES (from the screenshot):
   - Appear below the assistant message, wrapped in a flex container with gap
   - Style: cream/off-white background (#FAF7F2), sage green text (#5B6B4A),
     rounded-full border, 1px solid #c8bfb1
   - Padding: 10px 18px, font-size: 14px, font-family: Newsreader serif
   - Hover: background becomes sage green (#5B8C5A), text becomes white, border matches
   - Clicking sends the text as a user message
   - They disappear after the user sends any message (tapped or typed)
   - Initial welcome message shows 4 suggestions:
     "I have trouble falling asleep and staying asleep"
     "My muscles cramp after exercise"
     "I feel stressed and anxious most days"
     "I just want a good general magnesium supplement"
   - Follow-up suggestions come from the pipeline (2-4 bubbles)

2. PRODUCT CARDS:
   - When products are recommended, show ProductCard components below the response
   - Each card: product image (from imageUrl), name, form, mg per serving, price, match score
   - "View Product" button links to the product URL (opens in new tab)
   - Card style: white bg, subtle shadow, rounded corners, sage green accent
   - Cards laid out horizontally, scrollable on mobile
   - Clicking tracks a ProductClicked event

3. MESSAGE BUBBLES:
   - User: sage green gradient background, white text, right-aligned, rounded (20px top, 4px bottom-right)
   - Assistant: white background, dark text, left-aligned, rounded (20px top, 4px bottom-left)
   - Assistant has a leaf emoji (🌿) avatar with green gradient circle
   - Label "Sunday Natural Advisor" above assistant messages
   - Product URLs in the response text render as clickable links (parse markdown links)

4. PIPELINE TRACKER:
   - During loading: horizontal row of agent pills at top
   - Each pill: emoji icon + agent name + status (pending/running/done)
   - Running: pulse animation + green border. Done: checkmark + green fill.
   - Connected by "›" chevrons
   - Agent list: Intent (🎯) → Profile (🧬) → Products (🔍) → Match (📊) →
     Safety (🛡️) → Dosage (⚖️) → Compose (✨) → Suggest (💬)

5. CHAT WINDOW:
   - Header: Sunday Natural logo area + "Magnesium Advisor" title
   - Debug toggle button (top right)
   - Scrollable message area with auto-scroll
   - Input bar: white bg, rounded-full, sage green send button
   - Placeholder: "Describe your health goals or symptoms..."
   - Medical disclaimer footer (tiny text)

6. hooks/useChat.ts:
   - Manages messages[], loading, pipelineSteps, sessionId
   - sendMessage(text): POST /api/chat/stream (SSE for pipeline progress)
   - Parse SSE events: update pipeline tracker in real-time
   - When "products" event arrives, store for ProductCard rendering
   - When "suggestions" event arrives, store for bubble rendering
   - Track events: suggestion tapped, product clicked, widget opened

7. styles/theme.css — CSS custom properties:
   --sage: #5B8C5A, --sage-light: #8FB87A, --cream: #FAF7F2
   --warm: #F5F0E8, --bark: #3D3928, --stone: #8B8272
   Font: Newsreader from Google Fonts

Design: organic, natural, premium. NOT generic AI chatbot.
Match the screenshot bubbles exactly.

Verify: pnpm dev:client shows welcome message with 4 suggestion bubbles.
Clicking one sends it. Pipeline tracker animates during loading.
Product cards appear with clickable URLs.
```

### Phase 8 — Gemini LLM Integration Details

**Prompt for Claude Code:**
```
Ensure the Gemini integration is production-ready.

1. src/server/agents/intent-classifier.ts — Full Gemini implementation:

   API call pattern:
   POST https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent
   Header: x-goog-api-key: ${GEMINI_API_KEY}
   Header: Content-Type: application/json

   Body:
   {
     "system_instruction": { "parts": [{ "text": "<system prompt>" }] },
     "contents": [{ "role": "user", "parts": [{ "text": "<user message>" }] }],
     "generationConfig": {
       "responseMimeType": "application/json",
       "temperature": 0.1,
       "maxOutputTokens": 500
     }
   }

   Using responseMimeType: "application/json" forces Gemini to return valid JSON.
   This is critical — it means no markdown fences, no preamble, just JSON.

   Parse response: data.candidates[0].content.parts[0].text → JSON.parse → Zod validate

2. Query embedding generation (for user messages ONLY):
   Product embeddings are PRE-COMPUTED by a separate pipeline. The chatbot reads them.
   The ONLY embedding the chatbot generates at runtime is for the user's query message.
   Use the SAME model your pipeline used. If that's Gemini text-embedding-004:
   POST https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent
   Header: x-goog-api-key: ${GEMINI_API_KEY}
   Body: { "content": { "parts": [{ "text": "user query text" }] } }
   Response: data.embedding.values → number[]

   If your pipeline uses OpenAI, use OpenAI for the query embedding too.
   Model mismatch between query and product embeddings will produce garbage similarity scores.

3. Cost optimization (all Gemini, single provider):
   - Gemini 2.0 Flash for intent classification: ~$0.0001 per request
   - Gemini 2.5 Pro for reasoning agents (x5): ~$0.002 per request per agent
   - Total per pipeline run: ~$0.01-0.015 (cheaper than dual-provider approach)
   - Query embedding: negligible (~$0.00001 per query, one per user message)
   - Product embeddings: zero cost to the chatbot (pre-computed by your pipeline)
   - Single API key, single billing, simpler ops

4. Error handling:
   - Gemini 429 (rate limit): exponential backoff, 3 retries
   - Gemini 500: retry once, then return graceful error message
   - If a reasoning agent fails: use fallback (recommend Magnesium Komplex as safe default)
   - If query embedding fails: skip re-ranking, use MCP order as-is
   - Track model used per agent in metadata

Verify: Intent classifier returns valid JSON from Gemini for 5 test messages.
Query embedding generates for "I have trouble sleeping". Similarity against
pre-computed glycinate embedding returns high score.
```

### Phase 9 — MCP Endpoint Connection Guide

**Prompt for Claude Code:**
```
Document and implement the MCP connection layer.

The MCP endpoint is Sunday Natural's OWN custom endpoint.
It is NOT Supabase MCP. It is NOT n8n MCP. It is a custom-built MCP server
that connects to Sunday Natural's product database.

1. src/server/mcp/client.ts — The MCP client implementation:

   Connection: HTTP-based MCP (not SSE transport)
   Base URL: from MCP_ENDPOINT_URL env var
   Auth: Bearer token from MCP_AUTH_TOKEN env var

   Tool call pattern:
   POST ${MCP_ENDPOINT_URL}/tools/{tool-name}
   Headers:
     Authorization: Bearer ${MCP_AUTH_TOKEN}
     Content-Type: application/json

   Available tools (that your MCP exposes):

   a) query-products — Search products by criteria
      Input: MCPProductQuery (category, form, healthGoal, etc.)
      Output: MCPProductResponse (products array with URLs from database)

   b) get-product-by-id — Single product lookup
      Input: { id: string }
      Output: MCPProduct (includes full URL from database)

   c) get-product-categories — List available categories
      Input: {}
      Output: { categories: string[] }

   d) search-products-semantic — If your MCP supports semantic search
      Input: { query: string, limit: number }
      Output: MCPProductResponse (pre-ranked by relevance)

   IMPORTANT: The URL field in MCPProduct comes DIRECTLY from the database.
   The MCP returns the full URL like: https://www.sunday.de/en/magnesium-glycinate-pure-capsules-xl.html
   The url-builder.ts is ONLY a fallback if the MCP response is missing the URL field.

2. Connection lifecycle:
   - On server startup: test MCP connectivity with get-product-categories
   - If MCP is unreachable: log error, set health status to degraded
   - Degraded mode: return cached products (from last successful fetch) if available
   - Product cache: refresh every 30 minutes from MCP

3. For connecting to the MCP if it uses SSE transport instead of HTTP:
   Install @modelcontextprotocol/sdk
   Use SSEClientTransport with your MCP_ENDPOINT_URL
   The tool calling pattern stays the same but over the SSE connection

4. Environment config for MCP:
   MCP_ENDPOINT_URL=https://your-mcp-endpoint.sundaynatural.internal/v1
   MCP_AUTH_TOKEN=your-bearer-token
   MCP_TRANSPORT=http  # or "sse" if your MCP uses SSE transport

Verify: On startup, MCP health check passes. Products are fetched and cached.
GET /api/products/magnesium returns real product data with URLs.
```

### Phase 10 — Embeddable Widget + Webshop Deployment

**Prompt for Claude Code:**
```
Build the embeddable widget and document the deployment process.

PART A — Embeddable Widget Script

1. src/client/embed.ts:
   - Self-executing function that creates the chat widget on any page
   - Creates a Shadow DOM container (prevents CSS leakage from host page)
   - Injects Google Fonts link for Newsreader
   - Mounts the React app inside the shadow root
   - Configurable via data attributes on the script tag

   Usage on webshop:
   <script
     src="https://advisor-cdn.sundaynatural.com/widget.js"
     data-api-url="https://advisor-api.sundaynatural.com"
     data-locale="en"
     data-position="bottom-right"
     data-primary-color="#5B8C5A"
     data-welcome-message="Need help choosing the right magnesium?"
   ></script>

2. Floating action button:
   - Fixed position, bottom-right (configurable)
   - 56px circle, sage green gradient, leaf icon (🌿)
   - Subtle shadow + breathing animation when idle
   - On click: opens chat panel
   - Badge indicator if there's an unread response

3. Chat panel:
   - Fixed position overlay: 400px wide, 600px tall on desktop
   - Full screen on mobile (< 768px)
   - Slide-up animation on open
   - Close button (X) top-right
   - All the ChatWindow components from Phase 7 inside

4. Vite config for widget build:
   - Separate entry: src/client/embed.ts
   - Output: single widget.js file (all CSS inlined, all deps bundled)
   - Build command: pnpm embed:build
   - Output to: dist/widget.js

5. Create test-embed.html in project root:
   - Basic HTML page simulating a Sunday Natural product page
   - Loads the widget.js script
   - Verify: floating button appears, chat opens, full pipeline works

PART B — Deployment Architecture

Backend (Express API):
- Dockerfile (Node 20 Alpine, multi-stage build)
- Deploy to: GCP Cloud Run (auto-scaling, HTTPS)
- Custom domain: advisor-api.sundaynatural.com
- Environment variables set in Cloud Run config
- Health check path: /api/health
- Min instances: 1 (avoid cold starts)
- Max instances: 10
- Memory: 512MB, CPU: 1
- Timeout: 60s (pipeline can take 10-20s)

Frontend Widget:
- Build produces a single widget.js (~200-400KB gzipped)
- Upload to: GCP Cloud Storage bucket or Cloudflare R2
- Serve via CDN: advisor-cdn.sundaynatural.com
- Cache headers: max-age=3600 (1 hour), stale-while-revalidate=86400
- Versioning: widget.v1.js, widget.v2.js OR query param ?v=hash

Webshop Integration:
- Add the <script> tag to the Sunday Natural webshop template
- For Magento: add to default_head_blocks.xml or via admin CMS
- For specific pages only: add to the magnesium category template
- The script loads async and does not block page rendering

6. docker-compose.yml for local development:
   - backend service (Express)
   - redis service (for embedding cache)
   - Environment: .env file mount

7. Dockerfile:
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package.json pnpm-lock.yaml ./
   RUN corepack enable && pnpm install --frozen-lockfile
   COPY . .
   RUN pnpm build

   FROM node:20-alpine AS runner
   WORKDIR /app
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/package.json ./
   EXPOSE 3001
   CMD ["node", "dist/server/index.js"]

8. deploy.sh script:
   #!/bin/bash
   # Build widget
   pnpm embed:build
   # Upload widget to CDN
   gsutil -h "Cache-Control:public, max-age=3600" cp dist/widget.js gs://sunday-advisor-cdn/widget.js
   # Build and deploy backend
   gcloud run deploy magnesium-advisor \
     --source . \
     --region europe-west3 \
     --allow-unauthenticated \
     --set-env-vars "NODE_ENV=production" \
     --min-instances 1 \
     --max-instances 10 \
     --memory 512Mi \
     --timeout 60

Verify: docker compose up works. test-embed.html loads widget. deploy.sh runs clean.
```

### Phase 11 — Production Hardening

**Prompt for Claude Code:**
```
Add production safety and monitoring.

1. Security:
   - Helmet for security headers
   - CORS: only allow sundaynatural.com and sunday.de origins in production
   - Rate limiting: 10 req/min per IP (express-rate-limit)
   - Input sanitization: strip HTML/script tags from user messages
   - API key rotation support: accept multiple MCP_AUTH_TOKEN values (comma-separated)
   - No stack traces in production error responses

2. Monitoring:
   - Structured JSON logging (pino)
   - Log every pipeline run: duration, agents used, errors, tokens consumed
   - Log MCP call latency separately
   - GCP Cloud Logging integration (automatic on Cloud Run)
   - Alert threshold: if pipeline takes > 30s, log as warning
   - Alert threshold: if MCP is down for > 5 minutes, log as error

3. Resilience:
   - Circuit breaker on MCP calls (3 failures in 60s → open for 30s)
   - Graceful degradation: if MCP is down, use last-known product cache
   - If Gemini is down: retry with exponential backoff, then return graceful error
   - If Gemini quota exceeded: queue requests, return "high demand" message
   - If all fails, return static "we're experiencing issues" message
   - Graceful shutdown: finish in-progress pipelines before terminating

4. GDPR compliance (Sunday Natural operates in EU):
   - No PII stored in BigQuery tracking events (no names, emails, IPs)
   - Session IDs are ephemeral (not linked to user accounts)
   - Add consent check: widget shows a brief notice on first interaction
   - "This advisor uses AI to help you find the right product. No personal data is stored."
   - User can dismiss this, choice stored in localStorage
   - Cookie-less tracking: session ID lives in memory only, dies when tab closes

5. Testing:
   - Unit tests for each agent (mock LLM responses)
   - Unit tests for embedding similarity
   - Unit tests for MCP client (mock HTTP responses)
   - Integration test: full pipeline with mocked MCP + mocked LLMs
   - E2E test: load test-embed.html, type message, verify response + product cards appear
   - Test: product URLs are valid and clickable
   - Test: suggestion bubbles render and are tappable
   - Test: pipeline tracker shows correct agent sequence

Verify: pnpm test passes. Security headers present. Rate limiting works.
CORS blocks unauthorized origins. test-embed.html still works end-to-end.
```

---

## 5. Environment Variables (.env.example)

```bash
# Required — Gemini API (single LLM provider for everything)
GEMINI_API_KEY=AIzaSy-xxxxx
GEMINI_MODEL_FAST=gemini-2.0-flash          # intent classification (fast, cheap, structured JSON)
GEMINI_MODEL_REASONING=gemini-2.5-pro       # health profiler, safety, dosage, composer, follow-ups

# Required — Custom MCP Endpoint (your own, NOT supabase, NOT n8n)
MCP_ENDPOINT_URL=https://your-mcp-endpoint.sundaynatural.internal/v1
MCP_AUTH_TOKEN=your-bearer-token
MCP_TRANSPORT=http

# Embeddings — chatbot READS pre-computed embeddings, does NOT generate product embeddings
# Only generates ONE query embedding per user message for similarity matching
EMBEDDINGS_SOURCE=mcp                    # "mcp", "api", or "bigquery" — where pre-computed embeddings live
EMBEDDINGS_API_URL=                      # only if EMBEDDINGS_SOURCE=api
EMBEDDING_MODEL=text-embedding-004       # MUST match the model your pipeline used to create product embeddings
EMBEDDINGS_REFRESH_INTERVAL_MIN=30       # how often to re-fetch product embeddings from the store
OPENAI_API_KEY=sk-xxxxx                  # only if your pipeline uses OpenAI embeddings

# Optional — Analytics (BigQuery)
BIGQUERY_PROJECT_ID=sundaynatural-data
BIGQUERY_DATASET=advisor_analytics

# Optional — Caching
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
RATE_LIMIT_RPM=10
```

---

## 6. Architecture Diagram

```
                    ┌─────────────────────────────────┐
                    │     Sunday Natural Webshop       │
                    │  <script src="widget.js">        │
                    └──────────────┬──────────────────┘
                                   │ HTTPS
                    ┌──────────────▼──────────────────┐
                    │     Express API (Cloud Run)      │
                    │     advisor-api.sundaynatural.com │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────┼──────────────────┐
                    │                                   │
          ┌─────────▼─────────┐              ┌─────────▼──────────┐
          │   Gemini API       │              │  Custom MCP         │
          │ (ALL agents +      │              │  (Product DB +      │
          │  query embedding)  │              │   Pre-computed      │
          │                    │              │   Embeddings)       │
          │ Flash: intent      │              └────────┬───────────┘
          │ Pro: reasoning x5  │                       │
          └────────────────────┘             ┌─────────▼───────────┐
                                             │  Sunday Natural      │
                                             │  Product Database    │
                                             │  (URLs, prices,      │
                                             │   Adriana's DNA,     │
                                             │   embeddings from    │
                                             │   separate pipeline) │
                                             └─────────────────────┘

Pipeline per message:

  User Message
       │
       ▼
  ┌──────────────┐
  │ 🎯 Intent     │ ← Gemini 2.0 Flash ($0.0001/req)
  │   Classifier  │   Output: structured intent JSON
  └──────┬───────┘
         │ If follow_up_needed → short-circuit to composer
         ▼
  ┌──────────────┐
  │ 🧬 Health     │ ← Gemini 2.5 Pro
  │   Profiler    │   Output: magnesium form rankings
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ 🔍 Product    │ ← Custom MCP (database query, NO LLM)
  │   Retriever   │   Output: MCPProduct[] with URLs from DB
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ 📊 Embedding  │ ← Reads PRE-COMPUTED embeddings from your pipeline
  │   Matcher     │   Generates ONE query embedding for user message
  └──────┬───────┘   Cosine similarity → top 3 RecommendedProduct[]
         ▼
  ┌──────────────┐
  │ 🛡️ Safety     │ ← Gemini 2.5 Pro
  │   Checker     │   Output: contraindication flags + disclaimer
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ ⚖️ Dosage     │ ← Gemini 2.5 Pro
  │   Advisor     │   Output: dosing plan + timing
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ ✨ Response    │ ← Gemini 2.5 Pro
  │   Composer    │   Output: natural language + product URLs
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ 💬 Follow-up  │ ← Gemini 2.5 Pro
  │   Generator   │   Output: 2-4 suggestion bubble texts
  └──────┬───────┘
         ▼
  Chat Response + Product Cards + Suggestion Bubbles
         │
         └──→ BigQuery (event tracking)
```

---

## 7. Claude Code Session Management

Follow the Ralph loop pattern to avoid context rot:

```
Phase 1-2: Scaffolding + types
  → Verify: pnpm typecheck passes
  → Save progress: /compact focus on project structure and MCP types
  → /clear if context > 50%

Phase 3: Embeddings consumer
  → Verify: server starts, pre-computed product embeddings load from store
  → Save progress to docs/progress-phase3.md before clearing

Phase 4: Agents
  → This is the biggest phase. Consider splitting:
    Session A: intent-classifier + health-profiler
    Session B: product-retriever + embedding-matcher
    Session C: contraindication-checker + dosage-advisor
    Session D: response-composer + followup-generator
  → /clear between sessions. Save which agents are done.

Phase 5: Orchestrator
  → Verify: full pipeline runs end-to-end with curl

Phase 6: Tracking
  → Verify: events appear in console/BigQuery

Phase 7: Frontend
  → This is the second biggest phase. Consider splitting:
    Session A: ChatWindow + MessageBubble + SuggestionBubbles
    Session B: ProductCard + PipelineTracker + useChat hook
    Session C: Styling, animations, polish

Phase 8-9: Gemini + MCP details
  → May already be done if Phase 4 was thorough

Phase 10: Widget embed + deployment
  → Verify: test-embed.html works

Phase 11: Hardening
  → Verify: pnpm test passes, docker compose up works
```

---

## 8. Post-MVP Enhancements

After the core build ships:

1. **Multi-language**: Intent classifier already detects language. Add German and French response templates. Product URLs switch locale: sunday.de/de/ vs sunday.de/en/ vs sunday.de/fr/

2. **Conversation memory**: Store sessions in Redis with 24h TTL so returning users pick up where they left off.

3. **A/B testing**: Route 50% of sessions to a variant with different response tone or product ordering. Track conversion difference in BigQuery.

4. **Health-I Agent integration**: Connect to the broader Health-I ecosystem so the magnesium advisor can hand off to the full supplement advisor.

5. **Therapist mode**: Flag in the widget config (`data-mode="therapist"`) that shows more clinical detail, references to studies, and higher-dose protocols.

6. **Analytics dashboard**: Looker dashboard on top of BigQuery showing: top health signals, most recommended products, conversion rate, average session length, drop-off points.

7. **Product image in chat**: Render product images inline in the assistant message, not just in product cards.

8. **Voice input**: Add a microphone button using Web Speech API for hands-free interaction.
