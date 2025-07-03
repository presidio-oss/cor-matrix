import { Command } from "@commander-js/extra-typings";
import { TokenService } from "../../services/token.service";
import { apiKeyOption, apiUrlOption, idOption } from "../../options";

export const getCommand = new Command("get")
  .description("Get a token by ID")
  .addOption(apiUrlOption(true))
  .addOption(apiKeyOption(true))
  .addOption(idOption(true))
  .action(async (options) => {
    const service = new TokenService({
      apiUrl: options.apiUrl,
      apiToken: options.apiKey,
    });
    await service.get(options.id);
  });
