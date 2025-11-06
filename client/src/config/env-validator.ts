/**
 * Environment Variable Validator
 *
 * Validates that all required VITE_ environment variables are present.
 * Fails fast on startup with clear error messages if configuration is invalid.
 *
 * This prevents the confusing "blank page" issue that occurs when
 * environment variables are missing or misconfigured.
 */

interface RequiredEnvVars {
  VITE_API_BASE_URL: string;
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_DEFAULT_RESTAURANT_ID: string;
}

interface OptionalEnvVars {
  VITE_ENVIRONMENT?: string;
  VITE_DEMO_PANEL?: string;
}

export type ValidatedEnv = RequiredEnvVars & OptionalEnvVars;

/**
 * Validates and returns environment variables
 * @throws {Error} if required variables are missing
 */
export function validateEnvironment(): ValidatedEnv {
  const missing: string[] = [];
  const invalid: Array<{ key: string; reason: string }> = [];

  // Check required variables
  const requiredVars: Record<string, string | undefined> = {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_DEFAULT_RESTAURANT_ID: import.meta.env.VITE_DEFAULT_RESTAURANT_ID,
  };

  // Collect missing variables
  Object.entries(requiredVars).forEach(([key, value]) => {
    if (!value || value.trim() === '') {
      missing.push(key);
    }
  });

  // Validate API URL format
  const apiUrl = requiredVars.VITE_API_BASE_URL;
  if (apiUrl && !/^https?:\/\/.+/.test(apiUrl)) {
    invalid.push({
      key: 'VITE_API_BASE_URL',
      reason: `Invalid URL format: "${apiUrl}". Must start with http:// or https://`
    });
  }

  // Validate Supabase URL format
  const supabaseUrl = requiredVars.VITE_SUPABASE_URL;
  if (supabaseUrl && !/^https:\/\/.+\.supabase\.co$/.test(supabaseUrl)) {
    invalid.push({
      key: 'VITE_SUPABASE_URL',
      reason: `Invalid Supabase URL: "${supabaseUrl}". Should be https://xxx.supabase.co`
    });
  }

  // Validate restaurant ID format (UUID or slug)
  const restaurantId = requiredVars.VITE_DEFAULT_RESTAURANT_ID;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (restaurantId && !uuidPattern.test(restaurantId) && !slugPattern.test(restaurantId)) {
    invalid.push({
      key: 'VITE_DEFAULT_RESTAURANT_ID',
      reason: `Invalid format: "${restaurantId}". Must be either a UUID (e.g., 11111111-1111-1111-1111-111111111111) or a slug (e.g., grow, my-restaurant)`
    });
  }

  // Build error message if there are issues
  if (missing.length > 0 || invalid.length > 0) {
    const errorParts: string[] = [
      '🚨 Environment Configuration Error\n',
      'The application cannot start due to missing or invalid environment variables.\n'
    ];

    if (missing.length > 0) {
      errorParts.push('\n❌ Missing Required Variables:');
      missing.forEach(key => {
        errorParts.push(`   - ${key}`);
      });
    }

    if (invalid.length > 0) {
      errorParts.push('\n⚠️  Invalid Values:');
      invalid.forEach(({ key, reason }) => {
        errorParts.push(`   - ${key}: ${reason}`);
      });
    }

    errorParts.push('\n📝 How to Fix:');
    errorParts.push('   1. Check that .env file exists in project root');
    errorParts.push('   2. Ensure all variables have VITE_ prefix');
    errorParts.push('   3. Verify no typos in variable names');
    errorParts.push('   4. Restart the development server after changes\n');
    errorParts.push('💡 Expected Format:');
    errorParts.push('   VITE_API_BASE_URL=http://localhost:3001');
    errorParts.push('   VITE_SUPABASE_URL=https://xxx.supabase.co');
    errorParts.push('   VITE_SUPABASE_ANON_KEY=eyJhbGci...');
    errorParts.push('   VITE_DEFAULT_RESTAURANT_ID=grow (or UUID: 11111111-1111-1111-1111-111111111111)');

    const errorMessage = errorParts.join('\n');
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Return validated environment
  return {
    VITE_API_BASE_URL: requiredVars.VITE_API_BASE_URL!,
    VITE_SUPABASE_URL: requiredVars.VITE_SUPABASE_URL!,
    VITE_SUPABASE_ANON_KEY: requiredVars.VITE_SUPABASE_ANON_KEY!,
    VITE_DEFAULT_RESTAURANT_ID: requiredVars.VITE_DEFAULT_RESTAURANT_ID!,
    VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
    VITE_DEMO_PANEL: import.meta.env.VITE_DEMO_PANEL,
  };
}

/**
 * Singleton validated environment
 * Use this throughout the app instead of import.meta.env directly
 */
export const env = validateEnvironment();

/**
 * Helper to check if we're in development mode
 */
export const isDevelopment = () =>
  env.VITE_ENVIRONMENT === 'development' ||
  import.meta.env.DEV;

/**
 * Helper to check if we're in production mode
 */
export const isProduction = () =>
  env.VITE_ENVIRONMENT === 'production' ||
  import.meta.env.PROD;
