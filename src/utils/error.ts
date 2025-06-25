type CorAppErrorOptions = {
  message?: string;
  code?: string;
  cause?: unknown;
};

export abstract class CorAppError extends Error {
  public code?: string;
  public override cause?: unknown;

  constructor(defaultMessage: string, options: CorAppErrorOptions = {}) {
    super(options.message ?? defaultMessage);

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;

    this.code = options.code;
    this.cause = options.cause;
  }
}

export class TokenError extends CorAppError {
  constructor(options?: CorAppErrorOptions) {
    super("Token error", {
      ...options,
      code: options?.code ?? "TOKEN_ERROR",
    });
  }
}

export class WorkspaceError extends CorAppError {
  constructor(options?: CorAppErrorOptions) {
    super("Workspace error", {
      ...options,
      code: options?.code ?? "WORKSPACE_ERROR",
    });
  }
}

export class WorkspaceNotFoundError extends CorAppError {
  constructor(options?: CorAppErrorOptions) {
    super("Workspace not found", {
      ...options,
      code: options?.code ?? "WORKSPACE_NOT_FOUND",
    });
  }
}

export class WorkspaceAlreadyExistsError extends CorAppError {
  constructor(options?: CorAppErrorOptions) {
    super("Workspace already exists", {
      ...options,
      code: options?.code ?? "WORKSPACE_ALREADY_EXISTS",
    });
  }
}

export class TokenNotFoundError extends CorAppError {
  constructor(options?: CorAppErrorOptions) {
    super("Token not found", {
      ...options,
      code: options?.code ?? "TOKEN_NOT_FOUND",
    });
  }
}

export class TokenExpiredError extends CorAppError {
  constructor(options?: CorAppErrorOptions) {
    super("Token has expired", {
      ...options,
      code: options?.code ?? "TOKEN_EXPIRED",
    });
  }
}

export class TokenRevokedError extends CorAppError {
  constructor(options?: CorAppErrorOptions) {
    super("Token has been revoked", {
      ...options,
      code: options?.code ?? "TOKEN_REVOKED",
    });
  }
}

export class TokenValidationError extends CorAppError {
  constructor(options?: CorAppErrorOptions) {
    super("Token validation failed", {
      ...options,
      code: options?.code ?? "TOKEN_VALIDATION_ERROR",
    });
  }
}

export class UnauthorizedError extends CorAppError {
  constructor(options?: CorAppErrorOptions) {
    super("Unauthorized", {
      ...options,
      code: options?.code ?? "UNAUTHORIZED",
    });
  }
}
