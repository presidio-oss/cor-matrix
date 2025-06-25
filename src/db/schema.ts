import { relations } from "drizzle-orm";
import {
  int,
  sqliteTable,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const WorkspaceTable = sqliteTable(
  "Workspace",
  {
    id: text().primaryKey(),
    name: text().unique().notNull(),
    createdAt: int().notNull(),
    updatedAt: int(),
    isArchived: int({ mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    index("idx_workspace_name").on(table.name),
    uniqueIndex("idx_workspace_name_unique").on(table.name),
  ],
);

export const CodeOriginRecordTable = sqliteTable(
  "CodeOriginRecord",
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => WorkspaceTable.id),
    path: text().notNull(),
    language: text().notNull(),
    timestamp: int().notNull(),
    generatedBy: text().notNull(),
    createdAt: int().notNull(),
  },
  (table) => [
    index("idx_code_origin_record_workspace_id").on(table.workspaceId),
  ],
);

export const CodeOriginRatioTable = sqliteTable(
  "CodeOriginRatio",
  {
    id: text().primaryKey(),
    codeOriginRecordId: text()
      .notNull()
      .references(() => CodeOriginRecordTable.id),
    order: int().notNull(),
    signature: text().notNull(),
    createdAt: int().notNull(),
  },
  (table) => [
    index("idx_code_origin_ratio_code_origin_record_id").on(
      table.codeOriginRecordId,
    ),
  ],
);

export const WorkspaceTokenTable = sqliteTable(
  "WorkspaceToken",
  {
    id: text().primaryKey(),
    workspaceId: text()
      .notNull()
      .references(() => WorkspaceTable.id),
    token: text().notNull(),
    description: text(),
    createdAt: int().notNull(),
    lastUsedAt: int(),
    expiresAt: int(),
    isRevoked: int({ mode: "boolean" }).notNull().default(false),
  },
  (table) => [index("idx_workspace_token_workspace_id").on(table.workspaceId)],
);

export const WorkspaceRelations = relations(WorkspaceTable, ({ many }) => ({
  codeOriginRecords: many(CodeOriginRecordTable),
  tokens: many(WorkspaceTokenTable),
}));

export const CodeOriginRecordRelations = relations(
  CodeOriginRecordTable,
  ({ one, many }) => ({
    workspace: one(WorkspaceTable, {
      fields: [CodeOriginRecordTable.workspaceId],
      references: [WorkspaceTable.id],
    }),
    codeOriginRatios: many(CodeOriginRatioTable),
  }),
);

export const CodeOriginRatioRelations = relations(
  CodeOriginRatioTable,
  ({ one }) => ({
    codeOriginRecord: one(CodeOriginRecordTable, {
      fields: [CodeOriginRatioTable.codeOriginRecordId],
      references: [CodeOriginRecordTable.id],
    }),
  }),
);

export const WorkspaceTokenRelations = relations(
  WorkspaceTokenTable,
  ({ one }) => ({
    workspace: one(WorkspaceTable, {
      fields: [WorkspaceTokenTable.workspaceId],
      references: [WorkspaceTable.id],
    }),
  }),
);
