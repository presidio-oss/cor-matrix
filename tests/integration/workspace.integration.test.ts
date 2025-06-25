import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, TestClient } from "../helpers/test-client";
import { createTestWorkspace } from "../helpers/test-data";

describe("Workspace API Integration Tests", () => {
  let client: TestClient;
  let testWorkspaceId: string;

  beforeAll(async () => {
    client = createTestClient();
  });

  afterAll(async () => {});

  describe("Workspace Management", () => {
    test("should create a new workspace", async () => {
      const workspaceData = createTestWorkspace();
      const response = await client.createWorkspace(workspaceData.name);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", workspaceData.name);
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body).toHaveProperty("isArchived", false);

      testWorkspaceId = response.body.id;
    });

    test("should retrieve the created workspace", async () => {
      const response = await client.getWorkspace(testWorkspaceId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", testWorkspaceId);
      expect(response.body).toHaveProperty("isArchived", false);
    });

    test("should list workspaces including the created one", async () => {
      const response = await client.listWorkspaces();

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const createdWorkspace = response.body.find(
        (ws: any) => ws.id === testWorkspaceId,
      );
      expect(createdWorkspace).toBeDefined();
    });

    test("should update workspace name", async () => {
      const newName = `updated-${Date.now()}`;
      const response = await client.updateWorkspace(testWorkspaceId, {
        name: newName,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", newName);
      expect(response.body).toHaveProperty("updatedAt");
    });
  });

  describe("Workspace Query Parameters", () => {
    test("should list workspaces with includeArchived parameter", async () => {
      // Create and archive a workspace for testing
      const workspaceData = createTestWorkspace();
      const createResponse = await client.createWorkspace(workspaceData.name);
      const archivedWorkspaceId = createResponse.body.id;
      await client.archiveWorkspace(archivedWorkspaceId);

      // Test excluding archived workspaces (default)
      const excludeArchivedResponse = await client
        .getRawRequest()
        .get("/v1/workspaces?includeArchived=false")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(excludeArchivedResponse.status).toBe(200);
      const excludedWorkspaces = excludeArchivedResponse.body;
      const foundArchived = excludedWorkspaces.find(
        (ws: any) => ws.id === archivedWorkspaceId,
      );
      expect(foundArchived).toBeUndefined();

      // Test including archived workspaces
      const includeArchivedResponse = await client
        .getRawRequest()
        .get("/v1/workspaces?includeArchived=true")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(includeArchivedResponse.status).toBe(200);
      const includedWorkspaces = includeArchivedResponse.body;
      const foundArchivedIncluded = includedWorkspaces.find(
        (ws: any) => ws.id === archivedWorkspaceId,
      );
      expect(foundArchivedIncluded).toBeDefined();
      expect(foundArchivedIncluded.isArchived).toBe(true);
    });

    test("should handle pagination with limit and offset", async () => {
      // Test with limit
      const limitResponse = await client
        .getRawRequest()
        .get("/v1/workspaces?limit=1")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(limitResponse.status).toBe(200);
      expect(Array.isArray(limitResponse.body)).toBe(true);
      expect(limitResponse.body.length).toBeLessThanOrEqual(1);

      // Test with offset
      const offsetResponse = await client
        .getRawRequest()
        .get("/v1/workspaces?offset=1")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(offsetResponse.status).toBe(200);
      expect(Array.isArray(offsetResponse.body)).toBe(true);

      // Test with both limit and offset
      const combinedResponse = await client
        .getRawRequest()
        .get("/v1/workspaces?limit=2&offset=1")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(combinedResponse.status).toBe(200);
      expect(Array.isArray(combinedResponse.body)).toBe(true);
      expect(combinedResponse.body.length).toBeLessThanOrEqual(2);
    });

    test("should handle boundary conditions for pagination", async () => {
      // Test with limit exceeding maximum (should still work, server handles it)
      const highLimitResponse = await client
        .getRawRequest()
        .get("/v1/workspaces?limit=200")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(highLimitResponse.status).toBe(200);
      expect(Array.isArray(highLimitResponse.body)).toBe(true);

      // Test with zero limit
      const zeroLimitResponse = await client
        .getRawRequest()
        .get("/v1/workspaces?limit=0")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(zeroLimitResponse.status).toBe(200);
      expect(Array.isArray(zeroLimitResponse.body)).toBe(true);

      // Test with high offset (should return empty array if no more data)
      const highOffsetResponse = await client
        .getRawRequest()
        .get("/v1/workspaces?offset=1000")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(highOffsetResponse.status).toBe(200);
      expect(Array.isArray(highOffsetResponse.body)).toBe(true);
    });
  });

  describe("Workspace Lifecycle", () => {
    test("should archive workspace", async () => {
      const response = await client.archiveWorkspace(testWorkspaceId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("isArchived", true);
    });

    test("should unarchive workspace", async () => {
      const response = await client
        .getRawRequest()
        .post(`/v1/workspaces/${testWorkspaceId}/unarchive`)
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("isArchived", false);
    });

    test("should delete workspace successfully", async () => {
      // Create a workspace specifically for deletion testing
      const workspaceData = createTestWorkspace();
      const createResponse = await client.createWorkspace(workspaceData.name);
      const workspaceToDelete = createResponse.body.id;

      // Delete the workspace
      const deleteResponse = await client.deleteWorkspace(workspaceToDelete);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty(
        "message",
        "Workspace deleted successfully",
      );

      // Verify workspace is actually deleted
      const getResponse = await client
        .getRawRequest()
        .get(`/v1/workspaces/${workspaceToDelete}`)
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(getResponse.status).toBe(404);
      expect(getResponse.body).toHaveProperty("code", "WORKSPACE_NOT_FOUND");
    });
  });

  describe("Workspace Authentication & Authorization", () => {
    test("should reject requests without API key for workspace operations", async () => {
      const unauthorizedClient = new (
        await import("../helpers/test-client")
      ).TestClient(process.env.TEST_API_URL!, "invalid-api-key");

      await expect(unauthorizedClient.listWorkspaces()).rejects.toThrow();
    });
  });

  describe("Workspace Error Handling", () => {
    test("should handle non-existent workspace requests", async () => {
      const fakeWorkspaceId = "ws:nonexistent";

      const response = await client
        .getRawRequest()
        .get(`/v1/workspaces/${fakeWorkspaceId}`)
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("code", "WORKSPACE_NOT_FOUND");
    });

    test("should handle deletion of non-existent workspace", async () => {
      const fakeWorkspaceId = "ws:nonexistent";

      const response = await client
        .getRawRequest()
        .delete(`/v1/workspaces/${fakeWorkspaceId}`)
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("code", "WORKSPACE_NOT_FOUND");
    });

    test("should handle duplicate workspace creation", async () => {
      const workspaceData = createTestWorkspace();

      await client.createWorkspace(workspaceData.name);

      const response = await client
        .getRawRequest()
        .post("/v1/workspaces")
        .set("Authorization", process.env.TEST_API_KEY!)
        .send({ name: workspaceData.name });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("code", "WORKSPACE_ALREADY_EXISTS");
    });
  });
});
