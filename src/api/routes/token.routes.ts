import { auth } from "@cor-matrix/api/middleware/auth.middleware";
import { TokenService } from "@cor-matrix/api/services/token.service";
import { DatabaseService } from "@cor-matrix/db";
import { DI } from "@cor-matrix/di";
import Elysia, { t } from "elysia";

export default new Elysia({
  name: "token",
  prefix: "/tokens",
  tags: ["Token Management"],
  aot: true,
  detail: {
    security: [{ apiKeyAuth: [] }],
    description: "Token Management",
    summary: "Token Management",
  },
})
  .decorate("token", new TokenService(DI.resolve(DatabaseService)))
  .use(auth({ apiKeyAuth: true }))
  .post(
    "/",
    async ({ token, body, jwt, status }) => {
      try {
        const result = await token.create(
          body.workspaceId,
          jwt.sign,
          body.description,
          body.expiresAt,
        );
        return status(201, result);
      } catch (error: any) {
        if (error.code === "WORKSPACE_NOT_FOUND") {
          return status(404, {
            error: error.message,
            code: error.code,
            success: false,
          });
        }
        return status(500, {
          error: error.message,
          code: error.code,
          success: false,
        });
      }
    },
    {
      detail: {
        description: "Create a new token for a workspace",
        summary: "Create Token",
      },
      body: t.Object({
        workspaceId: t.String({
          description: "The ID of the workspace",
          examples: ["ws:01JX2MVNCT2MF6W8R0KVNWDASQ"],
        }),
        description: t.Optional(
          t.String({
            description: "Description of the token",
            examples: ["API access token for production"],
          }),
        ),
        expiresAt: t.Optional(
          t.Union([t.Number(), t.Null()], {
            description: "Token expiration timestamp (null for no expiration)",
            examples: [1678901234000, null],
          }),
        ),
      }),
      response: {
        201: t.Object({
          id: t.String({
            description: "The ID of the token",
            examples: ["tk:01JWGPXJEC17YGK9X60P8RA8AZ"],
          }),
          workspaceId: t.String({
            description: "The ID of the workspace",
            examples: ["ws:01JX2MVNCT2MF6W8R0KVNWDASQ"],
          }),
          token: t.String({
            description: "The generated token",
            examples: [
              "eyJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiJ9",
            ],
          }),
          description: t.Union([t.String(), t.Null()], {
            description: "The description of the token",
            examples: ["API access token for production"],
          }),
          createdAt: t.Number({
            description: "The creation time of the token",
            examples: [1678901234],
          }),
          lastUsedAt: t.Union([t.Number(), t.Null()], {
            description: "The last used time of the token",
            examples: [1678901234],
          }),
          expiresAt: t.Union([t.Number(), t.Null()], {
            description: "The expiration time of the token",
            examples: [1678901234],
          }),
          isRevoked: t.Boolean({
            description: "Whether the token is revoked",
            examples: [false],
          }),
        }),
        401: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["UNAUTHORIZED"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Unauthorized"],
          }),
        }),
        404: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["WORKSPACE_NOT_FOUND"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Workspace not found"],
          }),
        }),
        500: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["INTERNAL_SERVER_ERROR"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Internal server error"],
          }),
        }),
      },
    },
  )
  .get(
    "/",
    async ({ token, query, status }) => {
      try {
        const { workspaceId, includeRevoked, limit, offset } = query;
        const result = await token.list(
          workspaceId,
          includeRevoked,
          limit,
          offset,
        );
        return status(200, result);
      } catch (error: any) {
        return status(500, {
          error: error.message,
          code: error.code,
          success: false,
        });
      }
    },
    {
      detail: {
        description: "List tokens",
        summary: "List Tokens",
      },
      query: t.Object({
        workspaceId: t.Optional(
          t.String({
            description: "Filter tokens by workspace ID",
            examples: ["ws:01JX2MVNCT2MF6W8R0KVNWDASQ"],
          }),
        ),
        includeRevoked: t.Optional(
          t.Boolean({
            description: "Include revoked tokens (true/false)",
            examples: [false],
            default: false,
          }),
        ),
        limit: t.Optional(
          t.Number({
            description: "Number of tokens to return (max 100)",
            examples: [50],
            default: 50,
          }),
        ),
        offset: t.Optional(
          t.Number({
            description: "Number of tokens to skip",
            examples: [0],
            default: 0,
          }),
        ),
      }),
      response: {
        200: t.Array(
          t.Object({
            id: t.String({
              description: "The ID of the token",
              examples: ["tk:01JWGPXJEC17YGK9X60P8RA8AZ"],
            }),
            workspaceId: t.String({
              description: "The ID of the workspace",
              examples: ["ws:01JX2MVNCT2MF6W8R0KVNWDASQ"],
            }),
            token: t.String({
              description: "The generated token",
              examples: [
                "eyJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiJ9",
              ],
            }),
            description: t.Union([t.String(), t.Null()], {
              description: "The description of the token",
              examples: ["API access token for production"],
            }),
            createdAt: t.Number({
              description: "The creation time of the token",
              examples: [1678901234],
            }),
            lastUsedAt: t.Union([t.Number(), t.Null()], {
              description: "The last used time of the token",
              examples: [1678901234],
            }),
            expiresAt: t.Union([t.Number(), t.Null()], {
              description: "The expiration time of the token",
              examples: [1678901234],
            }),
            isRevoked: t.Boolean({
              description: "Whether the token is revoked",
              examples: [false],
            }),
          }),
        ),
        401: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["UNAUTHORIZED"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Unauthorized"],
          }),
        }),
        500: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["INTERNAL_SERVER_ERROR"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Internal server error"],
          }),
        }),
      },
    },
  )
  .get(
    "/:id",
    async ({ token, params, status }) => {
      try {
        const result = await token.getById(params.id);
        return status(200, result);
      } catch (error: any) {
        if (error.code === "TOKEN_NOT_FOUND") {
          return status(404, {
            error: error.message,
            code: error.code,
            success: false,
          });
        }
        return status(500, {
          error: error.message,
          code: error.code,
          success: false,
        });
      }
    },
    {
      detail: {
        description: "Get a token by ID",
        summary: "Get Token",
      },
      params: t.Object({
        id: t.String({
          description: "The ID of the token",
          examples: ["tk:01JWGPXJEC17YGK9X60P8RA8AZ"],
        }),
      }),
      response: {
        200: t.Object({
          id: t.String({
            description: "The ID of the token",
            examples: ["tk:01JWGPXJEC17YGK9X60P8RA8AZ"],
          }),
          workspaceId: t.String({
            description: "The ID of the workspace",
            examples: ["ws:01JX2MVNCT2MF6W8R0KVNWDASQ"],
          }),
          token: t.String({
            description: "The generated token",
            examples: [
              "eyJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiJ9",
            ],
          }),
          description: t.Union([t.String(), t.Null()], {
            description: "The description of the token",
            examples: ["API access token for production"],
          }),
          createdAt: t.Number({
            description: "The creation time of the token",
            examples: [1678901234],
          }),
          lastUsedAt: t.Union([t.Number(), t.Null()], {
            description: "The last used time of the token",
            examples: [1678901234],
          }),
          expiresAt: t.Union([t.Number(), t.Null()], {
            description: "The expiration time of the token",
            examples: [1678901234],
          }),
          isRevoked: t.Boolean({
            description: "Whether the token is revoked",
            examples: [false],
          }),
        }),
        401: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["UNAUTHORIZED"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Unauthorized"],
          }),
        }),
        404: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["TOKEN_NOT_FOUND"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Token not found"],
          }),
        }),
        500: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["INTERNAL_SERVER_ERROR"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Internal server error"],
          }),
        }),
      },
    },
  )
  .patch(
    "/:id",
    async ({ token, params, body, status }) => {
      try {
        const result = await token.update(params.id, body);
        return status(200, result);
      } catch (error: any) {
        if (error.code === "TOKEN_NOT_FOUND") {
          return status(404, {
            error: error.message,
            code: error.code,
            success: false,
          });
        }
        if (error.code === "TOKEN_VALIDATION_ERROR") {
          return status(400, {
            error: error.message,
            code: error.code,
            success: false,
          });
        }
        return status(500, {
          error: error.message,
          code: error.code,
          success: false,
        });
      }
    },
    {
      detail: {
        summary: "Update a token",
        description: "Update a token",
      },
      params: t.Object({
        id: t.String({
          description: "The ID of the token",
          examples: ["tk:01JWGPXJEC17YGK9X60P8RA8AZ"],
        }),
      }),
      body: t.Object({
        description: t.Optional(
          t.String({
            description: "Updated description of the token",
            examples: ["Updated API access token"],
          }),
        ),
        expiresAt: t.Optional(
          t.Union([t.Number(), t.Null()], {
            description:
              "Updated token expiration timestamp (null to remove expiration)",
            examples: [1678901234000, null],
          }),
        ),
      }),
      response: {
        200: t.Object({
          id: t.String({
            description: "The ID of the token",
            examples: ["tk:01JWGPXJEC17YGK9X60P8RA8AZ"],
          }),
          workspaceId: t.String({
            description: "The ID of the workspace",
            examples: ["ws:01JX2MVNCT2MF6W8R0KVNWDASQ"],
          }),
          token: t.String({
            description: "The generated token",
            examples: [
              "eyJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiJ9",
            ],
          }),
          description: t.Union([t.String(), t.Null()], {
            description: "The description of the token",
            examples: ["Updated API access token"],
          }),
          createdAt: t.Number({
            description: "The creation time of the token",
            examples: [1678901234],
          }),
          lastUsedAt: t.Union([t.Number(), t.Null()], {
            description: "The last used time of the token",
            examples: [1678901234],
          }),
          expiresAt: t.Union([t.Number(), t.Null()], {
            description: "The expiration time of the token",
            examples: [1678901234],
          }),
          isRevoked: t.Boolean({
            description: "Whether the token is revoked",
            examples: [false],
          }),
        }),
        400: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["TOKEN_VALIDATION_ERROR"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["No valid fields provided for update"],
          }),
        }),
        401: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["UNAUTHORIZED"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Unauthorized"],
          }),
        }),
        404: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["TOKEN_NOT_FOUND"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Token not found"],
          }),
        }),
        500: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["INTERNAL_SERVER_ERROR"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Internal server error"],
          }),
        }),
      },
    },
  )
  .delete(
    "/:id",
    async ({ token, params, status }) => {
      try {
        await token.delete(params.id);
        return status(200, {
          message: "Token deleted successfully",
        });
      } catch (error: any) {
        if (error.code === "TOKEN_NOT_FOUND") {
          return status(404, {
            error: error.message,
            code: error.code,
            success: false,
          });
        }
        return status(500, {
          error: error.message,
          code: error.code,

          success: false,
        });
      }
    },
    {
      detail: {
        summary: "Delete a token",
        description: "Delete a token",
      },
      params: t.Object({
        id: t.String({
          description: "The ID of the token",
          examples: ["tk:01JWGPXJEC17YGK9X60P8RA8AZ"],
        }),
      }),
      response: {
        200: t.Object({
          message: t.String({
            description: "Success message",
            examples: ["Token deleted successfully"],
          }),
        }),
        401: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["UNAUTHORIZED"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Unauthorized"],
          }),
        }),
        404: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["TOKEN_NOT_FOUND"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Token not found"],
          }),
        }),
        500: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["INTERNAL_SERVER_ERROR"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Internal server error"],
          }),
        }),
      },
    },
  )
  .post(
    "/:id/revoke",
    async ({ token, params, status }) => {
      try {
        const result = await token.revoke(params.id);
        return status(200, result);
      } catch (error: any) {
        if (error.code === "TOKEN_NOT_FOUND") {
          return status(404, {
            error: error.message,
            code: error.code,
            success: false,
          });
        }
        if (error.code === "TOKEN_ALREADY_REVOKED") {
          return status(409, {
            error: error.message,
            code: error.code,
            success: false,
          });
        }
        return status(500, {
          error: error.message,
          code: error.code,
          success: false,
        });
      }
    },
    {
      detail: {
        summary: "Revoke a token",
        description: "Revoke a token",
      },
      params: t.Object({
        id: t.String({
          description: "The ID of the token",
          examples: ["tk:01JWGPXJEC17YGK9X60P8RA8AZ"],
        }),
      }),
      response: {
        200: t.Object({
          id: t.String({
            description: "The ID of the token",
            examples: ["tk:01JWGPXJEC17YGK9X60P8RA8AZ"],
          }),
          workspaceId: t.String({
            description: "The ID of the workspace",
            examples: ["ws:01JX2MVNCT2MF6W8R0KVNWDASQ"],
          }),
          token: t.String({
            description: "The generated token",
            examples: [
              "eyJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiJ9",
            ],
          }),
          description: t.Union([t.String(), t.Null()], {
            description: "The description of the token",
            examples: ["API access token for production"],
          }),
          createdAt: t.Number({
            description: "The creation time of the token",
            examples: [1678901234],
          }),
          lastUsedAt: t.Union([t.Number(), t.Null()], {
            description: "The last used time of the token",
            examples: [1678901234],
          }),
          expiresAt: t.Union([t.Number(), t.Null()], {
            description: "The expiration time of the token",
            examples: [1678901234],
          }),
          isRevoked: t.Boolean({
            description: "Whether the token is revoked",
            examples: [true],
          }),
        }),
        401: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["UNAUTHORIZED"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Unauthorized"],
          }),
        }),
        404: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["TOKEN_NOT_FOUND"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Token not found"],
          }),
        }),
        409: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["TOKEN_ALREADY_REVOKED"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Token is already revoked"],
          }),
        }),
        500: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["INTERNAL_SERVER_ERROR"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Internal server error"],
          }),
        }),
      },
    },
  )
  .post(
    "/:id/unrevoke",
    async ({ token, params, status }) => {
      try {
        const result = await token.unrevoke(params.id);
        return status(200, result);
      } catch (error: any) {
        if (error.code === "TOKEN_NOT_FOUND") {
          return status(404, {
            error: error.message,
            code: error.code,
            success: false,
          });
        }
        if (error.code === "TOKEN_NOT_REVOKED") {
          return status(409, {
            error: error.message,
            code: error.code,
            success: false,
          });
        }
        return status(500, {
          error: error.message,
          code: error.code,
          success: false,
        });
      }
    },
    {
      detail: {
        summary: "Unrevoke a token",
        description: "Unrevoke a token",
      },
      params: t.Object({
        id: t.String({
          description: "The ID of the token",
          examples: ["tk:01JWGPXJEC17YGK9X60P8RA8AZ"],
        }),
      }),
      response: {
        200: t.Object({
          id: t.String({
            description: "The ID of the token",
            examples: ["tk:01JWGPXJEC17YGK9X60P8RA8AZ"],
          }),
          workspaceId: t.String({
            description: "The ID of the workspace",
            examples: ["ws:01JX2MVNCT2MF6W8R0KVNWDASQ"],
          }),
          token: t.String({
            description: "The generated token",
            examples: [
              "eyJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiJ9.eyJhbGciOiJIUzI1NiJ9",
            ],
          }),
          description: t.Union([t.String(), t.Null()], {
            description: "The description of the token",
            examples: ["API access token for production"],
          }),
          createdAt: t.Number({
            description: "The creation time of the token",
            examples: [1678901234],
          }),
          lastUsedAt: t.Union([t.Number(), t.Null()], {
            description: "The last used time of the token",
            examples: [1678901234],
          }),
          expiresAt: t.Union([t.Number(), t.Null()], {
            description: "The expiration time of the token",
            examples: [1678901234],
          }),
          isRevoked: t.Boolean({
            description: "Whether the token is revoked",
            examples: [false],
          }),
        }),
        401: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["UNAUTHORIZED"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Unauthorized"],
          }),
        }),
        404: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["TOKEN_NOT_FOUND"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Token not found"],
          }),
        }),
        409: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["TOKEN_NOT_REVOKED"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Token is not revoked"],
          }),
        }),
        500: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["INTERNAL_SERVER_ERROR"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Internal server error"],
          }),
        }),
      },
    },
  );
