import { Command } from "@commander-js/extra-typings";
import { WorkspaceService } from "../../services/workspace.service";
import {
  apiKeyOption,
  apiUrlOption,
  includeArchivedOption,
} from "../../options";

export const listCommand = new Command("list")
  .description("List all workspaces")
  .addOption(apiUrlOption(true))
  .addOption(apiKeyOption(true))
  .addOption(includeArchivedOption(false))
  .action(async (options) => {
    const service = new WorkspaceService({
      apiUrl: options.apiUrl,
      apiToken: options.apiKey,
    });
    await service.list(options.includeArchived);
  });
