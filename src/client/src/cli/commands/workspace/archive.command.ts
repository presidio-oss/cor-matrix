import { Command } from "@commander-js/extra-typings";
import { WorkspaceService } from "../../services/workspace.service";
import { apiKeyOption, apiUrlOption, workspaceIdOption } from "../../options";

export const archiveCommand = new Command("archive")
  .description("Archive a workspace")
  .addOption(apiUrlOption(true))
  .addOption(apiKeyOption(true))
  .addOption(workspaceIdOption(true))
  .action(async (options) => {
    const service = new WorkspaceService({
      apiUrl: options.apiUrl,
      apiToken: options.apiKey,
    });
    await service.archive(options.workspaceId);
  });
