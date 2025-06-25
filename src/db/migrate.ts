import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import path from "path";
import { DatabaseMigrationError } from "./errors";
import type { MigrationStatus, DB } from "./types";

/**
 * Applies database migrations with proper error handling.
 */
export async function migrateDatabase(
  db: DB,
  migrationsPath?: string,
): Promise<MigrationStatus> {
  const migrationsFolder =
    migrationsPath || path.resolve(process.cwd(), "drizzle");

  try {
    const fs = await import("fs/promises");
    try {
      await fs.access(migrationsFolder);
    } catch {
      throw new DatabaseMigrationError(
        `Migrations folder not found: ${migrationsFolder}`,
        undefined,
        migrationsFolder,
      );
    }

    const startTime = Date.now();
    await migrate(db, { migrationsFolder });

    return {
      isComplete: true,
      appliedCount: 0,
      lastMigration: startTime,
      errors: [],
    };
  } catch (error) {
    const migrationError = new DatabaseMigrationError(
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error : undefined,
      migrationsFolder,
    );

    return {
      isComplete: false,
      appliedCount: 0,
      errors: [migrationError.message],
    };
  }
}
