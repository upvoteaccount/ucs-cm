// Shared Application Errors Primitive
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR", details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: Record<string, unknown>) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", details?: Record<string, unknown>) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied", details?: Record<string, unknown>) {
    super(message, 403, "FORBIDDEN", details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource state conflict", details?: Record<string, unknown>) {
    super(message, 409, "CONFLICT", details);
  }
}
