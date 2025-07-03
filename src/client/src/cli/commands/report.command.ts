import { Command } from "@commander-js/extra-typings";
import { ReportService } from "../services/report.service";
import {
  apiTokenOption,
  apiUrlOption,
  projectPathOption,
  workspaceIdOption,
} from "../options";

export const reportCommand = new Command("report")
  .description("Generate a report")
  .addOption(apiUrlOption(true))
  .addOption(workspaceIdOption(true))
  .addOption(projectPathOption(true))
  .addOption(apiTokenOption(true))
  .action(async (options) => {
    const service = new ReportService({
      workspaceId: options.workspaceId,
      projectPath: options.projectPath,
      apiUrl: options.apiUrl,
      apiToken: options.apiToken,
    });
    await service.run();
  });
