#!/usr/bin/env node

import "dotenv/config";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { treaty } from "@elysiajs/eden";
import type { App } from "../../api";
import { normalizeCode } from "@cor-matrix/utils/code";
import { Signature } from "@cor-matrix/utils/signature";
import fs from "node:fs/promises";
import path from "node:path";
import ignoreWalk from "ignore-walk";
import { isBinaryFile } from "isbinaryfile";
import chalk from "chalk";

export async function listFilesRecursive(dir: string): Promise<string[]> {
  const files = await ignoreWalk({
    path: dir,
    ignoreFiles: [".gitignore"],
    includeEmpty: false,
    follow: false,
  });
  return files.map((f) => path.join(dir, f));
}

function compute(array1: string[], array2: string[]) {
  const set2 = new Set(array2);

  const commonItems = array1.filter((item) => set2.has(item));
  const onlyInArray1Items = array1.filter((item) => !set2.has(item));

  const commonCount = commonItems.length;
  const onlyInArray1Count = onlyInArray1Items.length;

  return {
    commonCount,
    onlyInArray1Count,
    commonItems,
    onlyInArray1Items,
  };
}

async function handleReport({
  workspaceId,
  projectPath,
  apiUrl,
  apiToken,
}: {
  workspaceId: string;
  projectPath: string;
  apiUrl: string;
  apiToken: string;
}) {
  const isDirectory = await fs
    .stat(projectPath)
    .then((stat) => stat.isDirectory())
    .catch(() => false);

  if (!isDirectory) {
    console.error(
      chalk.red.bold("✖ Error: ") +
        chalk.red(
          `Path "${projectPath}" does not exist or is not a directory.`,
        ),
    );
    process.exit(1);
  }

  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  console.log(chalk.cyan("🔍 Fetching code origin ratios from API..."));

  const {
    data: cors,
    error,
    status,
  } = await client.v1
    .cors({
      workspaceId,
    })
    .get();

  if (error || status !== 200) {
    if (status === 401) {
      console.error(
        chalk.red.bold("✖ Error: ") + chalk.red("Invalid API token."),
      );
    } else if (status === 404) {
      console.error(
        chalk.red.bold("✖ Error: ") +
          chalk.red("Please make sure the API URL is correct."),
      );
    } else {
      console.error(
        chalk.red.bold("✖ Error: ") +
          chalk.red(
            `Failed to fetch code origin ratios: ${JSON.stringify(
              error,
              null,
              2,
            )}`,
          ),
      );
    }
    process.exit(1);
  }

  console.log(chalk.green("✔ Code origin ratios fetched successfully."));

  console.log(
    chalk.cyan(`📝 Generating report for code in: ${chalk.bold(projectPath)}`),
  );

  const files = await listFilesRecursive(projectPath);

  const textFiles: string[] = [];

  for (const file of files) {
    try {
      const isBinary = await isBinaryFile(file);
      if (!isBinary) {
        textFiles.push(file);
      }
    } catch (e) {
      continue;
    }
  }

  const hashes: { file: string; hashes: string[] }[] = [];
  for (const file of textFiles) {
    try {
      const fileContent = await fs.readFile(file, "utf-8");
      const fileLineHashes = fileContent
        .split("\n")
        .map(normalizeCode)
        .map(Signature);
      hashes.push({ file, hashes: fileLineHashes });
    } catch (e) {
      continue;
    }
  }
  const currentSignatures = hashes.map((hash) => hash.hashes).flat();
  const instrumentedSignatures = cors?.cors.map((cor) => cor.signature) || [];

  const { commonCount, onlyInArray1Count } = compute(
    currentSignatures,
    instrumentedSignatures,
  );

  const line = chalk.gray("─".repeat(48));
  console.log("\n" + chalk.bold.bgBlue.white(" cor-matrix REPORT "));
  console.log(line);
  const total = instrumentedSignatures.length;
  const retained = commonCount;
  const removed = Math.max(0, total - retained);
  const retainedPercent =
    total > 0 ? ((retained / total) * 100).toFixed(2) : "0.00";
  const removedPercent =
    total > 0 ? ((removed / total) * 100).toFixed(2) : "0.00";
  console.log(
    `${chalk.yellow("AI Generated Lines:")}             ${chalk.bold(
      total,
    )} (${chalk.bold("100.00%")})`,
  );
  console.log(
    `${chalk.green("AI Generated Retained Lines:")}     ${chalk.bold(
      retained,
    )} (${chalk.bold(`${retainedPercent}%`)})`,
  );
  console.log(
    `${chalk.red("AI Generated Removed/Changed:")}   ${chalk.bold(
      removed,
    )} (${chalk.bold(`${removedPercent}%`)})`,
  );
  console.log(line);
  console.log(
    chalk.gray("Report generated on: ") +
      chalk.white(new Date().toLocaleString()),
  );
  console.log();
}

