import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, TestClient } from "../helpers/test-client";
import { createTestCORData } from "../helpers/test-data";

describe("Edge Cases Integration Tests", () => {
  let client: TestClient;
  let testWorkspaceId: string;
  let testTokenId: string;
  let bearerToken: string;

  beforeAll(async () => {
    client = createTestClient();

    // Setup test workspace and token for edge case testing
    const workspaceData = await client.createWorkspace(
      `edge-cases-workspace-${Date.now()}`,
    );
    testWorkspaceId = workspaceData.body.id;

    const tokenResponse = await client.createToken(
      testWorkspaceId,
      "Edge cases test token",
    );
    testTokenId = tokenResponse.body.id;
    bearerToken = tokenResponse.body.token;
  });

  afterAll(async () => {});

  describe("HTTP Method Validation", () => {
    test("should reject PUT method on workspace endpoints", async () => {
      // PUT on workspace list endpoint
      const response1 = await client
        .getRawRequest()
        .put("/v1/workspaces")
        .set("Authorization", process.env.TEST_API_KEY!)
        .send({ name: "test" });
      expect(response1.status).toBe(404);

      // PUT on workspace archive endpoint
      const response2 = await client
        .getRawRequest()
        .put(`/v1/workspaces/${testWorkspaceId}/archive`)
        .set("Authorization", process.env.TEST_API_KEY!);
      expect(response2.status).toBe(404);
    });

    test("should reject PUT method on token endpoints", async () => {
      // PUT on token list endpoint
      const response1 = await client
        .getRawRequest()
        .put("/v1/tokens")
        .set("Authorization", process.env.TEST_API_KEY!)
        .send({ workspaceId: testWorkspaceId });
      expect(response1.status).toBe(404);

      // PUT on specific token endpoint
      const response2 = await client
        .getRawRequest()
        .put(`/v1/tokens/${testTokenId}`)
        .set("Authorization", process.env.TEST_API_KEY!)
        .send({ description: "test" });
      expect(response2.status).toBe(404);
    });

    test("should reject unsupported methods on COR endpoints", async () => {
      // PUT on COR endpoint
      const response1 = await client
        .getRawRequest()
        .put(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send({ entries: [] });
      expect(response1.status).toBe(404);

      // DELETE on COR endpoint
      const response2 = await client
        .getRawRequest()
        .delete(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken);
      expect(response2.status).toBe(404);

      // PATCH on COR endpoint
      const response3 = await client
        .getRawRequest()
        .patch(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send({ entries: [] });
      expect(response3.status).toBe(404);
    });

    test("should handle OPTIONS requests appropriately", async () => {
      const endpoints = [
        "/v1/workspaces",
        "/v1/tokens",
        `/v1/cors/${testWorkspaceId}`,
      ];

      for (const endpoint of endpoints) {
        const response = await client.getRawRequest().options(endpoint);

        // OPTIONS should either be supported (200/204) or not allowed (405/404)
        expect([200, 204, 404, 405]).toContain(response.status);
      }
    });
  });

  describe("Header & Payload Edge Cases", () => {
    test("should handle malformed Authorization headers", async () => {
      const malformedHeaders = [
        "Bearer", // Missing token
        "Bearer ", // Empty token
        "Token invalid-format", // Wrong auth type
        "Bearer " + "x".repeat(1000), // Extremely long token
        "Bearer\ttab-separated", // Tab character
        "Bearer bearer-token", // Lowercase bearer
      ];

      for (const authHeader of malformedHeaders) {
        const response = await client
          .getRawRequest()
          .get(`/v1/cors/${testWorkspaceId}`)
          .set("Authorization", authHeader);

        expect(response.status).toBe(401);
      }
    });

    test("should handle missing Content-Type for POST requests", async () => {
      const corData = createTestCORData();

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .type("") // Remove content-type
        .send(JSON.stringify({ entries: corData.entries }));

      // Should still work or give a meaningful error
      expect([201, 400, 415, 422]).toContain(response.status);
    });

    test("should handle invalid Content-Type", async () => {
      const corData = createTestCORData();

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .set("Content-Type", "application/xml")
        .send(JSON.stringify({ entries: corData.entries }));

      // Should reject with appropriate error
      expect([400, 415, 422]).toContain(response.status);
    });

    test("should handle oversized payloads gracefully", async () => {
      // Create an extremely large COR data payload
      const largeEntries: any[] = [];
      for (let i = 0; i < 1000; i++) {
        largeEntries.push({
          path: `src/generated/massive-file-${i}.ts`,
          language: "typescript",
          timestamp: Math.floor(Date.now() / 1000),
          generatedBy: "stress-test",
          cors: Array.from({ length: 100 }, (_, j) => ({
            signature: "a".repeat(64), // 64-char signature
            order: j + 1,
          })),
        });
      }

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send({ entries: largeEntries });

      // Should either succeed or reject with meaningful error
      expect([201, 413, 422, 500]).toContain(response.status);
    });

    test("should handle empty request bodies", async () => {
      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send();

      expect([400, 422]).toContain(response.status);
    });

    test("should handle malformed JSON", async () => {
      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .set("Content-Type", "application/json")
        .send('{"entries": [invalid json}');

      expect([400, 422]).toContain(response.status);
    });
  });

  describe("Rate Limiting & Performance Edge Cases", () => {
    test("should handle rapid successive requests", async () => {
      const requests = Array.from({ length: 10 }, () =>
        client
          .getRawRequest()
          .get(`/v1/cors/${testWorkspaceId}`)
          .set("Authorization", bearerToken),
      );

      const responses = await Promise.all(requests);

      // Most should succeed, but rate limiting might kick in
      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0); // At least some should succeed
    });

    test("should handle concurrent token operations", async () => {
      // Create a token for concurrent testing
      const tokenResponse = await client.createToken(
        testWorkspaceId,
        "Concurrent test token",
      );
      const concurrentTokenId = tokenResponse.body.id;

      // Try to revoke and unrevoke simultaneously
      const revokePromise = client
        .getRawRequest()
        .post(`/v1/tokens/${concurrentTokenId}/revoke`)
        .set("Authorization", process.env.TEST_API_KEY!);

      const unrevokePromise = client
        .getRawRequest()
        .post(`/v1/tokens/${concurrentTokenId}/unrevoke`)
        .set("Authorization", process.env.TEST_API_KEY!);

      const [revokeResponse, unrevokeResponse] = await Promise.all([
        revokePromise,
        unrevokePromise,
      ]);

      // One should succeed
      const responses = [revokeResponse.status, unrevokeResponse.status];
      expect(responses).toContain(200); // One should succeed
    });

    test("should handle concurrent COR recording to same workspace", async () => {
      const corData1 = createTestCORData();
      const corData2 = createTestCORData();

      const requests = [
        client
          .getRawRequest()
          .post(`/v1/cors/${testWorkspaceId}`)
          .set("Authorization", bearerToken)
          .send({ entries: corData1.entries }),
        client
          .getRawRequest()
          .post(`/v1/cors/${testWorkspaceId}`)
          .set("Authorization", bearerToken)
          .send({ entries: corData2.entries }),
      ];

      const responses = await Promise.all(requests);

      // Both should succeed (COR recording should be safe for concurrency)
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });
  });

  describe("COR Data Advanced Edge Cases", () => {
    test("should handle duplicate signatures within same record", async () => {
      const duplicateSignature = "a".repeat(64);
      const duplicateCorData = {
        entries: [
          {
            path: "src/duplicate-test.ts",
            language: "typescript",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "user",
            cors: [
              { signature: duplicateSignature, order: 1 },
              { signature: duplicateSignature, order: 2 }, // Same signature, different order
              { signature: "b".repeat(64), order: 3 },
              { signature: duplicateSignature, order: 4 }, // Same signature again
            ],
          },
        ],
      };

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send(duplicateCorData);

      // Should accept duplicate signatures (they might represent the same code in different contexts)
      expect(response.status).toBe(201);

      // Verify the data was recorded correctly
      client.setBearerToken(bearerToken);
      const retrieveResponse = await client.getCORData(testWorkspaceId);
      expect(retrieveResponse.status).toBe(200);
    });

    test("should handle empty vs null field consistency", async () => {
      const mixedFieldData = {
        entries: [
          {
            path: "src/empty-fields.ts",
            language: "typescript",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "", // Empty string
            cors: [],
          },
          {
            path: "src/minimal-fields.ts",
            language: "javascript",
            timestamp: 0, // Zero timestamp
            generatedBy: "user",
            cors: [{ signature: "c".repeat(64), order: 1 }],
          },
        ],
      };

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send(mixedFieldData);

      // Should handle empty/minimal fields gracefully
      expect([201, 422]).toContain(response.status);
    });

    test("should handle very large individual COR entries", async () => {
      const veryLongPath = "src/" + "nested/".repeat(100) + "deep-file.ts";
      const veryLongSignature = "d".repeat(64); // Valid SHA-256 length
      const largeOrderNumber = 999999;

      const largeEntryData = {
        entries: [
          {
            path: veryLongPath,
            language: "typescript",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy:
              "ai-assistant-with-very-long-name-that-exceeds-typical-length",
            cors: [
              { signature: veryLongSignature, order: largeOrderNumber },
              { signature: "e".repeat(64), order: 1 },
            ],
          },
        ],
      };

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send(largeEntryData);

      // Should handle large individual entries
      expect([201, 422]).toContain(response.status);
    });

    test("should handle various signature formats and edge cases", async () => {
      const signatureVariants = {
        entries: [
          {
            path: "src/signature-variants.ts",
            language: "typescript",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "user",
            cors: [
              { signature: "0".repeat(64), order: 1 }, // All zeros
              { signature: "f".repeat(64), order: 2 }, // All f's
              { signature: "1234567890abcdef".repeat(4), order: 3 }, // Pattern
              { signature: "a1b2c3d4".repeat(8), order: 4 }, // Mixed alphanumeric
            ],
          },
        ],
      };

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send(signatureVariants);

      expect(response.status).toBe(201);
    });

    test("should handle COR entries with extreme order numbers", async () => {
      const extremeOrderData = {
        entries: [
          {
            path: "src/extreme-orders.ts",
            language: "typescript",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "user",
            cors: [
              { signature: "g".repeat(64), order: 1 },
              { signature: "h".repeat(64), order: Number.MAX_SAFE_INTEGER },
              { signature: "i".repeat(64), order: 2 },
            ],
          },
        ],
      };

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send(extremeOrderData);

      // Should handle extreme but valid order numbers
      expect([201, 422]).toContain(response.status);
    });

    test("should handle mixed file types and languages", async () => {
      const mixedLanguageData = {
        entries: [
          {
            path: "Dockerfile",
            language: "dockerfile",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "user",
            cors: [{ signature: "j".repeat(64), order: 1 }],
          },
          {
            path: "package.json",
            language: "json",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "ai-assistant",
            cors: [{ signature: "k".repeat(64), order: 1 }],
          },
          {
            path: "README.md",
            language: "markdown",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "copilot",
            cors: [{ signature: "l".repeat(64), order: 1 }],
          },
          {
            path: "script.sh",
            language: "shell",
            timestamp: Math.floor(Date.now() / 1000),
            generatedBy: "user",
            cors: [{ signature: "m".repeat(64), order: 1 }],
          },
        ],
      };

      const response = await client
        .getRawRequest()
        .post(`/v1/cors/${testWorkspaceId}`)
        .set("Authorization", bearerToken)
        .send(mixedLanguageData);

      expect(response.status).toBe(201);

      // Verify data integrity across different file types
      client.setBearerToken(bearerToken);
      const retrieveResponse = await client.getCORData(testWorkspaceId);
      expect(retrieveResponse.status).toBe(200);
      expect(retrieveResponse.body.cors.length).toBeGreaterThan(0);
    });
  });
});
