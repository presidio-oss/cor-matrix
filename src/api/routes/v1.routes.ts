import { Elysia } from "elysia";
import workspace from "@cor-matrix/api/routes/workspace.routes";
import token from "@cor-matrix/api/routes/token.routes";
import cor from "@cor-matrix/api/routes/cor.routes";

export const v1 = new Elysia({
  prefix: "/v1",
  name: "v1",
})
  .use(workspace)
  .use(token)
  .use(cor);
