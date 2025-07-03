import { WorkspaceTable, WorkspaceTokenTable } from "@cor-matrix/db/schema";
import { DatabaseService } from "@cor-matrix/db";
import { TokenID } from "@cor-matrix/utils/id";
import { eq, and, desc } from "drizzle-orm";
import { type JWTPayloadSpec } from "@elysiajs/jwt";
import {
  CorAppError,
  TokenError,
  TokenNotFoundError,
  TokenExpiredError,
  TokenRevokedError,
  TokenValidationError,
  WorkspaceNotFoundError,
} from "@cor-matrix/utils/error";
import { DI } from "@cor-matrix/di";
import { Logger } from "@cor-matrix/utils/logger";

/**
 * JWT signing function type
 */
type JwtSignFunc = (
  morePayload: Record<string, string | number> &
    Omit<JWTPayloadSpec, "nbf" | "exp"> & {
      exp?: string | number;
      nbf?: string | number;
    },
) => Promise<string>;

/**
 * JWT verification function type
 */
type JwtVerifyFunc = (jwt?: string) => Promise<any>;

const logger = DI.resolve(Logger).child({ name: "TokenService" });

export class TokenService {
  constructor(private dbService: DatabaseService) {}

  /**
   * Create a new token for a workspace
   */
  async create(
    workspaceId: string,
    jwtSign: JwtSignFunc,
    description?: string,
    expiresAt?: number | null,
  ): Promise<typeof WorkspaceTokenTable.$inferSelect> {
    try {
      const workspace = await this.dbService
        .getConnection()
        .select()
        .from(WorkspaceTable)
        .where(eq(WorkspaceTable.id, workspaceId))
        .limit(1);

      if (!workspace.length) {
        logger.error(`Workspace with id ${workspaceId} not found`);
        throw new WorkspaceNotFoundError({
          message: `Workspace with id ${workspaceId} not found`,
        });
      }

      const signedToken = await jwtSign({
        iat: Date.now(),
        ...(expiresAt && expiresAt > 0 ? { exp: expiresAt } : {}),
        aud: workspaceId,
        name: workspace.at(0)?.name!,
      });

      const tokenData = {
        id: new TokenID().toString(),
        workspaceId,
        token: signedToken,
        description: description || null,
        createdAt: Date.now(),
        lastUsedAt: null,
        expiresAt: expiresAt ?? null,
        isRevoked: false,
      };

      const result = await this.dbService
        .getConnection()
        .insert(WorkspaceTokenTable)
        .values(tokenData)
        .returning();

      if (!result[0]) {
        logger.error(`Failed to create token for workspace ${workspaceId}`);
        throw new TokenError({ message: "Failed to create token" });
      }

      return result[0];
    } catch (error) {
      logger.error(`Failed to create token for workspace ${workspaceId}`, {
        err: error,
      });
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new TokenError({ message: "Failed to create token", cause: error });
    }
  }

  /**
   * List tokens with optional filtering
   */
  async list(
    workspaceId?: string,
    includeRevoked: boolean = false,
    limit: number = 50,
    offset: number = 0,
  ): Promise<(typeof WorkspaceTokenTable.$inferSelect)[]> {
    try {
      const connection = this.dbService.getConnection();

      const conditions = [];
      if (workspaceId) {
        conditions.push(eq(WorkspaceTokenTable.workspaceId, workspaceId));
      }
      if (!includeRevoked) {
        conditions.push(eq(WorkspaceTokenTable.isRevoked, false));
      }

      const baseQuery = connection.select().from(WorkspaceTokenTable);

      const result =
        conditions.length > 0
          ? await baseQuery
              .where(and(...conditions))
              .orderBy(desc(WorkspaceTokenTable.createdAt))
              .limit(limit)
              .offset(offset)
          : await baseQuery
              .orderBy(desc(WorkspaceTokenTable.createdAt))
              .limit(limit)
              .offset(offset);

      return result;
    } catch (error) {
      logger.error("Failed to list tokens", { err: error });
      throw new TokenError({ message: "Failed to list tokens", cause: error });
    }
  }

