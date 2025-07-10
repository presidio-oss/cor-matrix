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

interface ReportMetrics {
  aiGeneratedLinesCount: number;
  aiGeneratedLinesRetainedCount: number;
  aiGeneratedLinesRemovedCount: number;
  aiGeneratedLinesPercent: string;
  aiGeneratedLinesRetainedPercent: string;
  aiGeneratedLinesRemovedPercent: string;
  totalFilesCount: number;
  totalLinesCount: number;
  whatNumberIsAiGeneratedLines: number;
  whatPercentIsAiGeneratedLines: string;
  whatNumberIsHumanGeneratedLines: number;
  whatPercentIsHumanGeneratedLines: string;
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
    localCodeLineSignatures: string[],
    remoteCodeLineSignatures: string[],
    totalFilesCount: number,
    totalLinesCount: number,
  ): ReportMetrics {
    const remoteCodeLineSignaturesSet = new Set(remoteCodeLineSignatures);

    const intersection = localCodeLineSignatures.filter((sig) =>
      remoteCodeLineSignaturesSet.has(sig),
    );

    const aiGeneratedLinesCount = remoteCodeLineSignatures.length;
    const aiGeneratedLinesRetainedCount = intersection.length;
    const aiGeneratedLinesRemovedCount =
      aiGeneratedLinesCount - aiGeneratedLinesRetainedCount;

    const aiGeneratedLinesPercent =
      totalLinesCount > 0
        ? ((aiGeneratedLinesCount / totalLinesCount) * 100).toFixed(2)
        : "0.00";

    const aiGeneratedLinesRetainedPercent =
      aiGeneratedLinesCount > 0
        ? (
            (aiGeneratedLinesRetainedCount / aiGeneratedLinesCount) *
            100
          ).toFixed(2)
        : "0.00";

    const aiGeneratedLinesRemovedPercent =
      aiGeneratedLinesCount > 0
        ? (
            (aiGeneratedLinesRemovedCount / aiGeneratedLinesCount) *
            100
          ).toFixed(2)
        : "0.00";

    // What number of lines in current codebase are Human-generated?
    const whatNumberIsHumanGeneratedLines =
      totalLinesCount > 0 ? totalLinesCount - aiGeneratedLinesRetainedCount : 0;

    // What percent of the total number of lines in current codebase are Human-generated?
    const whatPercentIsHumanGeneratedLines =
      totalLinesCount > 0
        ? ((whatNumberIsHumanGeneratedLines / totalLinesCount) * 100).toFixed(3)
        : "0.000";

    // What number of lines in current codebase are AI-generated?
    const whatNumberIsAiGeneratedLines =
      totalLinesCount > 0 ? aiGeneratedLinesRetainedCount : 0;

    // What percent of the total number of lines in current codebase are AI-generated?
    const whatPercentIsAiGeneratedLines =
      totalLinesCount > 0
        ? ((aiGeneratedLinesRetainedCount / totalLinesCount) * 100).toFixed(3)
        : "0.000";

    return {
      aiGeneratedLinesCount,
      aiGeneratedLinesRetainedCount,
      aiGeneratedLinesRemovedCount,
      aiGeneratedLinesPercent,
      aiGeneratedLinesRetainedPercent,
      aiGeneratedLinesRemovedPercent,
      totalFilesCount,
      totalLinesCount,
      whatNumberIsAiGeneratedLines,
      whatPercentIsAiGeneratedLines,
      whatNumberIsHumanGeneratedLines,
      whatPercentIsHumanGeneratedLines,
    };
  }

  private formatAsText(metrics: ReportMetrics, projectPath: string): string {
    const currentDate = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const pad = (label: string, width = 32) => label.padEnd(width);

    const divider = chalk.gray("─".repeat(96));
    const totalLines = metrics.totalLinesCount.toLocaleString();
    const aiLines = metrics.aiGeneratedLinesRetainedCount.toLocaleString();
    const humanLines = metrics.whatNumberIsHumanGeneratedLines.toLocaleString();

    const reportParts = [
      "\n",
      chalk.bold.bgBlueBright(" COR-Matrix Report "),
      divider,
      chalk.white(`${pad("Codebase Path")}${projectPath}`),
      chalk.white(`${pad("Report Time")}${currentDate}`),
      chalk.yellow(pad("Total Lines") + totalLines),
      chalk.blue(
        `${pad("AI Generated Lines")}${aiLines} (${metrics.whatPercentIsAiGeneratedLines}%)`,
      ),
      chalk.green(
        `${pad("Human Written / Modified Lines")}${humanLines} (${metrics.whatPercentIsHumanGeneratedLines}%)`,
      ),
      divider,
      chalk.white.bold(
        `${pad("AI + Human")}${aiLines} + ${humanLines} = ${totalLines} (100%)`,
      ),
      divider,
      "\n",
      chalk.yellow.italic.underline("Interpretation:\n"),
      chalk.gray.italic(
        pad(
          `- This report estimates the proportion of lines originally authored by an AI model vs. a human.\n- "AI-written lines" were completely generated by AI tools.\n- "Human-written lines" include code fully written by developers or AI generated code modified by\n  developers.`,
        ),
      ),
      "\n",
    ];

    return reportParts.join("\n");
  }
}
