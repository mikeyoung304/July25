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

/**
 * Create a safe API error response that doesn't leak internal details.
 * Logs the full error server-side while returning only the generic message to clients.
 *
 * @param error - The caught error (unknown type)
 * @param genericMessage - User-friendly message to return to clients
 * @param logger - Optional logger function (default: console.error for fallback)
 * @returns The generic message safe for API responses
 *
 * @example
 * res.status(500).json({
 *   error: safeApiError(error, 'Failed to load menu', logger.error)
 * });
 */
export function safeApiError(
  error: unknown,
  genericMessage: string,
  logger?: (message: string, context: Record<string, unknown>) => void
): string {
  const errorDetails = {
    internalMessage: getErrorMessage(error),
    stack: getErrorStack(error),
    errorType: error?.constructor?.name
  };

  if (logger) {
    logger(genericMessage, errorDetails);
  }

  return genericMessage;
}
