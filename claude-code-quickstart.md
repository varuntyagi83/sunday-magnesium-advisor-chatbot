# How to Run This in Claude Code
## Quick Start Guide

---

## Step 0 — Prerequisites

Make sure you have these installed before starting:

```bash
# Node.js 20+
node --version   # should show v20.x or higher

# pnpm
npm install -g pnpm

# Claude Code
npm install -g @anthropic-ai/claude-code

# Verify Claude Code is installed
claude --version
```

If you don't have Claude Code yet, install it and authenticate:

```bash
npm install -g @anthropic-ai/claude-code
claude   # first run triggers authentication
```

---

## Step 1 — Create the Project

```bash
mkdir sunday-magnesium-advisor
cd sunday-magnesium-advisor
git init
```

---

## Step 2 — Create CLAUDE.md

Before launching Claude Code, create the CLAUDE.md file manually. This is the most important file because Claude Code reads it at the start of every session.

```bash
# Copy the CLAUDE.md content from Section 3 of the production instructions
# into this file. You can do this with any editor:
code CLAUDE.md    # VS Code
# or
nano CLAUDE.md    # terminal editor
```

Paste the entire CLAUDE.md from Section 3 of `magnesium-advisor-production-instructions.md` into this file and save it.

---

## Step 3 — Create .env

```bash
cp .env.example .env   # will exist after Phase 1, but you can pre-create:
```

Create `.env` with your actual keys:

```bash
cat > .env << 'EOF'
GEMINI_API_KEY=your-actual-gemini-key
GEMINI_MODEL_FAST=gemini-2.0-flash
GEMINI_MODEL_REASONING=gemini-2.5-pro
MCP_ENDPOINT_URL=https://your-mcp-endpoint-url/v1
MCP_AUTH_TOKEN=your-mcp-bearer-token
MCP_TRANSPORT=http
EMBEDDINGS_SOURCE=mcp
EMBEDDING_MODEL=text-embedding-004
EMBEDDINGS_REFRESH_INTERVAL_MIN=30
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
EOF
```

---

## Step 4 — Launch Claude Code

```bash
cd sunday-magnesium-advisor
claude
```

You are now in the Claude Code interactive session. Everything from here is typed inside the Claude Code terminal.

---

## Step 5 — Run Each Phase

Copy and paste these prompts one at a time into the Claude Code session. Wait for each to finish and verify before moving to the next.


### PHASE 1 — Scaffolding

Paste this into Claude Code:

```
Read CLAUDE.md. Scaffold the full project structure as described.
Use pnpm, Vite for frontend, Express for backend, both TypeScript.

Create src/server/config.ts that loads all env vars with validation using Zod.
Required vars: GEMINI_API_KEY, GEMINI_MODEL_FAST, GEMINI_MODEL_REASONING,
MCP_ENDPOINT_URL, MCP_AUTH_TOKEN. Optional: BIGQUERY_PROJECT_ID, BIGQUERY_DATASET,
EMBEDDINGS_SOURCE, EMBEDDINGS_API_URL, EMBEDDING_MODEL, REDIS_URL, etc.

Fail fast on missing required vars. Create .env.example with all vars documented.
Create GET /api/health that pings MCP and returns status.
Install all dependencies. Make pnpm dev work.
```

**Verify:**
```
pnpm dev
# In another terminal:
curl http://localhost:3001/api/health
```

Should return `{"status":"ok"}`. If MCP is not reachable yet, that's fine — it should show `"mcp":"disconnected"`.

**Then in Claude Code:**
```
/compact focus on project structure and config
```


### PHASE 2 — Types + MCP Client + Product Types

```
Build Phase 2 from CLAUDE.md: Create the full TypeScript type system in
src/server/types/pipeline.ts with interfaces AND Zod schemas for all agent
inputs/outputs. Create src/server/mcp/client.ts and src/server/mcp/types.ts
for our custom MCP endpoint. Create src/server/products/types.ts and
url-builder.ts. The MCP returns product URLs from our database. Run pnpm typecheck.
```

**Verify:**
```
pnpm typecheck
```

Should pass with zero errors.


### PHASE 3 — Embeddings Consumer

```
Build Phase 3 from CLAUDE.md: Create the embeddings consumer layer.
Embeddings are pre-computed by a separate pipeline. The chatbot READS them,
it does NOT generate product embeddings. Build src/server/embeddings/reader.ts
that fetches pre-computed embeddings from our MCP endpoint on startup.
Build similarity.ts for cosine similarity. The ONLY embedding the chatbot
creates at runtime is ONE query embedding per user message. Use the same model
our pipeline uses (from EMBEDDING_MODEL env var). Wire into server startup.
```

