#!/usr/bin/env node

import "dotenv/config";
import { Command, Option } from "@commander-js/extra-typings";
import { reportCommand } from "./cli/commands/report.command";
import { workspaceCommand } from "./cli/commands/workspace.command";
import { tokenCommand } from "./cli/commands/token.command";

const program = new Command();

program
  .name("COR-Matrix")
  .version("0.0.3")
  .description("A CLI tool for COR-Matrix")
  .addCommand(reportCommand)
  .addCommand(workspaceCommand)
  .addCommand(tokenCommand);

program.parse(process.argv);
