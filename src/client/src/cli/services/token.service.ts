import { log } from "../utils/ui";
import * as api from "../utils/api";
import chalk from "chalk";

// This interface would ideally be shared or generated from the API schema
interface Token {
  id: string;
  workspaceId: string;
  description: string | null;
  createdAt: number;
  expiresAt: number | null;
  lastUsedAt: number | null;
  isRevoked: boolean;
}

export class TokenService {
  constructor(private options: { apiUrl: string; apiToken: string }) {}

  public async create(
    workspaceId: string,
    description?: string,
    expiresAt?: number,
  ) {
    try {
      log.info(`Creating token for workspace "${workspaceId}"...`);
      const newToken = await api.createToken(
        this.options.apiUrl,
        this.options.apiToken,
        workspaceId,
        description,
        expiresAt,
      );
      log.success("Token created successfully.\n");
      console.table({
        Token: newToken.token,
      });
      log.info(
        "Make sure to save this token in a secure location, it will not be shown again.\n",
      );
      this.display([newToken]);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while creating the token.");
      }
    }
  }

  public async list(
    workspaceId?: string,
    includeRevoked?: boolean,
    limit?: number,
    offset?: number,
  ) {
    try {
      log.info("Fetching tokens...");
      const tokens = await api.listTokens(
        this.options.apiUrl,
        this.options.apiToken,
        workspaceId,
        includeRevoked,
        limit,
        offset,
      );
      log.success("Tokens fetched successfully.");
      if (tokens.length === 0) {
        log.info("No tokens found.");
        return;
      }
      this.display(tokens);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while fetching tokens.");
      }
    }
  }

  public async get(id: string) {
    try {
      log.info(`Fetching token "${id}"...`);
      const token = await api.getToken(
        this.options.apiUrl,
        this.options.apiToken,
        id,
      );
      log.success(`Token "${id}" fetched successfully.`);
      this.display([token]);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while fetching the token.");
      }
    }
  }

  public async update(id: string, description?: string) {
    try {
      log.info(`Updating token "${id}"...`);
      const updatedToken = await api.updateToken(
        this.options.apiUrl,
        this.options.apiToken,
        id,
        { description },
      );
      log.success(`Token "${id}" updated successfully.`);
      this.display([updatedToken]);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while updating the token.");
      }
    }
  }

  public async revoke(id: string) {
    try {
      log.info(`Revoking token "${id}"...`);
      const revokedToken = await api.revokeToken(
        this.options.apiUrl,
        this.options.apiToken,
        id,
      );
      log.success(`Token "${id}" revoked successfully.`);
      this.display([revokedToken]);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while revoking the token.");
      }
    }
  }

  public async unrevoke(id: string) {
    try {
      log.info(`Unrevoking token "${id}"...`);
      const unrevokedToken = await api.unrevokeToken(
        this.options.apiUrl,
        this.options.apiToken,
        id,
      );
      log.success(`Token "${id}" unrevoked successfully.`);
      this.display([unrevokedToken]);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while unrevoking the token.");
      }
    }
  }

  public async delete(id: string) {
    try {
      log.info(`Deleting token "${id}"...`);
      await api.deleteToken(this.options.apiUrl, this.options.apiToken, id);
      log.success(`Token "${id}" deleted successfully.`);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred while deleting the token.");
      }
    }
  }

  private display(tokens: Token[]) {
    const tableData = tokens.map((t) => ({
      ID: t.id,
      Workspace: t.workspaceId,
      Description: t.description || "N/A",
      Revoked: t.isRevoked ? chalk.yellow("Yes") : "No",
      Created: new Date(t.createdAt).toLocaleString(),
      Expires: t.expiresAt ? new Date(t.expiresAt).toLocaleString() : "Never",
    }));
    console.table(tableData);
  }
}
