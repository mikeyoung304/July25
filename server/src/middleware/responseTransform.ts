/**
 * Response Transform Utilities
 *
 * ADR-001: Full snake_case convention
 * These functions are now identity functions (no transformation)
 * that exist only for backward compatibility with tests.
 */

/**
 * Transform WebSocket message payloads
 * ADR-001: Returns message as-is (snake_case preserved)
 *
 * @param message - The message to "transform"
 * @returns The message unchanged
 */
export function transformWebSocketMessage<T>(message: T): T {
  // ADR-001: No transformation - snake_case preserved end-to-end
  return message;
}
