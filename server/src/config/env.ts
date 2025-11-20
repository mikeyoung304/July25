import dotenv from 'dotenv';
import path from 'path';
import { parseEnv, type Env } from './env.schema';

// Load environment variables from project root
// Working directory is server/, so we go up one level to find .env
const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });

/**
 * Custom error class for environment validation failures
 * Allows tests to catch validation errors without process.exit()
 */
export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnvValidationError);
    }
  }
}

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
 * Parse and validate environment (lazy initialization)
 * This function is called on first access to env, allowing tests to set up environment first
 */
function initializeEnv(): Env {
  try {
    // Trim all values before parsing to handle newline issues
    // Read from process.env fresh each time (important for tests that modify process.env)
    const trimmedEnv = trimEnvValues(process.env);
    return parseEnv(trimmedEnv);
  } catch (error) {
    // parseEnv already formats the error message nicely
    if (error instanceof Error) {
      // Throw EnvValidationError instead of calling process.exit(1)
      // This allows tests to catch the error, while server.ts can handle process.exit
      throw new EnvValidationError(error.message);
    }
    throw error;
  }
}

/**
 * Cached parsed environment
 */
let parsedEnv: Env | null = null;

/**
 * Exported environment configuration
 * Type-safe and validated at startup
 * Uses a getter to allow tests to modify process.env before validation
 */
export const env = new Proxy({} as Env, {
  get(_target, prop: string | symbol) {
    if (!parsedEnv) {
      parsedEnv = initializeEnv();
    }
    return parsedEnv[prop as keyof Env];
  }
});

/**
 * Explicitly trigger environment validation
 *
 * This function forces the lazy initialization of the env object,
 * triggering validation. If validation fails, it will throw an EnvValidationError.
 *
 * This is useful for:
 * 1. Tests that want to explicitly test validation behavior
 * 2. Server startup code that wants to fail fast before initializing services
 */
export function validateEnv(): void {
  // Force initialization by accessing a property
  // This will trigger the Proxy getter and call initializeEnv()
  if (!parsedEnv) {
    parsedEnv = initializeEnv();
  }
}

/**
 * Reset the parsed environment cache (for testing only)
 * This allows tests to modify process.env and re-validate
 */
export function resetEnvCache(): void {
  parsedEnv = null;
}
