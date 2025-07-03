import { Command } from "@commander-js/extra-typings";
import { WorkspaceService } from "../../services/workspace.service";
import {
  apiKeyOption,
  apiUrlOption,
  nameOption,
  workspaceIdOption,
} from "../../options";

export const updateCommand = new Command("update")
  .description("Update a workspace")
  .addOption(apiUrlOption(true))
  .addOption(apiKeyOption(true))
  .addOption(workspaceIdOption(true))
  .addOption(nameOption(true))
  .action(async (options) => {
    const service = new WorkspaceService({
      apiUrl: options.apiUrl,
      apiToken: options.apiKey,
    });
    await service.update(options.workspaceId, options.name);
  });
