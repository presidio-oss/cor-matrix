import { Option } from "@commander-js/extra-typings";

export const apiUrlOption = <T extends boolean = false>(mandatory: T) =>
  new Option("-u, --api-url <url>", "API URL")
    .env("COR_MATRIX_BASE_URL")
    .makeOptionMandatory(mandatory);

export const apiKeyOption = <T extends boolean = false>(mandatory: T) =>
  new Option("-k, --api-key <key>", "API key for authentication")
    .env("COR_MATRIX_API_KEY")
    .makeOptionMandatory(mandatory);

export const workspaceIdOption = <T extends boolean = false>(mandatory: T) =>
  new Option("-w, --workspace-id <id>", "Workspace ID")
    .env("COR_MATRIX_WORKSPACE_ID")
    .makeOptionMandatory(mandatory);

export const projectPathOption = <T extends boolean = false>(mandatory: T) =>
  new Option("-p, --project-path <path>", "Path to the project")
    .env("COR_MATRIX_PROJECT_PATH")
    .makeOptionMandatory(mandatory);

export const apiTokenOption = <T extends boolean = false>(mandatory: T) =>
  new Option("-t, --api-token <token>", "API token for authentication")
    .env("COR_MATRIX_TOKEN")
    .makeOptionMandatory(mandatory);

export const limitOption = <T extends boolean = false>(mandatory: T) =>
  new Option("-l, --limit <limit>", "The number of tokens to return")
    .argParser((value) => parseInt(value))
    .makeOptionMandatory(mandatory);

export const offsetOption = <T extends boolean = false>(mandatory: T) =>
  new Option("-o, --offset <offset>", "The number of tokens to skip")
    .argParser((value) => parseInt(value))
    .makeOptionMandatory(mandatory);

export const includeRevokedOption = <T extends boolean = false>(mandatory: T) =>
  new Option("-r, --include-revoked", "Include revoked tokens")
    .argParser((value) => value === "true")
    .makeOptionMandatory(mandatory);

export const descriptionOption = <T extends boolean = false>(mandatory: T) =>
  new Option(
    "-d, --description <description>",
    "A description for the token",
  ).makeOptionMandatory(mandatory);

export const expiresAtOption = <T extends boolean = false>(mandatory: T) =>
  new Option("-e, --expires-at <timestamp>", "A Unix timestamp for expiration")
    .argParser((value) => parseInt(value))
    .makeOptionMandatory(mandatory);

export const idOption = <T extends boolean = false>(mandatory: T) =>
  new Option("-i, --id <id>", "The ID of the token").makeOptionMandatory(
    mandatory,
  );

export const nameOption = <T extends boolean = false>(mandatory: T) =>
  new Option(
    "-n, --name <name>",
    "The name of the workspace",
  ).makeOptionMandatory(mandatory);

export const includeArchivedOption = <T extends boolean = false>(
  mandatory: T,
) =>
  new Option("-a, --include-archived", "Include archived workspaces")
    .argParser((value) => value === "true")
    .makeOptionMandatory(mandatory);
