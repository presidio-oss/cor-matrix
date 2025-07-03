import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, TestClient } from "../helpers/test-client";
import { createTestCORData } from "../helpers/test-data";

describe("Security Integration Tests", () => {
  let client: TestClient;

  beforeAll(async () => {
    client = createTestClient();
  });

  afterAll(async () => {});

  describe("Cross-Workspace Security Boundaries", () => {
    test("should prevent token from workspace A accessing workspace B's COR data", async () => {
      // Arrange: Setup two isolated workspaces
      const { workspaceA, workspaceB, tokenA, tokenB } =
        await client.setupCrossWorkspaceTest();

      // Add some COR data to workspace B
      client.setBearerToken(tokenB.token);
      const corData = createTestCORData();
      await client.recordCOR(workspaceB.id, corData.entries);

      // Act: Try to access workspace B's COR data using workspace A's token
      client.setBearerToken(tokenA.token);
      const response = await client
        .getRawRequest()
        .get(`/v1/cors/${workspaceB.id}`)
        .set("Authorization", tokenA.token);

      // Assert: Access should be denied
      expect(response.status).toBe(401);
    });

    test("should prevent token from workspace A recording COR data in workspace B", async () => {
      // Arrange: Setup two isolated workspaces
      const { workspaceA, workspaceB, tokenA } =
        await client.setupCrossWorkspaceTest();

      // Act: Try to record COR data in workspace B using workspace A's token
      const corData = createTestCORData();
      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${workspaceB.id}`)
        .set("Authorization", tokenA.token)
        .send({ entries: corData.entries });

      // Assert: Access should be denied
      expect(response.status).toBe(401);
    });

    test("should allow token to access its own workspace COR data", async () => {
      // Arrange: Setup workspace with token
      const { workspaceA, tokenA } = await client.setupCrossWorkspaceTest();

      // Add COR data to workspace A
      client.setBearerToken(tokenA.token);
      const corData = createTestCORData();
      await client.recordCOR(workspaceA.id, corData.entries);

      // Act: Access workspace A's COR data using workspace A's token
      const response = await client.getCORData(workspaceA.id);

      // Assert: Access should be allowed
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("cors");
      expect(Array.isArray(response.body.cors)).toBe(true);
      expect(response.body.cors.length).toBeGreaterThan(0);
    });
  });

  describe("Token Expiration Security", () => {
    test("should reject COR operations with expired token", async () => {
      // Arrange: Create workspace and expired token
      const workspaceData = await client.createWorkspace(
        `test-workspace-${Date.now()}`,
      );
      const workspaceId = workspaceData.body.id;

      const expiredTimestamp = Date.now() - 1000; // 1 second ago
      const expiredTokenResponse = await client.createToken(
        workspaceId,
        "Expired token",
        expiredTimestamp,
      );

      // Act: Try to record COR data with expired token
      const corData = createTestCORData();
      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${workspaceId}`)
        .set("Authorization", expiredTokenResponse.body.token)
        .send({ entries: corData.entries });

      // Assert: Should be rejected due to expiration
      expect(response.status).toBe(401);
    });

    test("should reject COR data retrieval with expired token", async () => {
      // Arrange: Create workspace and expired token
      const workspaceData = await client.createWorkspace(
        `test-workspace-${Date.now()}`,
      );
      const workspaceId = workspaceData.body.id;

      const expiredTimestamp = Date.now() - 1000; // 1 second ago
      const expiredTokenResponse = await client.createToken(
        workspaceId,
        "Expired token",
        expiredTimestamp,
      );

      // Act: Try to get COR data with expired token
      const response = await client
        .getRawRequest()
        .get(`/v1/cors/${workspaceId}`)
        .set("Authorization", expiredTokenResponse.body.token);

      // Assert: Should be rejected due to expiration
      expect(response.status).toBe(401);
    });

    test("should reject revoked token operations", async () => {
      // Arrange: Create and revoke token
      const workspaceData = await client.createWorkspace(
        `test-workspace-${Date.now()}`,
      );
      const workspaceId = workspaceData.body.id;

      const tokenResponse = await client.createToken(
        workspaceId,
        "Token to be revoked",
      );
      const tokenId = tokenResponse.body.id;
      const bearerToken = tokenResponse.body.token;

      await client.revokeToken(tokenId);

      // Act: Try to use revoked token for COR operations
      const corData = createTestCORData();
      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${workspaceId}`)
        .set("Authorization", bearerToken)
        .send({ entries: corData.entries });

      // Assert: Should be rejected
      expect(response.status).toBe(401);
    });
  });

  describe("Data Integrity Across Lifecycle", () => {
    test("should preserve COR data when workspace is archived", async () => {
      // Arrange: Create workspace, token, and COR data
      const workspaceData = await client.createWorkspace(
        `test-workspace-${Date.now()}`,
      );
      const workspaceId = workspaceData.body.id;

      const tokenResponse = await client.createToken(
        workspaceId,
        "Token for archived workspace test",
      );
      const bearerToken = tokenResponse.body.token;

      // Record COR data
      client.setBearerToken(bearerToken);
      const corData = createTestCORData();
      await client.recordCOR(workspaceId, corData.entries);

      // Act: Archive the workspace
      await client.archiveWorkspace(workspaceId);

      // Assert: COR data should still be accessible
      const response = await client.getCORData(workspaceId);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("cors");
      expect(Array.isArray(response.body.cors)).toBe(true);
      expect(response.body.cors.length).toBeGreaterThan(0);
    });

    test("should allow token operations with archived workspace", async () => {
      // Arrange: Create workspace and token
      const workspaceData = await client.createWorkspace(
        `test-workspace-${Date.now()}`,
      );
      const workspaceId = workspaceData.body.id;

      const tokenResponse = await client.createToken(
        workspaceId,
        "Token for archived workspace",
      );
      const tokenId = tokenResponse.body.id;
      const bearerToken = tokenResponse.body.token;

      // Act: Archive the workspace
      await client.archiveWorkspace(workspaceId);

      // Assert: Token should still be functional for COR operations
      client.setBearerToken(bearerToken);
      const corData = createTestCORData();
      const recordResponse = await client.recordCOR(
        workspaceId,
        corData.entries,
      );
      expect(recordResponse.status).toBe(200);

      // Assert: Token management operations should still work
      const updateResponse = await client
        .getRawRequest()
        .patch(`/v1/tokens/${tokenId}`)
        .set("Authorization", process.env.TEST_API_KEY!)
        .send({
          description: "Updated description for archived workspace token",
        });
      expect(updateResponse.status).toBe(200);
    });

    test("should handle workspace deletion gracefully", async () => {
      // Arrange: Create workspace with token and COR data
      const workspaceData = await client.createWorkspace(
        `test-workspace-${Date.now()}`,
      );
      const workspaceId = workspaceData.body.id;

      const tokenResponse = await client.createToken(
        workspaceId,
        "Token for deletion test",
      );
      const tokenId = tokenResponse.body.id;
      const bearerToken = tokenResponse.body.token;

      // Record COR data
      client.setBearerToken(bearerToken);
      const corData = createTestCORData();
      await client.recordCOR(workspaceId, corData.entries);

      // Act: Delete the workspace
      await client.deleteWorkspace(workspaceId);

      // Assert: Workspace should be gone
      const workspaceResponse = await client
        .getRawRequest()
        .get(`/v1/workspaces/${workspaceId}`)
        .set("Authorization", process.env.TEST_API_KEY!);
      expect(workspaceResponse.status).toBe(404);

      // Assert: Token should be gone or inaccessible
      const tokenResponse2 = await client
        .getRawRequest()
        .get(`/v1/tokens/${tokenId}`)
        .set("Authorization", process.env.TEST_API_KEY!);
      expect(tokenResponse2.status).toBe(404);

      // Assert: COR operations should fail gracefully
      const corResponse = await client
        .getRawRequest()
        .get(`/v1/cors/${workspaceId}`)
        .set("Authorization", bearerToken);
      expect([401, 404]).toContain(corResponse.status);
    });

    test("should maintain data integrity during unarchive operations", async () => {
      // Arrange: Create workspace, add data, archive, then unarchive
      const workspaceData = await client.createWorkspace(
        `test-workspace-${Date.now()}`,
      );
      const workspaceId = workspaceData.body.id;

      const tokenResponse = await client.createToken(
        workspaceId,
        "Token for unarchive test",
      );
      const bearerToken = tokenResponse.body.token;

      // Record initial COR data
      client.setBearerToken(bearerToken);
      const initialCorData = createTestCORData();
      await client.recordCOR(workspaceId, initialCorData.entries);

      // Archive workspace
      await client.archiveWorkspace(workspaceId);

      // Act: Unarchive workspace
      const unarchiveResponse = await client
        .getRawRequest()
        .post(`/v1/workspaces/${workspaceId}/unarchive`)
        .set("Authorization", process.env.TEST_API_KEY!);
      expect(unarchiveResponse.status).toBe(200);
      expect(unarchiveResponse.body.isArchived).toBe(false);

      // Assert: All data should still be intact and accessible
      const corResponse = await client.getCORData(workspaceId);
      expect(corResponse.status).toBe(200);
      expect(corResponse.body.cors.length).toBeGreaterThan(0);

      // Assert: Should be able to add new COR data after unarchiving
      const newCorData = createTestCORData();
      const newRecordResponse = await client.recordCOR(
        workspaceId,
        newCorData.entries,
      );
      expect(newRecordResponse.status).toBe(200);
    });
  });
});