**Verify:**
```
pnpm dev:server
# Should log: "Loaded N pre-computed product embeddings"
```

**Then:**
```
/compact focus on embeddings reader and MCP client
```


### PHASE 4 — All Agents (Gemini Only)

This is the biggest phase. Split across sessions if context gets heavy.

**Session A — Intent + Health Profiler:**
```
Build the intent-classifier agent using Gemini 2.0 Flash and the health-profiler
agent using Gemini 2.5 Pro. Both in src/server/agents/. Build the generic
agent-runner in src/server/pipeline/agent-runner.ts that calls the Gemini API.
Use responseMimeType: "application/json" to force clean JSON output.
See Phase 4 in CLAUDE.md for full specs. Test both agents individually.
```

**Verify, then /clear:**
```
/clear
```

**Session B — Product Retriever + Embedding Matcher:**
```
Read CLAUDE.md. Build src/server/agents/product-retriever.ts (calls MCP, no LLM)
and src/server/agents/embedding-matcher.ts (reads pre-computed embeddings, generates
ONE query embedding, re-ranks by cosine similarity). See Phase 4 in CLAUDE.md.
```

**Verify, then /clear:**
```
/clear
```

**Session C — Safety + Dosage:**
```
Read CLAUDE.md. Build src/server/agents/contraindication-checker.ts and
src/server/agents/dosage-advisor.ts. Both use Gemini 2.5 Pro.
See Phase 4 in CLAUDE.md for full specs. Test both individually.
```

**Verify, then /clear:**
```
/clear
```

**Session D — Composer + Follow-ups:**
```
Read CLAUDE.md. Build src/server/agents/response-composer.ts (Gemini 2.5 Pro,
responseMimeType text/plain, temperature 0.7, includes product URLs) and
src/server/agents/followup-generator.ts (Gemini 2.5 Pro, returns suggestion
strings for bubbles). See Phase 4 in CLAUDE.md.
```

**Verify all 7 agents exist:**
```
ls src/server/agents/
# Should show: intent-classifier.ts, health-profiler.ts, product-retriever.ts,
# embedding-matcher.ts, contraindication-checker.ts, dosage-advisor.ts,
# response-composer.ts, followup-generator.ts
pnpm typecheck
```


### PHASE 5 — Pipeline Orchestrator + API

```
Read CLAUDE.md. Build the pipeline orchestrator in src/server/pipeline/orchestrator.ts
that chains all agents sequentially. Wire to POST /api/chat and POST /api/chat/stream
(SSE) in Express. Include the short-circuit logic for follow_up_needed and fallback
error handling. See Phase 5 in CLAUDE.md for full PipelineResult type and SSE events.
```

**Verify:**
```bash
# In one terminal:
pnpm dev:server

# In another terminal:
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I have trouble sleeping"}'
```

Should return a full recommendation with product URLs.

```
/clear
```


### PHASE 6 — Analytics Tracking

```
Read CLAUDE.md. Build the tracking system in src/server/tracking/.
Define event types, BigQuery tracker (or console fallback), Express middleware,
and POST /api/track endpoint for frontend events. See Phase 6 in CLAUDE.md.
```

**Verify:**
```bash
# Run a chat, check console for tracked events
pnpm dev:server
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I feel stressed"}'
# Should see tracking events logged to console
```

```
/clear
```


### PHASE 7 — React Chat Widget

```
Read CLAUDE.md. Build the entire React frontend in src/client/.
CRITICAL: Suggestion bubbles must match the screenshot exactly:
cream background (#FAF7F2), sage green text (#5B6B4A), 1px solid #c8bfb1 border,
rounded-full, Newsreader serif font. Hover: sage green bg + white text.
Initial 4 suggestions: "I have trouble falling asleep and staying asleep",
"My muscles cramp after exercise", "I feel stressed and anxious most days",
"I just want a good general magnesium supplement".
Include ProductCard with clickable URLs, PipelineTracker, debug panel.
Use Newsreader font, Sunday Natural brand colors. See Phase 7 in CLAUDE.md.
```

**Verify:**
```bash
pnpm dev
# Open http://localhost:5173
# Should see welcome message with 4 suggestion bubbles
# Click one — should trigger full pipeline and show product cards
```

This phase is large. If context gets heavy, split into sub-sessions:
```
/clear
# Session A: ChatWindow + MessageBubble + SuggestionBubbles
# Session B: ProductCard + PipelineTracker + useChat hook
# Session C: Styling, animations, polish
```


