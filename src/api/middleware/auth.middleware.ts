import { DI } from "@cor-matrix/di";
import { env } from "@cor-matrix/utils/env";
import { Logger } from "@cor-matrix/utils/logger";
import { DatabaseService } from "@cor-matrix/db";
import { WorkspaceTokenTable } from "@cor-matrix/db/schema";
import { eq } from "drizzle-orm";
import jwt from "@elysiajs/jwt";
import Elysia from "elysia";

export type AuthConfig = {
  apiKeyAuth?: boolean;
  bearerAuth?: boolean;
};

export const DefaultAuthConfig: AuthConfig = {
  apiKeyAuth: false,
  bearerAuth: false,
};

const logger = DI.resolve(Logger).child({ name: "Auth" });

export const auth = (config: AuthConfig = DefaultAuthConfig) =>
  new Elysia({
    name: "auth",
    seed: config,
  })
    .use(
      jwt({
        name: "jwt",
        secret: env.JWT_SECRET.unwrap(),
      }),
    )
    .macro({
      auth: (routeConfig: AuthConfig = DefaultAuthConfig) => {
        const mergedConfig = {
          ...config,
          ...routeConfig,
        };
        return {
          beforeHandle: async ({
            headers: { authorization },
            jwt,
            status,
            route,
            params,
          }) => {
            if (
              (mergedConfig.apiKeyAuth || mergedConfig.bearerAuth) &&
              (!authorization || authorization.length === 0)
            ) {
              logger.warn(`The route ${route} requires authentication.`);
              return status(401, {
                success: false,
                code: "UNAUTHORIZED",
                error: `Please provide a valid ${
                  mergedConfig.apiKeyAuth ? "API Key" : "Bearer Token"
                } in the Authorization header.`,
              });
            }
            if (mergedConfig.apiKeyAuth) {
              const apiKey = env.API_KEY;
              if (!apiKey || authorization !== apiKey.unwrap()) {
                logger.warn(`Invalid API key in Authorization header.`);
                return status(401, {
                  success: false,
                  code: "UNAUTHORIZED",
                  error: "Invalid API key in Authorization header",
                });
              }
            } else if (mergedConfig.bearerAuth) {
              if (!authorization) {
                logger.warn(`Missing Authorization header for Bearer token.`);
                return status(401, {
                  success: false,
                  code: "UNAUTHORIZED",
                  error: "Missing Bearer token in Authorization header",
                });
              }

              let rawToken = authorization;
              if (authorization.startsWith("Bearer ")) {
                rawToken = authorization.substring(7); // Remove "Bearer " prefix
              }

              const token = await jwt.verify(rawToken);
              if (!token || (token.exp && token.exp < Date.now() / 1000)) {
                logger.warn(`Bearer token is invalid or expired.`);
                return status(401, {
                  success: false,
                  code: "UNAUTHORIZED",
                  error: "Bearer token is invalid or expired",
                });
              }

              try {
                const dbService = DI.resolve(DatabaseService);
                const tokenRecord = await dbService
                  .getConnection()
                  .select()
                  .from(WorkspaceTokenTable)
                  .where(eq(WorkspaceTokenTable.token, rawToken))
                  .limit(1);

                if (!tokenRecord.length) {
                  logger.warn(`Token not found in database.`);
                  return status(401, {
                    success: false,
                    code: "UNAUTHORIZED",
                    error: "Authentication failed, please check your token",
                  });
                }

                const tokenData = tokenRecord[0];
                if (!tokenData) {
                  logger.warn(`Token data not found.`);
                  return status(401, {
                    success: false,
                    code: "UNAUTHORIZED",
                    error: "Authentication failed, please check your token",
                  });
                }

                if (tokenData.isRevoked) {
                  logger.warn(`Token has been revoked.`);
                  return status(401, {
                    success: false,
                    code: "UNAUTHORIZED",
                    error: "Token has been revoked",
                  });
                }

                // Check token expiration from database
                if (tokenData.expiresAt && tokenData.expiresAt < Date.now()) {
                  logger.warn(`Token has expired.`);
                  return status(401, {
                    success: false,
                    code: "UNAUTHORIZED",
                    error: "Token has expired",
                  });
                }

                // Automatic workspace validation for bearer tokens when workspaceId is in route params
                const workspaceId = params?.workspaceId;
                if (workspaceId && tokenData.workspaceId !== workspaceId) {
                  logger.warn(
                    `Token workspace mismatch. Token workspace: ${tokenData.workspaceId}, Requested workspace: ${workspaceId}`,
                  );
                  return status(401, {
                    success: false,
                    code: "UNAUTHORIZED",
                    error: "Token does not have access to this workspace",
                  });
                }

                await dbService
                  .getConnection()
                  .update(WorkspaceTokenTable)
                  .set({ lastUsedAt: Date.now() })
                  .where(eq(WorkspaceTokenTable.token, rawToken));
              } catch (error) {
                logger.error(`Error checking token revocation status:`, {
                  err: error,
                });
                return status(401, {
                  success: false,
                  code: "UNAUTHORIZED",
                  error: "Authentication failed, please check your token",
                });
              }
            }
          },
        };
      },
    })
    .guard({
      auth: {},
      as: "scoped",
    });
