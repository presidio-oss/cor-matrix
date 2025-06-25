import {
  CodeOriginRatioTable,
  CodeOriginRecordTable,
  WorkspaceTable,
} from "@cor-matrix/db/schema";
import { DatabaseService } from "@cor-matrix/db";
import { CodeOriginRatioID, CodeOriginRecordID } from "@cor-matrix/utils/id";
import { eq, inArray } from "drizzle-orm";
import { CorAppError } from "@cor-matrix/utils/error";
import { DI } from "@cor-matrix/di";
import { Logger } from "@cor-matrix/utils/logger";

/**
 * Code Origin specific errors
 */
export class CodeOriginError extends CorAppError {
  constructor(options?: { message?: string; code?: string; cause?: unknown }) {
    super("Code origin error", {
      ...options,
      code: options?.code ?? "CODE_ORIGIN_ERROR",
    });
  }
}

const logger = DI.resolve(Logger).child({ name: "CodeOriginService" });

export interface CodeOriginRatio {
  signature: string;
  order: number;
}

export interface CodeOriginEntry {
  path: string;
  language: string;
  timestamp: number;
  generatedBy: string;
  cors: CodeOriginRatio[];
}

export class CodeOriginService {
  constructor(private dbService: DatabaseService) {}

  /**
   * Get code origin ratios for a workspace
   */
  async getCodeOriginRatios(workspaceId: string): Promise<any[]> {
    try {
      const connection = this.dbService.getConnection();

      const codeOriginRecords = await connection
        .select()
        .from(CodeOriginRecordTable)
        .where(eq(CodeOriginRecordTable.workspaceId, workspaceId));

      if (!codeOriginRecords || codeOriginRecords.length === 0) {
        return [];
      }

      const corIds = codeOriginRecords.map(
        (codeOriginRecord) => codeOriginRecord.id,
      );

      const codeOriginRatios = await connection
        .select()
        .from(CodeOriginRatioTable)
        .where(inArray(CodeOriginRatioTable.codeOriginRecordId, corIds));

      const recordPathMap = new Map(
        codeOriginRecords.map((record) => [record.id, record.path]),
      );

      const enrichedRatios = codeOriginRatios.map((ratio) => ({
        ...ratio,
        path: recordPathMap.get(ratio.codeOriginRecordId),
      }));

      return enrichedRatios;
    } catch (error) {
      logger.error(
        `Failed to get code origin ratios for workspace ${workspaceId}`,
        {
          err: error,
        },
      );
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new CodeOriginError({
        message: "Failed to get code origin ratios",
        cause: error,
      });
    }
  }

  /**
   * Record code origin entries for a workspace
   * Silently skips if workspace doesn't exist
   */
  async recordCodeOrigin(
    workspaceId: string,
    entries: CodeOriginEntry[],
  ): Promise<{ ok: boolean; message: string }> {
    try {
      const connection = this.dbService.getConnection();

      const workspace = await connection
        .select()
        .from(WorkspaceTable)
        .where(eq(WorkspaceTable.id, workspaceId))
        .limit(1);

      if (!workspace.length) {
        logger.warn(
          `Workspace ${workspaceId} not found, skipping code origin recording`,
        );
        return {
          ok: true,
          message: "Code origin recording skipped - workspace not found",
        };
      }

      if (!entries || entries.length === 0) {
        logger.info(`No entries provided for workspace ${workspaceId}`);
        return {
          ok: true,
          message: "Code origin recording completed - no entries to process",
        };
      }

      const codeOriginRecordToCreateWithID = entries.map((entry) => ({
        id: new CodeOriginRecordID().toString(),
        workspaceId,
        path: entry.path,
        language: entry.language,
        timestamp: entry.timestamp,
        generatedBy: entry.generatedBy,
        createdAt: Date.now(),
        cors: entry.cors || [],
      }));

      const entriesToCreate = codeOriginRecordToCreateWithID.map((entry) => ({
        id: entry.id,
        workspaceId,
        path: entry.path,
        language: entry.language,
        timestamp: entry.timestamp,
        generatedBy: entry.generatedBy,
        createdAt: Date.now(),
      }));

      await connection.insert(CodeOriginRecordTable).values(entriesToCreate);

      const corsToCreate = codeOriginRecordToCreateWithID.flatMap((entry) => {
        if (!entry.cors || entry.cors.length === 0) {
          return [];
        }
        return entry.cors.map((cor) => ({
          id: new CodeOriginRatioID().toString(),
          codeOriginRecordId: entry.id,
          order: cor.order,
          signature: cor.signature,
          createdAt: Date.now(),
        }));
      });

      if (corsToCreate.length > 0) {
        await connection.insert(CodeOriginRatioTable).values(corsToCreate);
      }

      return {
        ok: true,
        message: "Code origin recorded successfully",
      };
    } catch (error) {
      logger.error(
        `Failed to record code origin for workspace ${workspaceId}`,
        {
          err: error,
        },
      );
      if (error instanceof CorAppError) {
        throw error;
      }
      throw new CodeOriginError({
        message: "Failed to record code origin",
        cause: error,
      });
    }
  }
}
