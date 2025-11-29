/**
 * Input validation and sanitization utilities
 * Includes protection against prompt injection and other security threats
 */

/**
 * Sanitizes text for safe inclusion in AI prompts
 * Removes common prompt injection patterns and limits length
 *
 * @param text - Text to sanitize (e.g., menu item name or description)
 * @returns Sanitized text safe for prompt embedding
 *
 * @example
 * const name = sanitizeForPrompt(menuItem.name);
 * const desc = sanitizeForPrompt(menuItem.description);
 */
export function sanitizeForPrompt(text: string): string {
  if (!text) return '';

  // Remove common prompt injection patterns
  const cleaned = text
    .replace(/IGNORE\s+(ALL\s+)?PREVIOUS\s+INSTRUCTIONS/gi, '')
    .replace(/SYSTEM\s*:/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/\[SYSTEM\]/gi, '')
    .replace(/\[\/SYSTEM\]/gi, '')
    .replace(/<\|.*?\|>/g, '') // Remove special tokens
    .replace(/ASSISTANT\s*:/gi, '')
    .replace(/USER\s*:/gi, '')
    .trim();

  // Limit length to prevent prompt bloat
  return cleaned.substring(0, 500);
}
