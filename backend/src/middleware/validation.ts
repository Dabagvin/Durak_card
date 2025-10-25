import { z, ZodError, ZodIssue } from 'zod';

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.issues.map((e: ZodIssue) => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      };
    }
    return {
      success: false,
      errors: [{ message: 'Unknown validation error' }],
    };
  }
}
