import { Response } from 'express';

/**
 * Pagination metadata included in list responses.
 * Requirement: 19.5
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

/**
 * Sends a successful JSON response conforming to the { data, error, meta } envelope.
 *
 * @param res     - Express Response object
 * @param data    - Payload to include under the `data` key
 * @param meta    - Optional pagination metadata
 * @param status  - HTTP status code (default 200)
 *
 * Requirements: 19.3, 19.5
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  meta?: PaginationMeta,
  status = 200
): void {
  const body: { data: T; error: null; meta?: PaginationMeta } = {
    data,
    error: null,
  };

  if (meta !== undefined) {
    body.meta = meta;
  }

  res.status(status).json(body);
}

/**
 * Sends an error JSON response conforming to the { data, error } envelope.
 *
 * @param res     - Express Response object
 * @param code    - Machine-readable error code (e.g. 'NOT_FOUND', 'VALIDATION_ERROR')
 * @param message - Human-readable error description
 * @param status  - HTTP status code (default 400)
 * @param fields  - Optional per-field validation errors (key → array of messages)
 *
 * Requirements: 19.3, 19.6
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  status = 400,
  fields?: Record<string, string[]>
): void {
  const error: { code: string; message: string; fields?: Record<string, string[]> } = {
    code,
    message,
  };

  if (fields !== undefined) {
    error.fields = fields;
  }

  res.status(status).json({ data: null, error });
}
