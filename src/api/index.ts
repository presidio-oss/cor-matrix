import "dotenv/config";
import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { v1 } from "@cor-matrix/api/routes/v1.routes";
import { env } from "@cor-matrix/utils/env";
import { DatabaseService } from "@cor-matrix/db";
import { DI } from "@cor-matrix/di";
import { Logger } from "@cor-matrix/utils/logger";
import { prodRequestLogging } from "@cor-matrix/api/middleware/logging.middleware";

const databaseService = DI.resolve(DatabaseService);
const logger = DI.resolve(Logger).child({ name: "APIServer" });

const PORT = env.API_PORT;

const app = new Elysia()
  .use(
    swagger({
      path: "/docs",
      scalarConfig: {
        authentication: {
          preferredSecurityScheme: "apiKeyAuth",
          apiKey: {
            token: "kp-d2e57d9e-c4fc-4f77-b7cc-15bccfbba8a5",
          },
        },
      },
      swaggerOptions: {
        deepLinking: true,
        displayOperationId: true,
        withCredentials: true,
        persistAuthorization: true,
      },
      documentation: {
        info: {
          title: "COR-Matrix API",
          version: "0.0.1",
          description: "API for COR (Code Origin Ratio) Matrix",
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              description: "Bearer token for authentication",
              type: "apiKey",
              in: "header",
              name: "Authorization",
            },
            apiKeyAuth: {
              description: "API Key for authentication",
              type: "apiKey",
              in: "header",
              name: "Authorization",
            },
          },
        },
      },
    }),
  )
  .onStart(async ({ server }) => {
    await databaseService.migrate();
    logger.info(`Server running on ${server?.url}`);
    logger.info(`API Docs available at ${server?.url}docs`);
  })
  .use(prodRequestLogging)
  .get("/", () => "Welcome to COR (Code Origin Ratio) Matrix API")
  .get("/healthz", () => "OK")
  .use(v1)
  .listen(PORT);

process.on("SIGINT", () => {
  logger.info("Shutting down server...");
  app.stop();
  process.exit(0);
});

export type App = typeof app;
