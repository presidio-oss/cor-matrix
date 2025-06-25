/**
 * Database-specific error types for better error handling and debugging.
 */

/**
 * Base class for all database-related errors.
 */
export abstract class DatabaseError extends Error {
  abstract readonly code: string;

  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a structured representation of the error for logging.
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

/**
 * Thrown when database connection cannot be established.
 */
export class DatabaseConnectionError extends DatabaseError {
  readonly code = "DB_CONNECTION_FAILED";

  constructor(source: string, cause?: Error) {
    super(`Failed to establish database connection to: ${source}`, cause, {
      source,
    });
  }
}

/**
 * Thrown when database configuration is invalid.
 */
export class DatabaseConfigurationError extends DatabaseError {
  readonly code = "DB_CONFIG_INVALID";

  constructor(message: string, config?: Record<string, unknown>) {
    super(`Database configuration error: ${message}`, undefined, { config });
  }
}

/**
 * Thrown when database migration fails.
 */
export class DatabaseMigrationError extends DatabaseError {
  readonly code = "DB_MIGRATION_FAILED";

  constructor(message: string, cause?: Error, migrationPath?: string) {
    super(`Database migration failed: ${message}`, cause, { migrationPath });
  }
}

/**
 * Thrown when database operation fails.
 */
export class DatabaseOperationError extends DatabaseError {
  readonly code = "DB_OPERATION_FAILED";

  constructor(
    operation: string,
    cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(`Database operation '${operation}' failed`, cause, {
      operation,
      ...context,
    });
  }
}

/**
 * Thrown when database is not initialized or connection is lost.
 */
export class DatabaseNotInitializedError extends DatabaseError {
  readonly code = "DB_NOT_INITIALIZED";

  constructor() {
    super("Database connection has not been initialized or has been lost");
  }
}
