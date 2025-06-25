import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

/**
 * Database connection type
 */
export type DB = BunSQLiteDatabase;

/**
 * Database configuration.
 */
export interface DatabaseConfig {
  source: string;

  create: boolean;

  timeout?: number;

  enableWAL?: boolean;
}

/**
 * Database health status for monitoring and diagnostics.
 */
export interface DatabaseHealth {
  isHealthy: boolean;

  lastConnected?: number;

  status: "connected" | "disconnected" | "error";

  error?: string;

  fileSize?: number;
}

/**
 * Migration status information.
 */
export interface MigrationStatus {
  isComplete: boolean;

  appliedCount: number;

  lastMigration?: number;

  errors?: string[];
}
