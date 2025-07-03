import { Command } from "@commander-js/extra-typings";
import { WorkspaceService } from "../../services/workspace.service";
import { apiKeyOption, apiUrlOption, nameOption } from "../../options";

export const createCommand = new Command("create")
  .description("Create a new workspace")
  .addOption(apiUrlOption(true))
  .addOption(apiKeyOption(true))
  .addOption(nameOption(true))
  .action(async (options) => {
    const service = new WorkspaceService({
      apiUrl: options.apiUrl,
      apiToken: options.apiKey,
    });
    await service.create(options.name);
  });
