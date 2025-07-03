import { treaty } from "@elysiajs/eden";
import type { App } from "../../../../api";

export async function fetchCors(
  apiUrl: string,
  apiToken: string,
  workspaceId: string,
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const {
    data: cors,
    error,
    status,
  } = await client.v1
    .cors({
      workspaceId,
    })
    .get();

  if (error || status !== 200) {
    if (status === 401) {
      throw new Error("Invalid API token.");
    } else if (status === 404) {
      throw new Error("Please make sure the API URL is correct.");
    } else {
      throw new Error(
        `Failed to fetch code origin ratios: ${JSON.stringify(error, null, 2)}`,
      );
    }
  }

  return cors;
}

export async function createWorkspace(
  apiUrl: string,
  apiToken: string,
  name: string,
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1.workspaces.post({ name });

  if (error || status !== 200) {
    if (status === 409) {
      throw new Error(`Workspace "${name}" already exists.`);
    }
    throw new Error(
      `Failed to create workspace: ${JSON.stringify(error, null, 2)}`,
    );
  }
  return data;
}

export async function getWorkspace(
  apiUrl: string,
  apiToken: string,
  id: string,
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1
    .workspaces({ workspaceId: id })
    .get();

  if (error || status !== 200) {
    if (status === 404) {
      throw new Error(`Workspace with ID "${id}" not found.`);
    }
    throw new Error(
      `Failed to get workspace: ${JSON.stringify(error, null, 2)}`,
    );
  }
  return data;
}

export async function updateWorkspace(
  apiUrl: string,
  apiToken: string,
  id: string,
  payload: { name?: string },
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1
    .workspaces({ workspaceId: id })
    .patch(payload);

  if (error || status !== 200) {
    if (status === 404) {
      throw new Error(`Workspace with ID "${id}" not found.`);
    }
    if (status === 409) {
      throw new Error(`Workspace with name "${payload.name}" already exists.`);
    }
    throw new Error(
      `Failed to update workspace: ${JSON.stringify(error, null, 2)}`,
    );
  }
  return data;
}

export async function archiveWorkspace(
  apiUrl: string,
  apiToken: string,
  id: string,
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1
    .workspaces({ workspaceId: id })
    .archive.post({});

  if (error || status !== 200) {
    if (status === 404) {
      throw new Error(`Workspace with ID "${id}" not found.`);
    }
    throw new Error(
      `Failed to archive workspace: ${JSON.stringify(error, null, 2)}`,
    );
  }
  return data;
}

export async function unarchiveWorkspace(
  apiUrl: string,
  apiToken: string,
  id: string,
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1
    .workspaces({ workspaceId: id })
    .unarchive.post({});

  if (error || status !== 200) {
    if (status === 404) {
      throw new Error(`Workspace with ID "${id}" not found.`);
    }
    throw new Error(
      `Failed to unarchive workspace: ${JSON.stringify(error, null, 2)}`,
    );
  }
  return data;
}

export async function deleteWorkspace(
  apiUrl: string,
  apiToken: string,
  id: string,
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1
    .workspaces({ workspaceId: id })
    .delete();

  if (error || status !== 200) {
    if (status === 404) {
      throw new Error(`Workspace with ID "${id}" not found.`);
    }
    throw new Error(
      `Failed to delete workspace: ${JSON.stringify(error, null, 2)}`,
    );
  }
  return data;
}

export async function createToken(
  apiUrl: string,
  apiToken: string,
  workspaceId: string,
  description?: string,
  expiresAt?: number,
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1.tokens.post({
    workspaceId,
    description,
    expiresAt,
  });

  if (error || status !== 200) {
    if (status === 404) {
      throw new Error(`Workspace with ID "${workspaceId}" not found.`);
    }
    throw new Error(
      `Failed to create token: ${JSON.stringify(error, null, 2)}`,
    );
  }
  return data;
}

export async function listTokens(
  apiUrl: string,
  apiToken: string,
  workspaceId?: string,
  includeRevoked?: boolean,
  limit?: number,
  offset?: number,
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1.tokens.get({
    query: { workspaceId, includeRevoked, limit, offset },
  });

  if (error || status !== 200) {
    throw new Error(`Failed to list tokens: ${JSON.stringify(error, null, 2)}`);
  }
  return data;
}

export async function getToken(apiUrl: string, apiToken: string, id: string) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1.tokens({ id }).get();

  if (error || status !== 200) {
    if (status === 404) {
      throw new Error(`Token with ID "${id}" not found.`);
    }
    throw new Error(`Failed to get token: ${JSON.stringify(error, null, 2)}`);
  }
  return data;
}

export async function updateToken(
  apiUrl: string,
  apiToken: string,
  id: string,
  payload: { description?: string },
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1.tokens({ id }).patch(payload);

  if (error || status !== 200) {
    if (status === 404) {
      throw new Error(`Token with ID "${id}" not found.`);
    }
    throw new Error(
      `Failed to update token: ${JSON.stringify(error, null, 2)}`,
    );
  }
  return data;
}

export async function revokeToken(
  apiUrl: string,
  apiToken: string,
  id: string,
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1
    .tokens({ id })
    .revoke.post({});

  if (error || status !== 200) {
    if (status === 404) {
      throw new Error(`Token with ID "${id}" not found.`);
    }
    if (status === 409) {
      throw new Error(`Token with ID "${id}" is already revoked.`);
    }
    throw new Error(
      `Failed to revoke token: ${JSON.stringify(error, null, 2)}`,
    );
  }
  return data;
}

export async function unrevokeToken(
  apiUrl: string,
  apiToken: string,
  id: string,
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1
    .tokens({ id })
    .unrevoke.post({});

  if (error || status !== 200) {
    if (status === 404) {
      throw new Error(`Token with ID "${id}" not found.`);
    }
    if (status === 409) {
      throw new Error(`Token with ID "${id}" is not revoked.`);
    }
    throw new Error(
      `Failed to unrevoke token: ${JSON.stringify(error, null, 2)}`,
    );
  }
  return data;
}

export async function deleteToken(
  apiUrl: string,
  apiToken: string,
  id: string,
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1.tokens({ id }).delete();

  if (error || status !== 200) {
    if (status === 404) {
      throw new Error(`Token with ID "${id}" not found.`);
    }
    throw new Error(
      `Failed to delete token: ${JSON.stringify(error, null, 2)}`,
    );
  }
  return data;
}

export async function listWorkspaces(
  apiUrl: string,
  apiToken: string,
  includeArchived: boolean | undefined,
) {
  const client = treaty<App>(apiUrl, {
    headers: {
      Authorization: `${apiToken}`,
    },
  });

  const { data, error, status } = await client.v1.workspaces.get({
    query: { includeArchived },
  });

  if (error || status !== 200) {
    throw new Error(
      `Failed to list workspaces: ${JSON.stringify(error, null, 2)}`,
    );
  }
  return data;
}
