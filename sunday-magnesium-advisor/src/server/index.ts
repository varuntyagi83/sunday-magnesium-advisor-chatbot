import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { config } from "./config.js";
import { createLogger } from "./logger.js";
import { testMcpConnection, queryProducts } from "./mcp/client.js";
import { getEmbeddingsStatus, initEmbeddings } from "./embeddings/reader.js";
import { runPipeline } from "./pipeline/orchestrator.js";
import { ChatRequestSchema } from "./types/pipeline.js";
import { trackEvent } from "./tracking/tracker.js";

const logger = createLogger("server");
const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json({ limit: "10kb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: config.RATE_LIMIT_RPM,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ── Health ────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  const [mcpOk, embStatus] = await Promise.all([
    testMcpConnection().catch(() => false),
    Promise.resolve(getEmbeddingsStatus()),
  ]);

  res.json({
    status: "ok",
    mcp: mcpOk ? "connected" : "disconnected",
    embeddings: embStatus.loaded ? "loaded" : embStatus.error ? "error" : "empty",
    product_count: embStatus.count,
    timestamp: new Date().toISOString(),
  });
});

// ── Chat (non-streaming) ──────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    return;
  }

  const { message, sessionId, history, locale, debug } = parsed.data;

  try {
    const result = await runPipeline({ message, sessionId, history, locale, debug });
    trackEvent("PipelineCompleted", {
      sessionId: result.sessionId,
      totalDurationMs: result.metadata.totalDurationMs,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Pipeline failed");
    res.status(500).json({ error: "Pipeline failed. Please try again." });
  }
});

// ── Chat (SSE streaming) ──────────────────────────────────────
app.post("/api/chat/stream", async (req, res) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    return;
  }

  const { message, sessionId, history, locale, debug } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await runPipeline({
      message,
      sessionId,
      history,
      locale,
      debug,
      onStep: (update) => {
        if (update.status === "running") {
          send("step_start", { agentId: update.agentId, agentName: update.agentName });
        } else if (update.status === "done" || update.status === "error") {
          send("step_done", { agentId: update.agentId, durationMs: update.durationMs, status: update.status });
        }
      },
    });

    send("products", { products: result.products });
    send("suggestions", { suggestions: result.suggestions });
    send("response", { response: result.response });
    send("done", { metadata: result.metadata, sessionId: result.sessionId });

    if (debug && result.debug) {
      send("debug", result.debug);
    }

    trackEvent("PipelineCompleted", {
      sessionId: result.sessionId,
      totalDurationMs: result.metadata.totalDurationMs,
    });
  } catch (err) {
    logger.error({ err }, "Streaming pipeline failed");
    send("error", { message: "Pipeline failed. Please try again." });
  } finally {
    res.end();
  }
});

// ── Products cache endpoint ───────────────────────────────────
app.get("/api/products/magnesium", async (_req, res) => {
  try {
    const result = await queryProducts({ category: "magnesium", limit: 20 });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch products" });
  }
});

// ── Event tracking ────────────────────────────────────────────
app.post("/api/track", (req, res) => {
  const { sessionId, eventType, payload } = req.body ?? {};
  if (!sessionId || !eventType) {
    res.status(400).json({ error: "sessionId and eventType are required" });
    return;
  }
  trackEvent(eventType, { sessionId, ...payload });
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────
async function start() {
  try {
    await initEmbeddings();
  } catch (err) {
    logger.warn({ err }, "Could not load embeddings on startup");
  }

  app.listen(config.PORT, () => {
    logger.info(`Server on port ${config.PORT} [${config.NODE_ENV}]`);
  });
}

start();
