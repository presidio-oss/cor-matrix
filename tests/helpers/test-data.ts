import { createHash } from "crypto";

export interface TestWorkspace {
  name: string;
}

export interface TestCOREntry {
  path: string;
  language: string;
  timestamp: number;
  generatedBy: string;
  cors: Array<{
    signature: string;
    order: number;
  }>;
}

export interface TestCORData {
  entries: TestCOREntry[];
}

// Generate realistic code signatures
export function generateCodeSignature(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

// Create test workspace data
export function createTestWorkspace(): TestWorkspace {
  return {
    name: `test-workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
}

// Generate realistic COR test data
export function createTestCORData(): TestCORData {
  const timestamp = Math.floor(Date.now() / 1000);

  return {
    entries: [
      {
        path: "src/components/Button.tsx",
        language: "typescript",
        timestamp,
        generatedBy: "user",
        cors: [
          {
            signature: generateCodeSignature('import React from "react";'),
            order: 1,
          },
          {
            signature: generateCodeSignature(
              "interface ButtonProps { onClick: () => void; }",
            ),
            order: 2,
          },
          {
            signature: generateCodeSignature(
              "export const Button: React.FC<ButtonProps> = ({ onClick }) => {",
            ),
            order: 3,
          },
        ],
      },
      {
        path: "src/utils/api.ts",
        language: "typescript",
        timestamp: timestamp + 10,
        generatedBy: "ai-assistant",
        cors: [
          {
            signature: generateCodeSignature(
              "export async function fetchData(url: string) {",
            ),
            order: 1,
          },
          {
            signature: generateCodeSignature(
              "const response = await fetch(url);",
            ),
            order: 2,
          },
          {
            signature: generateCodeSignature("return response.json();"),
            order: 3,
          },
        ],
      },
      {
        path: "scripts/deploy.py",
        language: "python",
        timestamp: timestamp + 20,
        generatedBy: "copilot",
        cors: [
          {
            signature: generateCodeSignature("import subprocess"),
            order: 1,
          },
          {
            signature: generateCodeSignature("def deploy_application():"),
            order: 2,
          },
          {
            signature: generateCodeSignature(
              'subprocess.run(["docker", "build", "-t", "app", "."])',
            ),
            order: 3,
          },
        ],
      },
      {
        path: "src/config/database.js",
        language: "javascript",
        timestamp: timestamp + 30,
        generatedBy: "user",
        cors: [
          {
            signature: generateCodeSignature('const { Pool } = require("pg");'),
            order: 1,
          },
          {
            signature: generateCodeSignature("const pool = new Pool({"),
            order: 2,
          },
          {
            signature: generateCodeSignature("host: process.env.DB_HOST,"),
            order: 3,
          },
          {
            signature: generateCodeSignature("port: process.env.DB_PORT,"),
            order: 4,
          },
        ],
      },
    ],
  };
}

// Create additional test data for edge cases
export function createLargeCORData(): TestCORData {
  const timestamp = Math.floor(Date.now() / 1000);
  const entries: TestCOREntry[] = [];

  // Generate multiple files with many COR entries each
  for (let fileIndex = 0; fileIndex < 5; fileIndex++) {
    const cors: Array<{ signature: string; order: number }> = [];
    for (let corIndex = 0; corIndex < 20; corIndex++) {
      cors.push({
        signature: generateCodeSignature(
          `code-chunk-${fileIndex}-${corIndex}-${Math.random()}`,
        ),
        order: corIndex + 1,
      });
    }

    entries.push({
      path: `src/generated/file-${fileIndex}.ts`,
      language: "typescript",
      timestamp: timestamp + fileIndex,
      generatedBy: fileIndex % 2 === 0 ? "ai-assistant" : "user",
      cors,
    });
  }

  return { entries };
}

// Create invalid test data for error testing
export function createInvalidCORData(): any {
  return {
    entries: [
      {
        // Missing required fields
        path: "invalid/file.ts",
        language: "typescript",
        // timestamp missing
        generatedBy: "user",
        cors: [
          {
            signature: "invalid-signature-format",
            // order missing
          },
        ],
      },
    ],
  };
}
