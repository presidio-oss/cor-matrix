import type { LoggerInterface } from "@cor-matrix/utils/logger";
import type { DatabaseConfig, DB, DatabaseHealth } from "./types";
import { createDatabaseConnection, validateDatabaseConfig } from "./connection";
import { migrateDatabase } from "./migrate";
import { DatabaseNotInitializedError, DatabaseOperationError } from "./errors";

/**
 * Database service that manages connection lifecycle.
 */
export class DatabaseService {
  private connection: DB | null = null;
  private isInitialized = false;
  private lastConnected?: number;

  constructor(
    private readonly config: DatabaseConfig,
    private readonly logger: LoggerInterface,
  ) {
    validateDatabaseConfig(config);
    this.logger.debug("DatabaseService created", { config: this.config });
  }

  /**
   * Gets the database connection, creating it if necessary.
   */
  getConnection(): DB {
    if (!this.connection) {
      this.initialize();
    }

    if (!this.connection) {
      throw new DatabaseNotInitializedError();
    }

    return this.connection;
  }

  /**
   * Initializes the database connection.
   * Called automatically by getConnection() if needed.
   */
  private initialize(): void {
    try {
      this.logger.info("Initializing database connection", {
        source: this.config.source,
      });

      this.connection = createDatabaseConnection(this.config);
      this.isInitialized = true;
      this.lastConnected = Date.now();

      this.logger.info("Database connection established successfully", {
        source: this.config.source,
      });
    } catch (error) {
      this.logger.error("Failed to initialize database connection", {
        error: error instanceof Error ? error.message : String(error),
        source: this.config.source,
      });
      throw error;
    }
  }

  /**
   * Applies database migrations.
   * Returns migration status for monitoring.
   */
  async migrate(migrationsPath?: string): Promise<void> {
    const connection = this.getConnection();

    try {
      this.logger.info("Starting database migration", {
        migrationsPath: migrationsPath || "drizzle",
      });

      const result = await migrateDatabase(connection, migrationsPath);

      if (!result.isComplete) {
        const errorMessage =
          result.errors?.join(", ") || "Unknown migration error";
        throw new DatabaseOperationError("migration", new Error(errorMessage));
      }

      this.logger.info("Database migration completed successfully", {
        appliedCount: result.appliedCount,
        lastMigration: result.lastMigration,
      });
    } catch (error) {
      this.logger.error("Database migration failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Checks database health status.
   */
  async getHealth(): Promise<DatabaseHealth> {
    try {
      this.getConnection();

      return {
        isHealthy: true,
        lastConnected: this.lastConnected,
        status: "connected",
      };
    } catch (error) {
      return {
        isHealthy: false,
        lastConnected: this.lastConnected,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Closes the database connection and cleans up resources.
   */
  async close(): Promise<void> {
    if (this.connection) {
      try {
        this.logger.info("Closing database connection");

        this.connection = null;
        this.isInitialized = false;

        this.logger.info("Database connection closed successfully");
      } catch (error) {
        this.logger.error("Error closing database connection", {
          error: error instanceof Error ? error.message : String(error),
        });
        throw new DatabaseOperationError(
          "close",
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  }

  /**
   * Gets connection status information.
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasConnection: this.connection !== null,
      lastConnected: this.lastConnected,
      config: {
        source: this.config.source,
        create: this.config.create,
      },
    };
  }
}
