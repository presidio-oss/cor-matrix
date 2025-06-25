import { WorkspaceTable, WorkspaceTokenTable } from "@cor-matrix/db/schema";
import { DatabaseService } from "@cor-matrix/db";
import { WorkspaceID } from "@cor-matrix/utils/id";
import { eq, and, desc, ne } from "drizzle-orm";
import {
  CorAppError,
  WorkspaceError,
  WorkspaceNotFoundError,
  WorkspaceAlreadyExistsError,
} from "@cor-matrix/utils/error";
import { DI } from "@cor-matrix/di";
import { Logger } from "@cor-matrix/utils/logger";

const logger = DI.resolve(Logger).child({ name: "WorkspaceService" });

export class WorkspaceService {
  constructor(private dbService: DatabaseService) {}

  /**
   * Create a new workspace
   */
  async create(name: string): Promise<any> {
    try {
      const connection = this.dbService.getConnection();

      const existing = await connection
        .select()
        .from(WorkspaceTable)
        .where(eq(WorkspaceTable.name, name))
        .limit(1);

      if (existing.length > 0) {
        logger.error(`Workspace with name ${name} already exists`);
        throw new WorkspaceAlreadyExistsError({
          message: `Workspace with name ${name} already exists`,
        });
      }

      const workspaceData = {
        id: new WorkspaceID().toString(),
        name,
        createdAt: Date.now(),
        updatedAt: null,
        isArchived: false,
      };

      const result = await connection
        .insert(WorkspaceTable)
        .values(workspaceData)
        .returning();

      if (!result[0]) {
        logger.error(`Failed to create workspace ${name}`);
        throw new WorkspaceError({ message: "Failed to create workspace" });
      }

      return result[0];
    } catch (error) {
      logger.error(`Failed to create workspace ${name}`, { err: error });
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new WorkspaceError({
        message: "Failed to create workspace",
        cause: error,
      });
    }
  }

  /**
   * Get workspace by ID
   */
  async getById(id: string): Promise<any> {
    try {
      const connection = this.dbService.getConnection();
      const result = await connection
        .select()
        .from(WorkspaceTable)
        .where(eq(WorkspaceTable.id, id))
        .limit(1);

      if (!result.length) {
        logger.error(`Workspace with id ${id} not found`);
        throw new WorkspaceNotFoundError({
          message: `Workspace with id ${id} not found`,
        });
      }

      return result[0];
    } catch (error) {
      logger.error(`Failed to get workspace ${id}`, { err: error });
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new WorkspaceError({
        message: "Failed to get workspace",
        cause: error,
      });
    }
  }

  /**
   * List all workspaces
   */
  async list(
    includeArchived: boolean = false,
    limit: number = 50,
    offset: number = 0,
  ): Promise<any[]> {
    try {
      const connection = this.dbService.getConnection();

      const conditions = [];
      if (!includeArchived) {
        conditions.push(eq(WorkspaceTable.isArchived, false));
      }

      const baseQuery = connection.select().from(WorkspaceTable);

      const result =
        conditions.length > 0
          ? await baseQuery
              .where(and(...conditions))
              .orderBy(desc(WorkspaceTable.createdAt))
              .limit(limit)
              .offset(offset)
          : await baseQuery
              .orderBy(desc(WorkspaceTable.createdAt))
              .limit(limit)
              .offset(offset);

      return result;
    } catch (error) {
      logger.error("Failed to list workspaces", { err: error });
      throw new WorkspaceError({
        message: "Failed to list workspaces",
        cause: error,
      });
    }
  }

  /**
   * Update workspace
   */
  async update(
    id: string,
    updates: {
      name?: string;
      isArchived?: boolean;
    },
  ): Promise<any> {
    try {
      const connection = this.dbService.getConnection();

      await this.getById(id);

      if (updates.name) {
        const existing = await connection
          .select()
          .from(WorkspaceTable)
          .where(
            and(
              eq(WorkspaceTable.name, updates.name),
              ne(WorkspaceTable.id, id),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          logger.error(`Workspace with name ${updates.name} already exists`);
          throw new WorkspaceAlreadyExistsError({
            message: `Workspace with name ${updates.name} already exists`,
          });
        }
      }

      const updateData: any = {
        updatedAt: Date.now(),
      };

      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      if (updates.isArchived !== undefined) {
        updateData.isArchived = updates.isArchived;
      }

      const result = await connection
        .update(WorkspaceTable)
        .set(updateData)
        .where(eq(WorkspaceTable.id, id))
        .returning();

      if (!result[0]) {
        throw new WorkspaceError({ message: "Failed to update workspace" });
      }

      return result[0];
    } catch (error) {
      logger.error(`Failed to update workspace ${id}`, { err: error });
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new WorkspaceError({
        message: "Failed to update workspace",
        cause: error,
      });
    }
  }

  /**
   * Delete workspace and cascade delete related tokens
   */
  async delete(id: string): Promise<any> {
    try {
      const connection = this.dbService.getConnection();

      await this.getById(id);

      // Delete related tokens first (cascade delete)
      await connection
        .delete(WorkspaceTokenTable)
        .where(eq(WorkspaceTokenTable.workspaceId, id));

      logger.info(`Deleted tokens for workspace ${id}`);

      // Then delete the workspace
      const result = await connection
        .delete(WorkspaceTable)
        .where(eq(WorkspaceTable.id, id))
        .returning();

      if (!result[0]) {
        throw new WorkspaceError({ message: "Failed to delete workspace" });
      }

      logger.info(`Successfully deleted workspace ${id} and related tokens`);
      return result[0];
    } catch (error) {
      logger.error(`Failed to delete workspace ${id}`, { err: error });
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new WorkspaceError({
        message: "Failed to delete workspace",
        cause: error,
      });
    }
  }

  /**
   * Archive workspace (soft delete)
   */
  async archive(id: string): Promise<any> {
    try {
      return await this.update(id, { isArchived: true });
    } catch (error) {
      logger.error(`Failed to archive workspace ${id}`, { err: error });
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new WorkspaceError({
        message: "Failed to archive workspace",
        cause: error,
      });
    }
  }

  /**
   * Unarchive workspace
   */
  async unarchive(id: string): Promise<any> {
    try {
      return await this.update(id, { isArchived: false });
    } catch (error) {
      logger.error(`Failed to unarchive workspace ${id}`, { err: error });
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new WorkspaceError({
        message: "Failed to unarchive workspace",
        cause: error,
      });
    }
  }
}
