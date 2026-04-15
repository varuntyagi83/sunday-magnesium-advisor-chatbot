import pino from "pino";
import { config } from "./config.js";

const transport =
  config.NODE_ENV === "development"
    ? pino.transport({ target: "pino-pretty", options: { colorize: true } })
    : undefined;

const baseLogger = pino({ level: config.LOG_LEVEL }, transport);

export function createLogger(name: string) {
  return baseLogger.child({ module: name });
}
