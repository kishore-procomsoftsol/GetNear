import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware factory that validates req.body against a Zod schema.
 * On success, replaces req.body with the parsed (sanitized) data and calls next().
 * On failure, returns 400 with a structured VALIDATION_ERROR envelope.
 *
 * Requirement: 17.5 (input validation), 13.2 (design §13.2)
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fields: Record<string, string[]> = {};

      result.error.errors.forEach((err) => {
        const key = err.path.join('.') || '_root';
        if (!fields[key]) {
          fields[key] = [];
        }
        fields[key].push(err.message);
      });

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields,
        },
      });
      return;
    }

    // Replace body with parsed data (strips unknown keys, coerces types)
    req.body = result.data;
    next();
  };
}
