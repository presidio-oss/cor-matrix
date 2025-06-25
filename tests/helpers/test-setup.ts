import { beforeAll, afterAll } from "vitest";
import {
  containerRegistry,
  createTestContainer,
} from "./test-container-manager";
import { ulid } from "ulid";

beforeAll(async () => {
  try {
    const containerInfo = await containerRegistry.getContainer(ulid(), () =>
      createTestContainer({ LOG_LEVEL: "debug" }),
    );
    process.env.TEST_API_URL = containerInfo.BASE_URL;
    process.env.TEST_API_KEY = containerInfo.API_KEY.unwrap();
  } catch (error) {
    console.error("Failed to start test container:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    throw error;
  }
}, 120000);

afterAll(async () => {
  try {
    await containerRegistry.stopAllContainers();
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}, 30000);
