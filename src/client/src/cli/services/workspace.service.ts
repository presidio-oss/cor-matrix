import { log } from "../utils/ui";
import * as api from "../utils/api";
import chalk from "chalk";

// This interface would ideally be shared or generated from the API schema
interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number | null;
  isArchived: boolean;
}

export class WorkspaceService {
  constructor(private options: { apiUrl: string; apiToken: string }) {}

  public async create(name: string) {
    try {
      log.info(`Creating workspace "${name}"...`);
      const newWorkspace = await api.createWorkspace(
        this.options.apiUrl,
        this.options.apiToken,
        name,
      );
      log.success(
        `Workspace "${name}" created successfully, ID: ${newWorkspace.id}`,
      );
      if (newWorkspace) {
        this.display([newWorkspace]);
      }
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while creating the workspace.");
      }
    }
  }

  public async list(includeArchived: boolean | undefined) {
    try {
      log.info("Fetching workspaces...");
      const workspaces = await api.listWorkspaces(
        this.options.apiUrl,
        this.options.apiToken,
        includeArchived,
      );
      log.success("Workspaces fetched successfully.");
      if (!workspaces || workspaces.length === 0) {
        log.info("No workspaces found.");
        return;
      }
      this.display(workspaces);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while fetching workspaces.");
      }
    }
  }

  public async get(id: string) {
    try {
      log.info(`Fetching workspace "${id}"...`);
      const workspace = await api.getWorkspace(
        this.options.apiUrl,
        this.options.apiToken,
        id,
      );
      log.success(`Workspace "${id}" fetched successfully.`);
      this.display([workspace]);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while fetching the workspace.");
      }
    }
  }

  public async update(id: string, name: string | undefined) {
    try {
      log.info(`Updating workspace "${id}"...`);
      const updatedWorkspace = await api.updateWorkspace(
        this.options.apiUrl,
        this.options.apiToken,
        id,
        { name },
      );
      log.success(`Workspace "${id}" updated successfully.`);
      this.display([updatedWorkspace]);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while updating the workspace.");
      }
    }
  }

  public async archive(id: string) {
    try {
      log.info(`Archiving workspace "${id}"...`);
      const archivedWorkspace = await api.archiveWorkspace(
        this.options.apiUrl,
        this.options.apiToken,
        id,
      );
      log.success(`Workspace "${id}" archived successfully.`);
      this.display([archivedWorkspace]);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while archiving the workspace.");
      }
    }
  }

  public async unarchive(id: string) {
    try {
      log.info(`Unarchiving workspace "${id}"...`);
      const unarchivedWorkspace = await api.unarchiveWorkspace(
        this.options.apiUrl,
        this.options.apiToken,
        id,
      );
      log.success(`Workspace "${id}" unarchived successfully.`);
      this.display([unarchivedWorkspace]);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while unarchiving the workspace.");
      }
    }
  }

  public async delete(id: string) {
    try {
      log.info(`Deleting workspace "${id}"...`);
      await api.deleteWorkspace(this.options.apiUrl, this.options.apiToken, id);
      log.success(`Workspace "${id}" deleted successfully.`);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while deleting the workspace.");
      }
    }
  }

  private display(workspaces: Workspace[]) {
    const tableData = workspaces.map((ws) => ({
      ID: ws.id,
      Name: ws.name,
      Archived: ws.isArchived ? chalk.yellow("Yes") : "No",
      Created: new Date(ws.createdAt).toLocaleString(),
    }));
    console.table(tableData);
  }
}
