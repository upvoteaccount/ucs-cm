// Shared Logging Primitive
export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: string;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, context?: string, meta?: Record<string, unknown>): string {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
    ...meta,
  };
  return JSON.stringify(payload);
}

export const logger = {
  debug(message: string, context?: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("debug", message, context, meta));
    }
  },
  info(message: string, context?: string, meta?: Record<string, unknown>): void {
    console.info(formatLog("info", message, context, meta));
  },
  warn(message: string, context?: string, meta?: Record<string, unknown>): void {
    console.warn(formatLog("warn", message, context, meta));
  },
  error(message: string, context?: string, meta?: Record<string, unknown>): void {
    console.error(formatLog("error", message, context, meta));
  },
};
