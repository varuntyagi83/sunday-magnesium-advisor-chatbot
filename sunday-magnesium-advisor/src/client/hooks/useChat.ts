import { useState, useCallback, useRef } from "react";
import { i18n, type Locale } from "../i18n.js";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: RecommendedProduct[];
  suggestions?: string[];
  magnesiumBackground?: string;
  agentDurations?: Record<string, number>;
  timestamp: Date;
}

export interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  url: string;
  imageUrl: string;
  price: number;
  currency?: string;
  form: string;
  mgPerServing: number;
  formFactor?: string;
  unit?: string;
  whyRecommended?: string;
  activeIngredients?: string;
  cautions?: string;
  matchScore: number;
  matchReasons: string[];
  relevanceRank: number;
}

export interface PipelineStep {
  agentId: string;
  agentName: string;
  status: "pending" | "running" | "done" | "error";
  durationMs?: number;
}

const AGENT_IDS = [
  "intent_classifier",
  "health_profiler",
  "product_retriever",
  "embedding_matcher",
  "contraindication_checker",
  "dosage_advisor",
  "response_composer",
  "followup_generator",
] as const;
type AgentId = typeof AGENT_IDS[number];

function makeId() {
  return Math.random().toString(36).slice(2);
}

export function useChat(apiUrl = "", locale = "de") {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Build agent order with translated names from central i18n
  const safeLocale = (locale === "de" || locale === "en" ? locale : "de") as Locale;
  const agentNames = i18n[safeLocale].agentNames;
  const agentOrder = AGENT_IDS.map((agentId) => ({
    agentId,
    agentName: agentNames[agentId as AgentId],
  }));

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = { id: makeId(), role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setPipelineSteps(agentOrder.map((a) => ({ ...a, status: "pending" })));

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${apiUrl}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, ...(sessionId ? { sessionId } : {}), history, locale }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      let products: RecommendedProduct[] = [];
      let suggestions: string[] = [];
      let response = "";
      let magnesiumBackground = "";
      let agentDurations: Record<string, number> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        let eventName = "";
        let dataBuf = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventName = line.slice(7);
          } else if (line.startsWith("data: ")) {
            dataBuf = line.slice(6);
            try {
              const payload = JSON.parse(dataBuf);
              switch (eventName) {
                case "step_start":
                  setPipelineSteps((prev) =>
                    prev.map((s) =>
                      s.agentId === payload.agentId ? { ...s, status: "running" } : s
                    )
                  );
                  break;
                case "step_done":
                  setPipelineSteps((prev) =>
                    prev.map((s) =>
                      s.agentId === payload.agentId
                        ? { ...s, status: payload.status === "error" ? "error" : "done", durationMs: payload.durationMs }
                        : s
                    )
                  );
                  break;
                case "products":
                  products = payload.products;
                  break;
                case "suggestions":
                  suggestions = payload.suggestions;
                  break;
                case "response":
                  response = payload.response;
                  if (payload.magnesiumBackground) magnesiumBackground = payload.magnesiumBackground;
                  break;
                case "done":
                  if (payload.sessionId) setSessionId(payload.sessionId);
                  if (payload.metadata?.agentDurations) agentDurations = payload.metadata.agentDurations;
                  break;
              }
            } catch { /* malformed chunk */ }
          }
        }
      }

      const assistantMsg: Message = {
        id: makeId(),
        role: "assistant",
        content: response,
        products,
        suggestions,
        magnesiumBackground: magnesiumBackground || undefined,
        agentDurations: Object.keys(agentDurations).length ? agentDurations : undefined,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "assistant",
            content: "Something went wrong. Please try again.",
            timestamp: new Date(),
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [messages, sessionId, locale, agentOrder]);

  return { messages, loading, pipelineSteps, sendMessage };
}
