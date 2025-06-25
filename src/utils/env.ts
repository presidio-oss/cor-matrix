import { EnvSchema } from "@cor-matrix/utils/envSchema";
import "dotenv/config";
import { z } from "zod";

export type EnvType = z.infer<typeof EnvSchema>;

const formatValidationError = (error: z.ZodError): void => {
  console.error("❌ Environment Configuration Error\n");
  console.error("The following environment variables are invalid:\n");

  for (const issue of error.issues) {
    const path = issue.path.join(".");
    const envVar = path.toUpperCase();

    console.error(`🔧 ${envVar}`);

    switch (issue.code) {
      case "invalid_type":
        console.error(
          `   ❌ Current: ${typeof process.env[envVar]} (${
            process.env[envVar] || "undefined"
          })`,
        );
        console.error(`   ✅ Expected: ${issue.expected}`);
        break;

      case "too_small":
        const currentValue = process.env[envVar];
        const currentLength = currentValue ? currentValue.length : 0;
        console.error(
          `   ❌ Current: "${currentValue}" (${currentLength} characters)`,
        );
        console.error(`   ✅ Required: At least ${issue.minimum} characters`);

        if (envVar.includes("KEY") || envVar.includes("SECRET")) {
          console.error(
            `   💡 Tip: Generate a secure ${envVar.toLowerCase()} with sufficient length`,
          );
        }
        break;

      case "invalid_enum_value":
        console.error(`   ❌ Current: "${process.env[envVar]}"`);
        console.error(`   ✅ Allowed: ${issue.options.join(", ")}`);
        break;

      default:
        console.error(`   ❌ Error: ${issue.message}`);
        console.error(`   ✅ Current: "${process.env[envVar] || "undefined"}"`);
    }

    const fieldSchema = EnvSchema.shape[envVar as keyof typeof EnvSchema.shape];
    if (fieldSchema && fieldSchema._def && fieldSchema._def.description) {
      console.error(`   📝 Description: ${fieldSchema._def.description}`);
    }

    console.error("");
  }

  console.error(
    "📍 Please check your ENVIRONMENT variables and fix the above issues.",
  );
};

const safeParse = () => {
  const { data, error, success } = EnvSchema.safeParse(process.env);

  if (!success) {
    formatValidationError(error);
    process.exit(1);
  }

  return data;
};

export const env = safeParse();
