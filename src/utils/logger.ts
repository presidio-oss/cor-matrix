import { DI } from "@cor-matrix/di";
import { env } from "@cor-matrix/utils/env";
import pino from "pino";
import pretty from "pino-pretty";

export interface LoggerConfig {
  level?: pino.Level;
  pretty?: boolean;
  redactPaths?: string[];
  serializers?: Record<string, pino.SerializerFn>;
}

export interface LoggerOptions extends LoggerConfig {
  enableColors?: boolean;
  timestampFormat?: string;
  destination?: string;
}

export interface LogContext {
  name: string;
  err?: unknown;
  [key: string]: any;
}

export interface LoggerInterface {
  fatal(message: string, meta?: Partial<LogContext>): void;
  error(message: string, meta?: Partial<LogContext>): void;
  warn(message: string, meta?: Partial<LogContext>): void;
  info(message: string, meta?: Partial<LogContext>): void;
  debug(message: string, meta?: Partial<LogContext>): void;
  trace(message: string, meta?: Partial<LogContext>): void;
  child(bindings: LogContext, options: Partial<LoggerConfig>): LoggerInterface;
  setLevel(level: pino.Level): void;
  getLevel(): pino.Level;
  flush(): Promise<void>;
  isLevelEnabled(level: pino.Level): boolean;
}

function createPinoLogger(options: LoggerOptions = {}): pino.Logger {
  const baseConfig: pino.LoggerOptions = {
    level: options.level || "info",
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: options.serializers,
    redact: options.redactPaths,
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  if (options.pretty) {
    const prettyStream = pretty({
      colorize: options.enableColors ?? true,
      colorizeObjects: true,
      minimumLevel: options.level || "info",
      translateTime: options.timestampFormat || "SYS:standard",
    });
    return pino(baseConfig, prettyStream);
  }

  return pino(baseConfig);
}

export class Logger implements LoggerInterface {
  private pinoLogger: pino.Logger;
  private defaultContext: LogContext;
  private config: LoggerOptions;

  constructor(
    pinoLogger: pino.Logger,
    defaultContext: LogContext,
    config: LoggerOptions = {},
  ) {
    this.pinoLogger = pinoLogger;
    this.defaultContext = defaultContext;
    this.config = config;
  }

  private log(
    level: pino.Level,
    message: string,
    meta: Partial<LogContext> = {},
  ) {
    const context = {
      ...this.defaultContext,
      ...meta,
    };

    this.pinoLogger[level](context, message);
  }

  setLevel(level: pino.Level): void {
    this.pinoLogger.level = level;
    this.config.level = level;
  }

  getLevel(): pino.Level {
    return this.pinoLogger.level as pino.Level;
  }

  isLevelEnabled(level: pino.Level): boolean {
    return this.pinoLogger.isLevelEnabled(level);
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.pinoLogger.flush();
      resolve();
    });
  }

  fatal(message: string, meta?: Partial<LogContext>): void {
    this.log("fatal", message, meta);
  }

  trace(message: string, meta: Partial<LogContext> = {}): void {
    this.log("trace", message, meta);
  }

  debug(message: string, meta: Partial<LogContext> = {}): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta: Partial<LogContext> = {}): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta: Partial<LogContext> = {}): void {
    this.log("warn", message, meta);
  }

  error(message: string, meta: Partial<LogContext> = {}): void {
    this.log("error", message, meta);
  }

  child(
    bindings: LogContext,
    options: Partial<LoggerConfig> = {},
  ): LoggerInterface {
    const childConfig = { ...this.config, ...options };

    let childPino = this.pinoLogger.child(bindings);
    if (options.level && options.level !== this.config.level) {
      childPino.level = options.level;
    }

    return new Logger(
      childPino,
      {
        ...this.defaultContext,
        ...bindings,
      },
      childConfig,
    );
  }

  static createLogger(
    defaultContext: LogContext,
    options: LoggerOptions = {},
  ): Logger {
    const pinoLogger = createPinoLogger(options);
    return new Logger(pinoLogger, defaultContext, options);
  }

  static defaultLogger = Logger.createLogger(
    { name: "Default" },
    { pretty: env.NODE_ENV === "development", level: env.LOG_LEVEL },
  );
}

DI.registerFactory(Logger, [], () => Logger.defaultLogger);
