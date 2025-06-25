import { DI } from "@cor-matrix/di";
import { Logger, type LoggerInterface } from "@cor-matrix/utils/logger";
import { env } from "@cor-matrix/utils/env";
import { DatabaseService } from "./service";
import { createDefaultConfig } from "./connection";

DI.registerFactory(
  DatabaseService,
  [Logger],
  (logger: LoggerInterface) => {
    const config = createDefaultConfig(env.DB_FILE_NAME);
    return new DatabaseService(config, logger.child({ name: "Database" }, {}));
  },
  "singleton",
  {
    onDispose: async (service: DatabaseService) => {
      await service.close();
    },
  },
);

export type {
  DB,
  DatabaseConfig,
  DatabaseHealth,
  MigrationStatus,
} from "./types";
export { DatabaseService } from "./service";
export {
  DatabaseError,
  DatabaseConnectionError,
  DatabaseConfigurationError,
  DatabaseMigrationError,
  DatabaseOperationError,
  DatabaseNotInitializedError,
} from "./errors";
export { migrateDatabase } from "./migrate";
