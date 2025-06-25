import { Elysia } from "elysia";
import { DI } from "@cor-matrix/di";
import { Logger } from "@cor-matrix/utils/logger";
import { ulid } from "ulid";

export interface RequestLoggingConfig {
  enabled?: boolean;
  logBody?: boolean;
  logHeaders?: boolean;
  excludePaths?: string[];
}

export const defaultLoggingConfig: RequestLoggingConfig = {
  enabled: true,
  logBody: false,
  logHeaders: false,
  excludePaths: ["/healthz", "/docs"],
};

const logger = DI.resolve(Logger).child({
  name: "RequestLogger",
});

export const requestLogging = (
  config: RequestLoggingConfig = defaultLoggingConfig,
) => {
  return new Elysia({
    name: "request-logging",
    seed: config,
  }).onRequest(({ request }) => {
    if (!config.enabled) return;

    const url = new URL(request.url);
    const pathname = url.pathname;

    if (config.excludePaths?.includes(pathname)) return;

    const requestId = ulid();

    const logData: Record<string, any> = {
      method: request.method,
      path: pathname,
      userAgent: request.headers.get("user-agent"),
      requestId,
    };

    if (config.logHeaders) {
      logData.headers = Object.fromEntries(request.headers.entries());
    }

    logger.info("Incoming request", logData);
  });
};

/**
 * Pre-configured request logging middleware for development
 * Includes body and header logging for debugging
 */
export const devRequestLogging = requestLogging({
  enabled: true,
  logBody: true,
  logHeaders: true,
  excludePaths: ["/healthz"],
});

/**
 * Pre-configured request logging middleware for production
 * Minimal logging for performance
 */
export const prodRequestLogging = requestLogging({
  enabled: true,
  logBody: false,
  logHeaders: false,
  excludePaths: ["/healthz", "/docs"],
});