function getRequiredOption(
  flagValue: string | undefined,
  envVar: string | undefined,
  flagName: string,
  envName: string,
): string {
  if (flagValue) return flagValue;
  if (envVar) return envVar;

  console.error(
    chalk.red.bold("✖ Missing required value for --" + flagName + ".") +
      "\n" +
      chalk.red(
        "Please provide it via --" +
          flagName +
          " or set the environment variable " +
          envName +
          ".",
      ),
  );
  process.exit(1);
}

yargs(hideBin(process.argv))
  .scriptName("cor-matrix")
  .example([
    [
      "$0 report --workspace-id abc123 --project-path /path/to/project --api-url https://example.com --api-token xxxxxxxxxx",
      "Run a report with inline flags",
    ],
  ])
  .command(
    "report",
    "Generate a report\n\n" +
      "Flags can also be set using the following environment variables:\n" +
      "  --workspace-id   → COR_MATRIX_WORKSPACE_ID\n" +
      "  --project-path   → COR_MATRIX_PROJECT_PATH\n" +
      "  --api-url        → COR_MATRIX_BASE_URL\n" +
      "  --api-token      → COR_MATRIX_TOKEN\n",
    (yargs) => {
      return yargs
        .option("workspace-id", {
          type: "string",
          describe: "Workspace ID (or use env: COR_MATRIX_WORKSPACE_ID)",
        })
        .option("project-path", {
          type: "string",
          describe: "Path to the project (or use env: COR_MATRIX_PROJECT_PATH)",
        })
        .option("api-url", {
          type: "string",
          describe: "API URL (or use env: COR_MATRIX_BASE_URL)",
        })
        .option("api-token", {
          type: "string",
          describe: "API token (or use env: COR_MATRIX_TOKEN)",
        });
    },
    (argv) => {
      const workspaceId = getRequiredOption(
        argv["workspace-id"],
        process.env.COR_MATRIX_WORKSPACE_ID,
        "workspace-id",
        "COR_MATRIX_WORKSPACE_ID",
      );
      const projectPath = getRequiredOption(
        argv["project-path"],
        process.env.COR_MATRIX_PROJECT_PATH,
        "project-path",
        "COR_MATRIX_PROJECT_PATH",
      );
      const apiUrl = getRequiredOption(
        argv["api-url"],
        process.env.COR_MATRIX_BASE_URL,
        "api-url",
        "COR_MATRIX_BASE_URL",
      );
      const apiToken = getRequiredOption(
        argv["api-token"],
        process.env.COR_MATRIX_TOKEN,
        "api-token",
        "COR_MATRIX_TOKEN",
      );

      const resolvedProjectPath = path.resolve(projectPath);
      handleReport({
        workspaceId,
        projectPath: resolvedProjectPath,
        apiUrl,
        apiToken,
      });
    },
  )
  .demandCommand(1, "You need to specify a command")
  .help()
  .strict()
  .parse();
