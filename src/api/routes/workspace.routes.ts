import { auth } from "@cor-matrix/api/middleware/auth.middleware";
import { WorkspaceService } from "@cor-matrix/api/services/workspace.service";
import { DatabaseService } from "@cor-matrix/db";
import { DI } from "@cor-matrix/di";
import Elysia, { t } from "elysia";

export default new Elysia({
  name: "workspace",
  prefix: "/workspaces",
  tags: ["Workspace Management"],
  aot: true,
  detail: {
    security: [{ apiKeyAuth: [] }],
    description: "Workspace Management",
    summary: "Workspace Management",
  },
})
  .decorate("workspace", new WorkspaceService(DI.resolve(DatabaseService)))
  .use(auth({ apiKeyAuth: true }))
  .post(
    "/",
    async ({ workspace, body, status }) => {
      try {
        const result = await workspace.create(body.name);
        return status(201, result);
      } catch (error: any) {
        if (error.code === "WORKSPACE_ALREADY_EXISTS") {
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
        description: "Create a new workspace",
        summary: "Create Workspace",
      },
      body: t.Object({
        name: t.String({
          description: "The name of the workspace",
          examples: ["My Workspace"],
        }),
      }),
      response: {
        201: t.Object({
          id: t.String({
            description: "The ID of the workspace",
            examples: ["ws:01JWGPXJEC17YGK9X60P8RA8AZ"],
          }),
          name: t.String({
            description: "The name of the workspace",
            examples: ["My Workspace"],
          }),
          createdAt: t.Number({
            description: "The creation time of the workspace",
            examples: [1678901234],
          }),
          updatedAt: t.Union([t.Number(), t.Null()], {
            description: "The last update time of the workspace",
            examples: [1678901234],
          }),
          isArchived: t.Boolean({
            description: "Whether the workspace is archived",
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
        409: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["WORKSPACE_ALREADY_EXISTS"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Workspace already exists"],
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
    async ({ workspace, query, status }) => {
      try {
        const { includeArchived, limit, offset } = query;
        const result = await workspace.list(includeArchived, limit, offset);
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
        description: "List workspaces",
        summary: "List Workspaces",
      },
      query: t.Object({
        includeArchived: t.Optional(
          t.Boolean({
            description: "Include archived workspaces",
            examples: [false],
            default: false,
          }),
        ),
        limit: t.Optional(
          t.Number({
            description: "Number of workspaces to return (max 100)",
            examples: [50],
            default: 50,
          }),
        ),
        offset: t.Optional(
          t.Number({
            description: "Number of workspaces to skip",
            examples: [0],
            default: 0,
          }),
        ),
      }),
      response: {
        200: t.Array(
          t.Object({
            id: t.String({
              description: "The ID of the workspace",
              examples: ["ws:01JWGPXJEC17YGK9X60P8RA8AZ"],
            }),
            name: t.String({
              description: "The name of the workspace",
              examples: ["My Workspace"],
            }),
            createdAt: t.Number({
              description: "The creation time of the workspace",
              examples: [1678901234],
            }),
            updatedAt: t.Union([t.Number(), t.Null()], {
              description: "The last update time of the workspace",
              examples: [1678901234],
            }),
            isArchived: t.Boolean({
              description: "Whether the workspace is archived",
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
    "/:workspaceId",
    async ({ workspace, params: { workspaceId }, status }) => {
      try {
        const result = await workspace.getById(workspaceId);
        return status(200, result);
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
        description: "Get a workspace by ID",
        summary: "Get Workspace",
      },
      params: t.Object({
        workspaceId: t.String({
          description: "The ID of the workspace",
          examples: ["ws:01JWGPXJEC17YGK9X60P8RA8AZ"],
        }),
      }),
      response: {
        200: t.Object({
          id: t.String({
            description: "The ID of the workspace",
            examples: ["ws:01JWGPXJEC17YGK9X60P8RA8AZ"],
          }),
          name: t.String({
            description: "The name of the workspace",
            examples: ["My Workspace"],
          }),
          createdAt: t.Number({
            description: "The creation time of the workspace",
            examples: [1678901234],
          }),
          updatedAt: t.Union([t.Number(), t.Null()], {
            description: "The last update time of the workspace",
            examples: [1678901234],
          }),
          isArchived: t.Boolean({
            description: "Whether the workspace is archived",
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
  .patch(
    "/:workspaceId",
    async ({ workspace, params: { workspaceId }, body, status }) => {
      try {
        const result = await workspace.update(workspaceId, body);
        return status(200, result);
      } catch (error: any) {
        if (error.code === "WORKSPACE_NOT_FOUND") {
          return status(404, {
            error: error.message,
            code: error.code,
            success: false,
          });
        }
        if (error.code === "WORKSPACE_ALREADY_EXISTS") {
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
        summary: "Update a workspace",
        description: "Update a workspace",
      },
      params: t.Object({
        workspaceId: t.String({
          description: "The ID of the workspace",
          examples: ["ws:01JWGPXJEC17YGK9X60P8RA8AZ"],
        }),
      }),
      body: t.Object({
        name: t.Optional(
          t.String({
            description: "Updated name of the workspace",
            examples: ["Updated Workspace Name"],
          }),
        ),
        isArchived: t.Optional(
          t.Boolean({
            description: "Archive status of the workspace",
            examples: [false],
          }),
        ),
      }),
      response: {
        200: t.Object({
          id: t.String({
            description: "The ID of the workspace",
            examples: ["ws:01JWGPXJEC17YGK9X60P8RA8AZ"],
          }),
          name: t.String({
            description: "The name of the workspace",
            examples: ["Updated Workspace Name"],
          }),
          createdAt: t.Number({
            description: "The creation time of the workspace",
            examples: [1678901234],
          }),
          updatedAt: t.Union([t.Number(), t.Null()], {
            description: "The last update time of the workspace",
            examples: [1678901234],
          }),
          isArchived: t.Boolean({
            description: "Whether the workspace is archived",
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
        409: t.Object({
          success: t.Boolean({
            description: "Success status",
            examples: [false],
          }),
          code: t.String({
            description: "Error code",
            examples: ["WORKSPACE_ALREADY_EXISTS"],
          }),
          error: t.String({
            description: "Error message",
            examples: ["Workspace already exists"],
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
    "/:workspaceId",
    async ({ workspace, params: { workspaceId }, status }) => {
      try {
        await workspace.delete(workspaceId);
        return status(200, {
          message: "Workspace deleted successfully",
        });
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
        summary: "Delete a workspace",
        description: "Delete a workspace",
      },
      params: t.Object({
        workspaceId: t.String({
          description: "The ID of the workspace",
          examples: ["ws:01JWGPXJEC17YGK9X60P8RA8AZ"],
        }),
      }),
      response: {
        200: t.Object({
          message: t.String({
            description: "Success message",
            examples: ["Workspace deleted successfully"],
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
  .post(
    "/:workspaceId/archive",
    async ({ workspace, params: { workspaceId }, status }) => {
      try {
        const result = await workspace.archive(workspaceId);
        return status(200, result);
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
        summary: "Archive a workspace",
        description: "Archive a workspace (soft delete)",
      },
      params: t.Object({
        workspaceId: t.String({
          description: "The ID of the workspace",
          examples: ["ws:01JWGPXJEC17YGK9X60P8RA8AZ"],
        }),
      }),
      response: {
        200: t.Object({
          id: t.String({
            description: "The ID of the workspace",
            examples: ["ws:01JWGPXJEC17YGK9X60P8RA8AZ"],
          }),
          name: t.String({
            description: "The name of the workspace",
            examples: ["My Workspace"],
          }),
          createdAt: t.Number({
            description: "The creation time of the workspace",
            examples: [1678901234],
          }),
          updatedAt: t.Union([t.Number(), t.Null()], {
            description: "The last update time of the workspace",
            examples: [1678901234],
          }),
          isArchived: t.Boolean({
            description: "Whether the workspace is archived",
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
  .post(
    "/:workspaceId/unarchive",
    async ({ workspace, params: { workspaceId }, status }) => {
      try {
        const result = await workspace.unarchive(workspaceId);
        return status(200, result);
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
        summary: "Unarchive a workspace",
        description: "Unarchive a previously archived workspace",
      },
      params: t.Object({
        workspaceId: t.String({
          description: "The ID of the workspace",
          examples: ["ws:01JWGPXJEC17YGK9X60P8RA8AZ"],
        }),
      }),
      response: {
        200: t.Object({
          id: t.String({
            description: "The ID of the workspace",
            examples: ["ws:01JWGPXJEC17YGK9X60P8RA8AZ"],
          }),
          name: t.String({
            description: "The name of the workspace",
            examples: ["My Workspace"],
          }),
          createdAt: t.Number({
            description: "The creation time of the workspace",
            examples: [1678901234],
          }),
          updatedAt: t.Union([t.Number(), t.Null()], {
            description: "The last update time of the workspace",
            examples: [1678901234],
          }),
          isArchived: t.Boolean({
            description: "Whether the workspace is archived",
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
  );
