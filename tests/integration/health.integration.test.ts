import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, TestClient } from "../helpers/test-client";

describe("Health Check API Integration Tests", () => {
  let client: TestClient;

  beforeAll(async () => {
    client = createTestClient();
  });

  afterAll(async () => {});

  describe("Health Check", () => {
    test("should respond to health check", async () => {
      const response = await client.healthCheck();
      expect(response.status).toBe(200);
    });
  });
});
