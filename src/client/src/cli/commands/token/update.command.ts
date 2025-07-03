import { Command } from "@commander-js/extra-typings";
import { TokenService } from "../../services/token.service";
import {
  apiKeyOption,
  apiUrlOption,
  descriptionOption,
  idOption,
} from "../../options";

export const updateCommand = new Command("update")
  .description("Update a token")
  .addOption(apiUrlOption(true))
  .addOption(apiKeyOption(true))
  .addOption(idOption(true))
  .addOption(descriptionOption(true))
  .action(async (options) => {
    const service = new TokenService({
      apiUrl: options.apiUrl,
      apiToken: options.apiKey,
    });
    await service.update(options.id, options.description);
  });
