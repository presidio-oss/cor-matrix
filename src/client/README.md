# CorMatrix (Code Origin Ratio) JS SDK & CLI

A Node.js SDK and CLI to collect, buffer, and report code origin ratios to a remote server.

---

## Installation

Install with your preferred package manager:

```bash
npm install @presidio-dev/cor-matrix
# or
bun add @presidio-dev/cor-matrix
```

---

## SDK Usage (Node.js)

Import and initialize the SDK in your app:

```js
import { CorMatrix } from "@presidio-dev/cor-matrix";

const corMatrix = new CorMatrix({
  appName: "my-app",
  appVersion: "1.0.0",
  baseURL: process.env.COR_MATRIX_BASE_URL,
  token: process.env.COR_MATRIX_TOKEN,
  workspaceId: process.env.COR_MATRIX_WORKSPACE_ID,
});

corMatrix.addCodeOriginRecord({
  code: "console.log('Hello');",
  path: "index.ts",
  language: "typescript",
  timestamp: Date.now(),
});

// Add more code origin records as needed...

// Manually flush (optional)
await corMatrix.flush();
```

### Configuration Options

- `appName` (string, required): Name of your application
- `appVersion` (string, required): Version of your app
- `baseURL` (string, required): API server URL
- `token` (string, required): API authentication token
- `workspaceId` (string, required): Workspace identifier
- `batchSize` (number, optional): Code origin records per batch (default: 20)
- `flushIntervalMs` (number, optional): Auto-flush interval ms (default: 5000)
- `maxQueueSize` (number, optional): Max buffered code origin records (default: 1000)
- `logLevel` ("error"|"warn"|"info"|"debug", optional): Logging (default: "error")
- `maxRetries` (number, optional): Max flush retries (default: 3)

---

## CLI Usage

The CLI provides a `report` command to analyze your codebase and compare it with AI-generated code tracked in your workspace.

### Run with npx (recommended)

```bash
npx @presidio-dev/cor-matrix report --workspace-id <id> --project-path <path> --api-url <url> --api-token <token>
```

### CLI Options

- `--workspace-id` (or env: `COR_MATRIX_WORKSPACE_ID`): Workspace ID
- `--project-path` (or env: `COR_MATRIX_PROJECT_PATH`): Path to your codebase
- `--api-url` (or env: `COR_MATRIX_BASE_URL`): API server URL
- `--api-token` (or env: `COR_MATRIX_TOKEN`): API token

All flags can be set via environment variables for convenience.

#### Example

```bash
export COR_MATRIX_WORKSPACE_ID=abc123
export COR_MATRIX_PROJECT_PATH=~/projects/my-app
export COR_MATRIX_BASE_URL=https://api.cor-matrix.dev
export COR_MATRIX_TOKEN=your_token
npx @presidio-dev/cor-matrix report
```

### Output

The CLI will output a report with the following sections:

```bash
🔍 Fetching code origin ratios from API...
✔ Code origin ratios fetched successfully.
📝 Generating report for code in: /path/to/your/project

 COR-Matrix REPORT
────────────────────────────────────────────────
AI Generated Lines:             263 (100.00%)
AI Generated Retained Lines:     40 (15.21%)
AI Generated Removed/Changed:   223 (84.79%)
────────────────────────────────────────────────
Report generated on: 6/4/2025, 6:41:16 PM
```
