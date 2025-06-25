CREATE TABLE `CodeOriginRatio` (
	`id` text PRIMARY KEY NOT NULL,
	`codeOriginRecordId` text NOT NULL,
	`order` integer NOT NULL,
	`signature` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`codeOriginRecordId`) REFERENCES `CodeOriginRecord`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_code_origin_ratio_code_origin_record_id` ON `CodeOriginRatio` (`codeOriginRecordId`);--> statement-breakpoint
CREATE TABLE `CodeOriginRecord` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`path` text NOT NULL,
	`language` text NOT NULL,
	`timestamp` integer NOT NULL,
	`generatedBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_code_origin_record_workspace_id` ON `CodeOriginRecord` (`workspaceId`);--> statement-breakpoint
CREATE TABLE `Workspace` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer,
	`isArchived` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Workspace_name_unique` ON `Workspace` (`name`);--> statement-breakpoint
CREATE INDEX `idx_workspace_name` ON `Workspace` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspace_name_unique` ON `Workspace` (`name`);--> statement-breakpoint
CREATE TABLE `WorkspaceToken` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`token` text NOT NULL,
	`description` text,
	`createdAt` integer NOT NULL,
	`lastUsedAt` integer,
	`expiresAt` integer,
	`isRevoked` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_token_workspace_id` ON `WorkspaceToken` (`workspaceId`);