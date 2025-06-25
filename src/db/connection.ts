import { drizzle } from "drizzle-orm/bun-sqlite";
import type { DatabaseConfig, DB } from "./types";
import { DatabaseConnectionError, DatabaseConfigurationError } from "./errors";

/**
 * Creates a database connection with proper error handling.
 */
export function createDatabaseConnection(config: DatabaseConfig): DB {
  if (!config.source) {
    throw new DatabaseConfigurationError(
      "Database source path is required",
      config as unknown as Record<string, unknown>,
    );
  }

  if (typeof config.source !== "string" || config.source.trim().length === 0) {
    throw new DatabaseConfigurationError(
      "Database source must be a non-empty string",
      config as unknown as Record<string, unknown>,
    );
  }

  try {
    const connection = drizzle({
      connection: {
        source: config.source.trim(),
        create: config.create ?? true,
      },
    });

    if (config.enableWAL) {
      connection.run("PRAGMA journal_mode = WAL");
    }

    return connection;
  } catch (error) {
    throw new DatabaseConnectionError(
      config.source,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Validates database configuration before attempting connection.
 * Throws DatabaseConfigurationError if configuration is invalid.
 */
export function validateDatabaseConfig(
  config: Partial<DatabaseConfig>,
): asserts config is DatabaseConfig {
  if (!config.source) {
    throw new DatabaseConfigurationError("Database source is required");
  }

  if (typeof config.source !== "string") {
    throw new DatabaseConfigurationError("Database source must be a string");
  }

  if (config.source.trim().length === 0) {
    throw new DatabaseConfigurationError("Database source cannot be empty");
  }

  if (config.create !== undefined && typeof config.create !== "boolean") {
    throw new DatabaseConfigurationError(
      "Database create flag must be a boolean",
    );
  }

  if (
    config.timeout !== undefined &&
    (typeof config.timeout !== "number" || config.timeout < 0)
  ) {
    throw new DatabaseConfigurationError(
      "Database timeout must be a positive number",
    );
  }
}

/**
 * Creates a default database configuration from environment variables.
 * Provides sensible defaults while allowing customization.
 */
export function createDefaultConfig(source: string): DatabaseConfig {
  return {
    source,
    create: true,
    timeout: 30000,
    enableWAL: true,
  };
}
