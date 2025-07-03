import { Command } from "@commander-js/extra-typings";
import { TokenService } from "../../services/token.service";
import {
  apiKeyOption,
  apiUrlOption,
  includeRevokedOption,
  limitOption,
  offsetOption,
  workspaceIdOption,
} from "../../options";

export const listCommand = new Command("list")
  .description("List all tokens")
  .addOption(apiUrlOption(true))
  .addOption(apiKeyOption(true))
  .addOption(workspaceIdOption(false))
  .addOption(includeRevokedOption(false))
  .addOption(limitOption(false))
  .addOption(offsetOption(false))
  .action(async (options) => {
    const service = new TokenService({
      apiUrl: options.apiUrl,
      apiToken: options.apiKey,
    });
    await service.list(
      options.workspaceId,
      options.includeRevoked,
      options.limit,
      options.offset,
    );
  });
