import { config } from "../config.js";
import { createLogger } from "../logger.js";

const logger = createLogger("tracker");

type EventPayload = Record<string, unknown>;

let buffer: { type: string; payload: EventPayload; timestamp: string }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function trackEvent(type: string, payload: EventPayload): void {
  buffer.push({ type, payload, timestamp: new Date().toISOString() });

  if (buffer.length >= 50) {
    void flush();
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => void flush(), 5_000);
  }
}

async function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (buffer.length === 0) return;

  const events = buffer.splice(0);

  if (!config.BIGQUERY_PROJECT_ID) {
    for (const e of events) {
      logger.info({ eventType: e.type, ...e.payload }, "[TRACK]");
    }
    return;
  }

  try {
    const { BigQuery } = await import("@google-cloud/bigquery");
    const bq = new BigQuery({ projectId: config.BIGQUERY_PROJECT_ID });
    const table = bq.dataset(config.BIGQUERY_DATASET ?? "advisor_analytics").table("advisor_events");

    const rows = events.map((e) => ({
      event_type: e.type,
      session_id: (e.payload.sessionId as string) ?? "",
      payload: JSON.stringify(e.payload),
      timestamp: e.timestamp,
    }));

    await table.insert(rows);
  } catch (err) {
    logger.warn({ err }, "BigQuery flush failed — events dropped");
  }
}
