import dotenv from 'dotenv';
import path from 'path';
import { parseEnv, type Env } from './env.schema';

// Load environment variables from project root
// Working directory is server/, so we go up one level to find .env
const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });

const rawEnv = process.env;

/**
 * Trim helper for cleaning environment variable values
 * Removes whitespace and newline characters that can come from Vercel CLI
 */
function trimEnvValues(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const trimmed: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      trimmed[key] = value.trim();
    }
  }
  return trimmed;
}

/**
 * Server Environment Configuration
 * Uses Zod schema for validation per ADR-009 fail-fast philosophy
 */
let parsedEnv: Env;
try {
  // Trim all values before parsing to handle newline issues
  const trimmedEnv = trimEnvValues(rawEnv);
  parsedEnv = parseEnv(trimmedEnv);
} catch (error) {
  // parseEnv already formats the error message nicely
  if (error instanceof Error) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}

/**
 * Exported environment configuration
 * Type-safe and validated at startup
 */
export const env = parsedEnv;

/**
 * Legacy validateEnv function
 *
 * DEPRECATED: Validation now happens automatically via Zod schema
 * This function is kept for backward compatibility but does nothing
 * as all validation occurs during env parsing above.
 *
 * @deprecated Use env.schema.ts for validation rules
 */
export function validateEnv(): void {
  // Validation already completed during env parsing
  // This function exists only for backward compatibility
}
