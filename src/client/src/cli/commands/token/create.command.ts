import { Command } from "@commander-js/extra-typings";
import { TokenService } from "../../services/token.service";
import {
  apiKeyOption,
  apiUrlOption,
  descriptionOption,
  expiresAtOption,
  workspaceIdOption,
} from "../../options";

export const createCommand = new Command("create")
  .description("Create a new token")
  .addOption(apiUrlOption(true))
  .addOption(apiKeyOption(true))
  .addOption(workspaceIdOption(true))
  .addOption(descriptionOption(false))
  .addOption(expiresAtOption(false))
  .action(async (options) => {
    const service = new TokenService({
      apiUrl: options.apiUrl,
      apiToken: options.apiKey,
    });
    await service.create(
      options.workspaceId,
      options.description,
      options.expiresAt,
    );
  });
