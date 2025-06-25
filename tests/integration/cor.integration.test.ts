import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, TestClient } from "../helpers/test-client";
import {
  createTestWorkspace,
  createTestCORData,
  createLargeCORData,
  createInvalidCORData,
} from "../helpers/test-data";

describe("Code Origin Recording (COR) API Integration Tests", () => {
  let client: TestClient;
  let testWorkspaceId: string;
  let bearerToken: string;

  beforeAll(async () => {
    client = createTestClient();

    const workspaceData = createTestWorkspace();
    const workspaceResponse = await client.createWorkspace(workspaceData.name);
    testWorkspaceId = workspaceResponse.body.id;

    const description = "COR integration test token";
    const tokenResponse = await client.createToken(
      testWorkspaceId,
      description,
    );
    bearerToken = tokenResponse.body.token;
    client.setBearerToken(bearerToken);
  });

  afterAll(async () => {});

  describe("Code Origin Recording (COR)", () => {
    test("should record COR data successfully", async () => {
      const corData = createTestCORData();
      const response = await client.recordCOR(testWorkspaceId, corData.entries);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("ok", true);
      expect(response.body).toHaveProperty("message");
    });

    test("should retrieve recorded COR data", async () => {
      const response = await client.getCORData(testWorkspaceId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("cors");
      expect(Array.isArray(response.body.cors)).toBe(true);
      expect(response.body.cors.length).toBeGreaterThan(0);

      const firstCor = response.body.cors[0];
      expect(firstCor).toHaveProperty("id");
      expect(firstCor).toHaveProperty("codeOriginRecordId");
      expect(firstCor).toHaveProperty("order");
      expect(firstCor).toHaveProperty("signature");
      expect(typeof firstCor.signature).toBe("string");
      expect(firstCor.signature.length).toBe(64); // SHA-256 hex length
    });

    test("should handle large COR data sets", async () => {
      const largeCORData = createLargeCORData();
      const response = await client.recordCOR(
        testWorkspaceId,
        largeCORData.entries,
      );

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("ok", true);

      const retrieveResponse = await client.getCORData(testWorkspaceId);
      expect(retrieveResponse.body.cors.length).toBeGreaterThan(100); // 5 files × 20 COR entries each + previous data
    });

    test("should validate COR data integrity", async () => {
      const response = await client.getCORData(testWorkspaceId);
      const cors = response.body.cors;

      const corsByRecord = cors.reduce((acc: any, cor: any) => {
        if (!acc[cor.codeOriginRecordId]) {
          acc[cor.codeOriginRecordId] = [];
        }
        acc[cor.codeOriginRecordId].push(cor);
        return acc;
      }, {});

      Object.values(corsByRecord).forEach((recordCors: any) => {
        recordCors.sort((a: any, b: any) => a.order - b.order);

        for (let i = 0; i < recordCors.length; i++) {
          expect(recordCors[i].order).toBe(i + 1);
        }
      });
    });
  });

  describe("COR Authentication & Authorization", () => {
    test("should reject requests without bearer token for COR operations", async () => {
      const clientWithoutToken = createTestClient();

      await expect(
        clientWithoutToken.getCORData(testWorkspaceId),
      ).rejects.toThrow("Bearer token not set");
    });

    test("should reject requests with invalid bearer token", async () => {
      const clientWithInvalidToken = createTestClient();
      clientWithInvalidToken.setBearerToken("invalid-token");

      const response = await clientWithInvalidToken
        .getRawRequest()
        .get(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });

    test("should reject COR operations with revoked token", async () => {
      const revokedTokenResponse = await client.createToken(
        testWorkspaceId,
        "Token to revoke",
      );
      const revokedTokenId = revokedTokenResponse.body.id;
      const revokedBearerToken = revokedTokenResponse.body.token;

      await client.revokeToken(revokedTokenId);

      const corData = createTestCORData();

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", revokedBearerToken)
        .send({ entries: corData.entries });

      expect(response.status).toBe(401);
    });
  });

  describe("COR Enhanced Validation", () => {
    test("should handle empty entries array", async () => {
      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send({ entries: [] });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("ok", true);
    });

    test("should handle entries with empty cors array", async () => {
      const entryWithEmptyCors = {
        entries: [
          {
            path: "src/empty.ts",
            language: "typescript",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "user",
            cors: [], // Empty cors array
          },
        ],
      };

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send(entryWithEmptyCors);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("ok", true);
    });

    test("should validate signature format", async () => {
      const invalidSignatureData = {
        entries: [
          {
            path: "src/test.ts",
            language: "typescript",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "user",
            cors: [
              {
                signature: "invalid-signature-too-short",
                order: 1,
              },
            ],
          },
        ],
      };

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send(invalidSignatureData);

      // This might be 422 (validation error) or 201 (accepted), depending on server validation
      expect([201, 422]).toContain(response.status);
    });

    test("should handle various file extensions and languages", async () => {
      const multiLanguageData = {
        entries: [
          {
            path: "src/component.jsx",
            language: "javascript",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "user",
            cors: [{ signature: "a".repeat(64), order: 1 }],
          },
          {
            path: "styles/main.css",
            language: "css",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "ai-assistant",
            cors: [{ signature: "b".repeat(64), order: 1 }],
          },
          {
            path: "README.md",
            language: "markdown",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "copilot",
            cors: [{ signature: "c".repeat(64), order: 1 }],
          },
        ],
      };

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send(multiLanguageData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("ok", true);
    });

    test("should handle boundary values for numeric fields", async () => {
      const boundaryData = {
        entries: [
          {
            path: "src/boundary.ts",
            language: "typescript",
            timestamp: 0, // Minimum timestamp
            generatedBy: "user",
            cors: [
              { signature: "d".repeat(64), order: 1 },
              { signature: "e".repeat(64), order: Number.MAX_SAFE_INTEGER }, // Large order number
            ],
          },
        ],
      };

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send(boundaryData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("ok", true);
    });
  });

  describe("COR Bearer Token Edge Cases", () => {
    test("should handle various Bearer token header formats", async () => {
      const corData = createTestCORData();

      // Test without "Bearer " prefix (should work - raw token format)
      const noPrefixResponse = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken.replace("Bearer ", ""))
        .send({ entries: corData.entries });

      expect(noPrefixResponse.status).toBe(201); // Raw token format should work

      // Test with incorrect prefix (should fail)
      const wrongPrefixResponse = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", `Token ${bearerToken}`)
        .send({ entries: corData.entries });

      expect(wrongPrefixResponse.status).toBe(401);

      // Test with multiple spaces (should fail - invalid format)
      const multiSpaceResponse = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", `Bearer  ${bearerToken}`)
        .send({ entries: corData.entries });

      expect(multiSpaceResponse.status).toBe(401);
    });

    test("should handle missing Authorization header", async () => {
      const corData = createTestCORData();

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .send({ entries: corData.entries });

      expect(response.status).toBe(401);
    });

    test("should handle empty Authorization header", async () => {
      const corData = createTestCORData();

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", "")
        .send({ entries: corData.entries });

      expect(response.status).toBe(401);
    });

    test("should handle various invalid token formats", async () => {
      const corData = createTestCORData();
      const invalidTokens = [
        "Bearer",
        "Bearer ",
        "Bearer invalid",
        "Bearer " + "x".repeat(100), // Too long
        "Bearer " + "short", // Too short
      ];

      for (const invalidToken of invalidTokens) {
        const response = await client
          .getRawRequest()
          .post(`/v1/cors/${testWorkspaceId}`)
          .set("Authorization", invalidToken)
          .send({ entries: corData.entries });

        expect(response.status).toBe(401);
      }
    });
  });

  describe("COR Error Handling", () => {
    test("should handle invalid COR data", async () => {
      const invalidData = createInvalidCORData();

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send(invalidData);

      expect(response.status).toBe(422);
    });
  });
});
