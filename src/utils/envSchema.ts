import util from "util";
import { z } from "zod";
const SecretSymbol = Symbol("SecretString");

export class SecretString {
  private [SecretSymbol]: string;

  private constructor(secret: string) {
    this[SecretSymbol] = secret;
  }

  static from(secret: string): SecretString {
    return new SecretString(secret);
  }

  unwrap(): string {
    return this[SecretSymbol];
  }

  toString(): string {
    const masked = "*".repeat(
      Math.max(4, Math.min(10, this[SecretSymbol].length)),
    );
    return `[SecretString: ${masked}]`;
  }

  toJSON(): string {
    return this.toString();
  }

  [util.inspect.custom](): string {
    return this.toString();
  }
}

export const SecretStringSchema = z
  .custom<SecretString | string>(
    (val) => {
      return typeof val === "string" || val instanceof SecretString;
    },
    {
      message: "Expected a string or SecretString",
    },
  )
  .transform((val) => {
    if (val instanceof SecretString) {
      return val;
    }
    return SecretString.from(val);
  });

export const EnvSchema = z.object({
  DB_FILE_NAME: z.string().describe("Database file name"),
  API_PORT: z.coerce.number().default(3000).describe("API port"),
  API_KEY: z
    .union([z.string().min(32), SecretStringSchema])
    .transform((val) =>
      val instanceof SecretString ? val : SecretString.from(val),
    )
    .describe("API key used for Admin API authentication"),
  JWT_SECRET: z
    .union([z.string().min(32), SecretStringSchema])
    .transform((val) =>
      val instanceof SecretString ? val : SecretString.from(val),
    )
    .describe("JWT secret key used for token generation"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development")
    .describe("Node environment"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info")
    .describe("Log level"),
});
