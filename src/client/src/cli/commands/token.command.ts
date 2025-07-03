import { Command } from "@commander-js/extra-typings";
import { createCommand } from "./token/create.command";
import { listCommand } from "./token/list.command";
import { getCommand } from "./token/get.command";
import { updateCommand } from "./token/update.command";
import { revokeCommand } from "./token/revoke.command";
import { unrevokeCommand } from "./token/unrevoke.command";
import { deleteCommand } from "./token/delete.command";

export const tokenCommand = new Command("token")
  .description("Manage tokens")
  .addCommand(createCommand)
  .addCommand(listCommand)
  .addCommand(getCommand)
  .addCommand(updateCommand)
  .addCommand(revokeCommand)
  .addCommand(unrevokeCommand)
  .addCommand(deleteCommand);