### PHASE 8 — Gemini Integration Polish

```
Read CLAUDE.md. Review and harden all Gemini API calls. Ensure:
- Intent classifier uses gemini-2.0-flash with responseMimeType application/json
- All reasoning agents use gemini-2.5-pro with correct temperatures
- Response composer uses text/plain, not JSON
- Query embedding uses the same model as our pipeline (EMBEDDING_MODEL env var)
- Error handling: retry on 429/500, exponential backoff
- All agents log duration and token usage
```

**Verify:**
```bash
pnpm test
```


### PHASE 9 — MCP Connection Polish

```
Read CLAUDE.md. Verify the MCP client handles all edge cases:
- Connection test on startup
- 5-second timeout
- 1 retry on failure
- Graceful degradation if MCP is down (use cached products)
- Product URLs come from the database, url-builder is fallback only
- Circuit breaker: 3 failures in 60s opens for 30s
```


### PHASE 10 — Embeddable Widget + Deployment

```
Read CLAUDE.md Phase 10. Build src/client/embed.ts with Shadow DOM,
floating action button (sage green, leaf icon, bottom-right), and chat panel.
Create Vite config for widget bundle. Create test-embed.html.
Create Dockerfile, docker-compose.yml, and deploy.sh for GCP Cloud Run.
```

**Verify:**
```bash
pnpm embed:build
# Open test-embed.html in browser — floating button should appear
# Click it — full chat widget should work
docker compose up --build
# Full app should start in Docker
```


### PHASE 11 — Production Hardening

```
Read CLAUDE.md Phase 11. Add Helmet security headers, CORS lockdown,
rate limiting, input sanitization, structured logging with pino, GDPR
consent notice in widget, and tests (unit + integration + E2E).
```

**Verify:**
```bash
pnpm test
pnpm typecheck
pnpm lint
docker compose up --build
curl http://localhost:3001/api/health
```

---

## Troubleshooting

### Context getting heavy / Claude Code getting slow
```
/compact focus on [what you're currently working on]
# or if switching tasks:
/clear
```
Save your progress to a markdown file before clearing:
```
Save current progress to docs/progress-phaseN.md including what's done,
what's left, and any issues found.
```

### Claude Code ignoring CLAUDE.md instructions
CLAUDE.md is advisory (~70-80% compliance). For critical rules, verify manually after each phase. The verify step after each phase is there for this reason.

### MCP endpoint not reachable during development
Start without MCP by mocking it:
```
Create a mock MCP server in src/server/mcp/mock.ts that returns hardcoded
magnesium products. Use it when MCP_ENDPOINT_URL is not set or unreachable.
```

### Gemini API returning errors
Check:
```bash
# Test Gemini API directly:
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Type errors after editing
```bash
pnpm typecheck
# Fix any errors before proceeding to next phase
```

### Frontend not connecting to backend
Check CORS_ORIGIN in .env matches your frontend URL (http://localhost:5173).

---

## Session Cheatsheet

| Command | When to Use |
|---------|-------------|
| `claude` | Start Claude Code in project root |
| `/init` | Generate starter CLAUDE.md (only first time, then replace) |
| `/compact focus on X` | Compress context, keep X in memory |
| `/clear` | Full context reset between phases |
| `/config` | Change output style (Concise recommended) |
| `pnpm typecheck` | Run after every phase |
| `pnpm dev` | Start both servers |
| `pnpm test` | Run tests |
| `Ctrl+C` | Exit Claude Code |

---

## Recommended Workflow Order

```
1.  Create project folder + CLAUDE.md + .env
2.  claude                          ← launch Claude Code
3.  Phase 1 prompt → verify → /compact
4.  Phase 2 prompt → verify → /compact
5.  Phase 3 prompt → verify → /compact
6.  Phase 4 Session A → verify → /clear
7.  Phase 4 Session B → verify → /clear
8.  Phase 4 Session C → verify → /clear
9.  Phase 4 Session D → verify → typecheck
10. Phase 5 prompt → verify with curl → /clear
11. Phase 6 prompt → verify → /clear
12. Phase 7 prompt → verify in browser → /clear
13. Phase 8 prompt → verify
14. Phase 9 prompt → verify
15. Phase 10 prompt → verify with test-embed.html
16. Phase 11 prompt → final verify → done
```

Total estimated time: 4-8 hours depending on MCP readiness and debugging.
Total Claude Code sessions: ~12-16 (with /clear between phases).
