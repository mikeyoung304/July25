/**
 * Error Utilities
 * Safely extract information from unknown error types.
 * Replaces 50+ duplicate patterns across the codebase.
 */

/**
 * Safely extract error message from unknown error type.
 * Handles Error instances, strings, and other types.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Safely extract error stack from unknown error type.
 * Returns undefined for non-Error types.
 */
export function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}
