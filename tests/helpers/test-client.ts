import supertest from "supertest";

export class TestClient {
  private request: supertest.Agent;
  private apiKey: string;
  private bearerToken?: string;

  constructor(baseUrl: string, apiKey: string) {
    this.request = supertest(baseUrl);
    this.apiKey = apiKey;
  }

  // Set bearer token for COR operations
  setBearerToken(token: string) {
    this.bearerToken = token;
  }

  // Health check endpoint
  async healthCheck() {
    return this.request.get("/healthz").expect(200);
  }

  // Workspace operations (API key auth)
  async createWorkspace(name: string) {
    return this.request
      .post("/v1/workspaces")
      .set("Authorization", this.apiKey)
      .send({ name })
      .expect(201);
  }

  async getWorkspace(id: string) {
    return this.request
      .get(`/v1/workspaces/${id}`)
      .set("Authorization", this.apiKey)
      .expect(200);
  }

  async listWorkspaces() {
    return this.request
      .get("/v1/workspaces")
      .set("Authorization", this.apiKey)
      .expect(200);
  }

  async updateWorkspace(
    id: string,
    data: { name?: string; isArchived?: boolean },
  ) {
    return this.request
      .patch(`/v1/workspaces/${id}`)
      .set("Authorization", this.apiKey)
      .send(data)
      .expect(200);
  }

  async deleteWorkspace(id: string) {
    return this.request
      .delete(`/v1/workspaces/${id}`)
      .set("Authorization", this.apiKey)
      .expect(200);
  }

  async archiveWorkspace(id: string) {
    return this.request
      .post(`/v1/workspaces/${id}/archive`)
      .set("Authorization", this.apiKey)
      .expect(200);
  }

  // Token operations (API key auth)
  async createToken(
    workspaceId: string,
    description?: string,
    expiresAt?: number,
  ) {
    const body: any = { workspaceId };
    if (description) body.description = description;
    if (expiresAt) body.expiresAt = expiresAt;

    return this.request
      .post("/v1/tokens")
      .set("Authorization", this.apiKey)
      .send(body)
      .expect(201);
  }

  async getToken(id: string) {
    return this.request
      .get(`/v1/tokens/${id}`)
      .set("Authorization", this.apiKey)
      .expect(200);
  }

  async listTokens(workspaceId?: string) {
    let url = "/v1/tokens";
    if (workspaceId) {
      url += `?workspaceId=${workspaceId}`;
    }

    return this.request.get(url).set("Authorization", this.apiKey).expect(200);
  }

  async revokeToken(id: string) {
    return this.request
      .post(`/v1/tokens/${id}/revoke`)
      .set("Authorization", this.apiKey)
      .expect(200);
  }

  async deleteToken(id: string) {
    return this.request
      .delete(`/v1/tokens/${id}`)
      .set("Authorization", this.apiKey)
      .expect(200);
  }

  // COR operations (Bearer token auth)
  async recordCOR(workspaceId: string, entries: any[]) {
    if (!this.bearerToken) {
      throw new Error("Bearer token not set. Call setBearerToken() first.");
    }

    return this.request
      .post(`/v1/cors/${workspaceId}`)
      .set("Authorization", this.bearerToken)
      .send({ entries })
      .expect(201);
  }

  async getCORData(workspaceId: string) {
    if (!this.bearerToken) {
      throw new Error("Bearer token not set. Call setBearerToken() first.");
    }

    return this.request
      .get(`/v1/cors/${workspaceId}`)
      .set("Authorization", this.bearerToken)
      .expect(200);
  }

  // Error testing helpers
  async expectUnauthorized(requestFn: () => supertest.Test) {
    return requestFn().expect(401);
  }

  async expectNotFound(requestFn: () => supertest.Test) {
    return requestFn().expect(404);
  }

  async expectBadRequest(requestFn: () => supertest.Test) {
    return requestFn().expect(400);
  }

  // Raw request for custom operations
  getRawRequest() {
    return this.request;
  }

  // Helper for cross-workspace security testing
  async setupCrossWorkspaceTest() {
    const workspaceA = await this.createWorkspace(`workspace-a-${Date.now()}`);
    const workspaceB = await this.createWorkspace(`workspace-b-${Date.now()}`);

    const tokenA = await this.createToken(
      workspaceA.body.id,
      "Token for workspace A",
    );
    const tokenB = await this.createToken(
      workspaceB.body.id,
      "Token for workspace B",
    );

    return {
      workspaceA: workspaceA.body,
      workspaceB: workspaceB.body,
      tokenA: tokenA.body,
      tokenB: tokenB.body,
    };
  }
}

// Factory function to create test client
export function createTestClient(): TestClient {
  const baseUrl = process.env.TEST_API_URL;
  const apiKey = process.env.TEST_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("TEST_API_URL and TEST_API_KEY must be set");
  }

  return new TestClient(baseUrl, apiKey);
}
