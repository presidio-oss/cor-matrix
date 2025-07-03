import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, TestClient } from "../helpers/test-client";
import { createTestWorkspace } from "../helpers/test-data";

describe("Token API Integration Tests", () => {
  let client: TestClient;
  let testWorkspaceId: string;
  let testTokenId: string;

  beforeAll(async () => {
    client = createTestClient();

    const workspaceData = createTestWorkspace();
    const workspaceResponse = await client.createWorkspace(workspaceData.name);
    testWorkspaceId = workspaceResponse.body.id;
  });

  afterAll(async () => {});

  describe("Token Management", () => {
    test("should create a token for the workspace", async () => {
      const description = "Integration test token";
      const response = await client.createToken(testWorkspaceId, description);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("workspaceId", testWorkspaceId);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("description", description);
      expect(response.body).toHaveProperty("isRevoked", false);

      testTokenId = response.body.id;
    });

    test("should retrieve the created token", async () => {
      const response = await client.getToken(testTokenId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", testTokenId);
      expect(response.body).toHaveProperty("workspaceId", testWorkspaceId);
      expect(response.body).toHaveProperty("isRevoked", false);
    });

    test("should list tokens for the workspace", async () => {
      const response = await client.listTokens(testWorkspaceId);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const createdToken = response.body.find(
        (token: any) => token.id === testTokenId,
      );
      expect(createdToken).toBeDefined();
    });
  });

  describe("Token Query Parameters", () => {
    test("should filter tokens by workspace ID", async () => {
      // Create a second workspace with its own token
      const secondWorkspaceData = createTestWorkspace();
      const secondWorkspaceResponse = await client.createWorkspace(
        secondWorkspaceData.name,
      );
      const secondWorkspaceId = secondWorkspaceResponse.body.id;
      await client.createToken(secondWorkspaceId, "Second workspace token");

      // Test filtering by first workspace
      const firstWorkspaceTokens = await client
        .getRawRequest()
        .get(`/v1/tokens?workspaceId=${testWorkspaceId}`)
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(firstWorkspaceTokens.status).toBe(200);
      expect(Array.isArray(firstWorkspaceTokens.body)).toBe(true);
      firstWorkspaceTokens.body.forEach((token: any) => {
        expect(token.workspaceId).toBe(testWorkspaceId);
      });

      // Test filtering by second workspace
      const secondWorkspaceTokens = await client
        .getRawRequest()
        .get(`/v1/tokens?workspaceId=${secondWorkspaceId}`)
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(secondWorkspaceTokens.status).toBe(200);
      expect(Array.isArray(secondWorkspaceTokens.body)).toBe(true);
      secondWorkspaceTokens.body.forEach((token: any) => {
        expect(token.workspaceId).toBe(secondWorkspaceId);
      });
    });

    test("should handle includeRevoked parameter", async () => {
      // Create and revoke a token for testing
      const revokedTokenResponse = await client.createToken(
        testWorkspaceId,
        "Token to revoke for testing",
      );
      const revokedTokenId = revokedTokenResponse.body.id;
      await client.revokeToken(revokedTokenId);

      // Test excluding revoked tokens (default)
      const excludeRevokedResponse = await client
        .getRawRequest()
        .get(`/v1/tokens?workspaceId=${testWorkspaceId}&includeRevoked=false`)
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(excludeRevokedResponse.status).toBe(200);
      const excludedTokens = excludeRevokedResponse.body;
      const foundRevoked = excludedTokens.find(
        (token: any) => token.id === revokedTokenId,
      );
      expect(foundRevoked).toBeUndefined();

      // Test including revoked tokens
      const includeRevokedResponse = await client
        .getRawRequest()
        .get(`/v1/tokens?workspaceId=${testWorkspaceId}&includeRevoked=true`)
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(includeRevokedResponse.status).toBe(200);
      const includedTokens = includeRevokedResponse.body;
      const foundRevokedIncluded = includedTokens.find(
        (token: any) => token.id === revokedTokenId,
      );
      expect(foundRevokedIncluded).toBeDefined();
      expect(foundRevokedIncluded.isRevoked).toBe(true);
    });

    test("should handle pagination with limit and offset", async () => {
      // Test with limit
      const limitResponse = await client
        .getRawRequest()
        .get("/v1/tokens?limit=1")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(limitResponse.status).toBe(200);
      expect(Array.isArray(limitResponse.body)).toBe(true);
      expect(limitResponse.body.length).toBeLessThanOrEqual(1);

      // Test with offset
      const offsetResponse = await client
        .getRawRequest()
        .get("/v1/tokens?offset=1")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(offsetResponse.status).toBe(200);
      expect(Array.isArray(offsetResponse.body)).toBe(true);

      // Test with combined parameters
      const combinedResponse = await client
        .getRawRequest()
        .get(
          `/v1/tokens?workspaceId=${testWorkspaceId}&limit=2&offset=0&includeRevoked=true`,
        )
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(combinedResponse.status).toBe(200);
      expect(Array.isArray(combinedResponse.body)).toBe(true);
      expect(combinedResponse.body.length).toBeLessThanOrEqual(2);
    });

    test("should handle boundary conditions for pagination", async () => {
      // Test with high limit (should still work, server handles it)
      const highLimitResponse = await client
        .getRawRequest()
        .get("/v1/tokens?limit=200")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(highLimitResponse.status).toBe(200);
      expect(Array.isArray(highLimitResponse.body)).toBe(true);

      // Test with zero limit
      const zeroLimitResponse = await client
        .getRawRequest()
        .get("/v1/tokens?limit=0")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(zeroLimitResponse.status).toBe(200);
      expect(Array.isArray(zeroLimitResponse.body)).toBe(true);

      // Test with high offset
      const highOffsetResponse = await client
        .getRawRequest()
        .get("/v1/tokens?offset=1000")
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(highOffsetResponse.status).toBe(200);
      expect(Array.isArray(highOffsetResponse.body)).toBe(true);
    });
  });

  describe("Token Expiration", () => {
    test("should create token with expiration date", async () => {
      const futureTimestamp = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
      const response = await client.createToken(
        testWorkspaceId,
        "Token with expiration",
        futureTimestamp,
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("expiresAt", futureTimestamp);
      expect(response.body).toHaveProperty("isRevoked", false);
    });

    test("should create token without expiration (null)", async () => {
      const response = await client
        .getRawRequest()
        .post("/v1/tokens")
        .set("Authorization", process.env.TEST_API_KEY!)
        .send({
          workspaceId: testWorkspaceId,
          description: "Token without expiration",
          expiresAt: null,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("expiresAt", null);
    });

    test("should update token expiration via PATCH", async () => {
      const tokenResponse = await client.createToken(
        testWorkspaceId,
        "Token for expiration update",
      );
      const tokenId = tokenResponse.body.id;

      // Update to add expiration
      const futureTimestamp = Date.now() + 48 * 60 * 60 * 1000; // 48 hours from now
      const updateResponse = await client
        .getRawRequest()
        .patch(`/v1/tokens/${tokenId}`)
        .set("Authorization", process.env.TEST_API_KEY!)
        .send({ expiresAt: futureTimestamp });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toHaveProperty("expiresAt", futureTimestamp);

      // Update to remove expiration (set to null)
      const removeExpirationResponse = await client
        .getRawRequest()
        .patch(`/v1/tokens/${tokenId}`)
        .set("Authorization", process.env.TEST_API_KEY!)
        .send({ expiresAt: null });

      expect(removeExpirationResponse.status).toBe(200);
      expect(removeExpirationResponse.body).toHaveProperty("expiresAt", null);
    });

    test("should handle expired token creation (edge case)", async () => {
      const pastTimestamp = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
      const response = await client
        .getRawRequest()
        .post("/v1/tokens")
        .set("Authorization", process.env.TEST_API_KEY!)
        .send({
          workspaceId: testWorkspaceId,
          description: "Already expired token",
          expiresAt: pastTimestamp,
        });

      // This should still create the token (server-side expiration logic may vary)
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("expiresAt", pastTimestamp);
    });
  });

  describe("Token Lifecycle", () => {
    test("should revoke token", async () => {
      const response = await client.revokeToken(testTokenId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("isRevoked", true);
    });

    test("should unrevoke token", async () => {
      const response = await client
        .getRawRequest()
        .post(`/v1/tokens/${testTokenId}/unrevoke`)
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("isRevoked", false);
    });

    test("should update token description", async () => {
      const newDescription = "Updated integration test token";
      const response = await client
        .getRawRequest()
        .patch(`/v1/tokens/${testTokenId}`)
        .set("Authorization", process.env.TEST_API_KEY!)
        .send({ description: newDescription });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("description", newDescription);
    });

    test("should delete token", async () => {
      const tokenResponse = await client.createToken(
        testWorkspaceId,
        "Token for deletion",
      );
      const tokenToDelete = tokenResponse.body.id;

      const response = await client.deleteToken(tokenToDelete);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Token deleted successfully",
      );
    });
  });

  describe("Token Authentication & Authorization", () => {
    test("should reject token operations without API key", async () => {
      const unauthorizedClient = new (
        await import("../helpers/test-client")
      ).TestClient(process.env.TEST_API_URL!, "invalid-api-key");

      await expect(unauthorizedClient.listTokens()).rejects.toThrow();
    });
  });

  describe("Token Error Handling", () => {
    test("should handle non-existent token requests", async () => {
      const fakeTokenId = "tk:nonexistent";

      const response = await client
        .getRawRequest()
        .get(`/v1/tokens/${fakeTokenId}`)
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("code", "TOKEN_NOT_FOUND");
    });

    test("should handle token creation for non-existent workspace", async () => {
      const fakeWorkspaceId = "ws:nonexistent";

      const response = await client
        .getRawRequest()
        .post("/v1/tokens")
        .set("Authorization", process.env.TEST_API_KEY!)
        .send({
          workspaceId: fakeWorkspaceId,
          description: "Test token",
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("code", "WORKSPACE_NOT_FOUND");
    });

    test("should handle revoke already revoked token", async () => {
      const tokenResponse = await client.createToken(
        testWorkspaceId,
        "Token for revoke test",
      );
      const tokenId = tokenResponse.body.id;
      await client.revokeToken(tokenId);

      const response = await client
        .getRawRequest()
        .post(`/v1/tokens/${tokenId}/revoke`)
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("code", "TOKEN_ALREADY_REVOKED");
    });

    test("should handle unrevoke non-revoked token", async () => {
      const tokenResponse = await client.createToken(
        testWorkspaceId,
        "Token for unrevoke test",
      );
      const tokenId = tokenResponse.body.id;

      const response = await client
        .getRawRequest()
        .post(`/v1/tokens/${tokenId}/unrevoke`)
        .set("Authorization", process.env.TEST_API_KEY!);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("code", "TOKEN_NOT_REVOKED");
    });

    test("should handle token update validation errors", async () => {
      const response = await client
        .getRawRequest()
        .patch(`/v1/tokens/${testTokenId}`)
        .set("Authorization", process.env.TEST_API_KEY!)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("code", "TOKEN_VALIDATION_ERROR");
    });
  });
});