  /**
   * Get a single token by ID
   */
  async getById(
    tokenId: string,
  ): Promise<typeof WorkspaceTokenTable.$inferSelect> {
    try {
      const connection = this.dbService.getConnection();
      const result = await connection
        .select()
        .from(WorkspaceTokenTable)
        .where(eq(WorkspaceTokenTable.id, tokenId))
        .limit(1);

      if (!result.length || !result[0]) {
        logger.error(`Token with id ${tokenId} not found`);
        throw new TokenNotFoundError({
          message: `Token with id ${tokenId} not found`,
        });
      }

      return result[0];
    } catch (error) {
      logger.error(`Failed to get token ${tokenId}`, { err: error });
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new TokenError({ message: "Failed to get token", cause: error });
    }
  }

  /**
   * Update a token
   */
  async update(
    tokenId: string,
    updates: {
      description?: string;
      expiresAt?: number | null;
    },
  ): Promise<typeof WorkspaceTokenTable.$inferSelect> {
    try {
      const connection = this.dbService.getConnection();

      await this.getById(tokenId);

      const updateData: any = {};
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }
      if (updates.expiresAt !== undefined) {
        updateData.expiresAt = updates.expiresAt;
      }

      if (Object.keys(updateData).length === 0) {
        throw new TokenValidationError({
          message: "No valid fields provided for update",
        });
      }

      const result = await connection
        .update(WorkspaceTokenTable)
        .set(updateData)
        .where(eq(WorkspaceTokenTable.id, tokenId))
        .returning();

      if (!result[0]) {
        throw new TokenError({ message: "Failed to update token" });
      }

      return result[0];
    } catch (error) {
      logger.error(`Failed to update token ${tokenId}`, { err: error });
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new TokenError({ message: "Failed to update token", cause: error });
    }
  }

  /**
   * Delete a token
   */
  async delete(
    tokenId: string,
  ): Promise<typeof WorkspaceTokenTable.$inferSelect> {
    try {
      const connection = this.dbService.getConnection();

      await this.getById(tokenId);

      const result = await connection
        .delete(WorkspaceTokenTable)
        .where(eq(WorkspaceTokenTable.id, tokenId))
        .returning();

      if (!result[0]) {
        throw new TokenError({ message: "Failed to delete token" });
      }

      return result[0];
    } catch (error) {
      logger.error(`Failed to delete token ${tokenId}`, { err: error });
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new TokenError({ message: "Failed to delete token", cause: error });
    }
  }

  /**
   * Revoke a token
   */
  async revoke(
    tokenId: string,
  ): Promise<typeof WorkspaceTokenTable.$inferSelect> {
    try {
      const connection = this.dbService.getConnection();

      const token = await this.getById(tokenId);

      if (token.isRevoked) {
        throw new TokenValidationError({
          message: "Token is already revoked",
          code: "TOKEN_ALREADY_REVOKED",
        });
      }

      const result = await connection
        .update(WorkspaceTokenTable)
        .set({ isRevoked: true })
        .where(eq(WorkspaceTokenTable.id, tokenId))
        .returning();

      if (!result[0]) {
        throw new TokenError({ message: "Failed to revoke token" });
      }

      return result[0];
    } catch (error) {
      logger.error(`Failed to revoke token ${tokenId}`, { err: error });
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new TokenError({ message: "Failed to revoke token", cause: error });
    }
  }

  /**
   * Unrevoke a token
   */
  async unrevoke(
    tokenId: string,
  ): Promise<typeof WorkspaceTokenTable.$inferSelect> {
    try {
      const connection = this.dbService.getConnection();

      const token = await this.getById(tokenId);

      if (!token.isRevoked) {
        throw new TokenValidationError({
          message: "Token is not revoked",
          code: "TOKEN_NOT_REVOKED",
        });
      }

      const result = await connection
        .update(WorkspaceTokenTable)
        .set({ isRevoked: false })
        .where(eq(WorkspaceTokenTable.id, tokenId))
        .returning();

      if (!result[0]) {
        throw new TokenError({ message: "Failed to unrevoke token" });
      }

      return result[0];
    } catch (error) {
      logger.error(`Failed to unrevoke token ${tokenId}`, { err: error });
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new TokenError({
        message: "Failed to unrevoke token",
        cause: error,
      });
    }
  }
}
