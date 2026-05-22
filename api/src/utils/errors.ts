/**
 * Typed application error hierarchy.
 *
 * All errors carry a machine-readable `code`, an HTTP `statusCode`, and an
 * optional `fields` map for per-field validation messages.  The centralized
 * `errorHandler` middleware checks `instanceof AppError` to decide whether to
 * surface the error details to the client or treat it as an unexpected 500.
 *
 * Requirements: 19.3, 19.6
 */

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly fields?: Record<string, string[]>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    fields?: Record<string, string[]>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;

    // Restore prototype chain (required when extending built-ins in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 404 — resource not found */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

/** 400 — request body / query param validation failed */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', fields?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400, fields);
  }
}

/** 401 — missing or invalid authentication credentials */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

/** 403 — authenticated but not permitted to perform the action */
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 'FORBIDDEN', 403);
  }
}

/** 409 — state conflict (duplicate resource, limit reached, etc.) */
export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT') {
    super(message, code, 409);
  }
}
