import { Command } from "@commander-js/extra-typings";
import { createCommand } from "./workspace/create.command";
import { listCommand } from "./workspace/list.command";
import { getCommand } from "./workspace/get.command";
import { updateCommand } from "./workspace/update.command";
import { archiveCommand } from "./workspace/archive.command";
import { unarchiveCommand } from "./workspace/unarchive.command";
import { deleteCommand } from "./workspace/delete.command";

export const workspaceCommand = new Command("workspace")
  .description("Manage workspaces")
  .addCommand(createCommand)
  .addCommand(listCommand)
  .addCommand(getCommand)
  .addCommand(updateCommand)
  .addCommand(archiveCommand)
  .addCommand(unarchiveCommand)
  .addCommand(deleteCommand);
