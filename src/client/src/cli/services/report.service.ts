import fs from "node:fs/promises";
import { listFilesRecursive, excludeBinaryFiles } from "../utils/files";
import { generateHashes } from "../utils/analytics";
import { fetchCors } from "../utils/api";
import { log } from "../utils/ui";
import chalk from "chalk";
import path from "node:path";

interface ReportServiceOptions {
  workspaceId: string;
  projectPath: string;
  apiUrl: string;
  apiToken: string;
}

export class ReportService {
  constructor(private options: ReportServiceOptions) {}

  public async run() {
    try {
      log.info("Starting report generation...");
      const projectPath = await this.getValidatedProjectPath();

      log.info("Fetching code origin signatures...");
      const codeOriginSignatures = await this.fetchCodeOriginSignatures();
      log.success("Remote signatures fetched.");

      log.info(`Analyzing local files in ${projectPath}...`);
      const { localFileSignatures, totalFiles, totalLines } =
        await this.generateLocalFileSignatures(projectPath);
      log.success("Local files analyzed.");

      const reportMetrics = this.computeMetrics(
        localFileSignatures,
        codeOriginSignatures,
        totalFiles,
        totalLines,
      );
      const reportString = this.formatAsText(reportMetrics, projectPath);

      log.message(reportString);
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.message);
      } else {
        log.error("An unknown error occurred.");
      }
    }
  }

  private async getValidatedProjectPath(): Promise<string> {
    const projectPath = path.resolve(this.options.projectPath);
    const isDirectory = await fs
      .stat(projectPath)
      .then((stat) => stat.isDirectory())
      .catch(() => false);

    if (!isDirectory) {
      throw new Error(
        `Path "${projectPath}" does not exist or is not a directory.`,
      );
    }
    return projectPath;
  }

  private async fetchCodeOriginSignatures(): Promise<string[]> {
    const codeOriginData = await fetchCors(
      this.options.apiUrl,
      this.options.apiToken,
      this.options.workspaceId,
    );
    return codeOriginData?.cors.map((cor) => cor.signature) || [];
  }

  private async generateLocalFileSignatures(projectPath: string) {
    const allFiles = await listFilesRecursive(projectPath);
    const textFiles = await excludeBinaryFiles(allFiles);
    const hashes = await generateHashes(textFiles);
    const localFileSignatures = hashes.map((hash) => hash.hashes).flat();

    return {
      localFileSignatures,
      totalFiles: textFiles.length,
      totalLines: localFileSignatures.length,
    };
  }

  private computeMetrics(
    localFileSignatures: string[],
    codeOriginSignatures: string[],
    totalFiles: number,
    totalLines: number,
  ) {
    const uniqueLocalSignatures = new Set(localFileSignatures);
    const uniqueCodeOriginSignatures = new Set(codeOriginSignatures);

    const intersection = new Set(
      [...uniqueCodeOriginSignatures].filter((sig) =>
        uniqueLocalSignatures.has(sig),
      ),
    );

    const total = uniqueCodeOriginSignatures.size;
    const retained = intersection.size;
    const removed = total - retained;

    const aiGeneratedPercent =
      totalLines > 0 ? ((total / totalLines) * 100).toFixed(2) : "0.00";
    const retainedPercent =
      total > 0 ? ((retained / total) * 100).toFixed(2) : "0.00";
    const removedPercent =
      total > 0 ? ((removed / total) * 100).toFixed(2) : "0.00";

    return {
      total,
      retained,
      removed,
      retainedPercent,
      removedPercent,
      totalFiles,
      totalLines,
      aiGeneratedPercent,
    };
  }

  private formatAsText(
    metrics: {
      total: number;
      retained: number;
      removed: number;
      retainedPercent: string;
      removedPercent: string;
      totalFiles: number;
      totalLines: number;
      aiGeneratedPercent: string;
    },
    projectPath: string,
  ): string {
    const currentDate = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const retainedTotalPercent =
      metrics.totalLines > 0
        ? ((metrics.retained / metrics.totalLines) * 100).toFixed(3)
        : "0.000";

    const pad = (label: string, width = 32) => label.padEnd(width);

    const reportParts = [
      "",
      chalk.bold.bgBlueBright(" COR-Matrix Report "),
      chalk.gray("─".repeat(64)),
      chalk.white(pad("Codebase Path:")) + chalk.white(projectPath),
      chalk.white(pad("Report Time:")) + chalk.white(currentDate),
      chalk.white(pad("Total Lines:")) +
        chalk.white(`${metrics.totalLines.toLocaleString()} (100%)`),
      chalk.white(pad("AI-Written Lines:")) +
        chalk.white(
          `${metrics.retained} of ${metrics.totalLines.toLocaleString()} (${retainedTotalPercent}%)`,
        ),
      chalk.gray("─".repeat(64)),
      "",
    ];
    return reportParts.join("\n");
  }
}
