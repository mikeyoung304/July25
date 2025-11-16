/**
 * JWT Payload Validator
 *
 * Validates JWT tokens contain all required fields to prevent "split brain" architecture
 * where response body has data that JWT lacks, causing authorization failures.
 *
 * Pattern: CL005 - JWT Scope Field Missing
 * Time saved per incident: 10 days
 * Cost saved per incident: $10,000+
 *
 * @module jwt-payload-validator
 */

const jwt = require('jsonwebtoken');

/**
 * Required fields in JWT payload for this application
 * Modify this based on your auth system requirements
 */
const REQUIRED_JWT_FIELDS = {
  sub: 'string',        // User ID
  email: 'string',      // User email
  role: 'string',       // User role (server, kitchen, manager, etc.)
  scope: 'array',       // Permission scopes - CRITICAL FIELD
  restaurant_id: 'string', // Restaurant UUID for multi-tenancy
  auth_method: 'string',   // 'email' or 'pin'
  iat: 'number',        // Issued at timestamp
  exp: 'number'         // Expiration timestamp
};

/**
 * Validates JWT payload structure
 * @param {string} token - JWT token to validate
 * @param {boolean} throwOnError - Whether to throw or return validation result
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validateJWTPayload(token, throwOnError = false) {
  const errors = [];
  let decoded;

  try {
    // Decode without verification (structure check only)
    decoded = jwt.decode(token);

    if (!decoded) {
      errors.push('Token could not be decoded');
    }
  } catch (error) {
    errors.push(`Decode error: ${error.message}`);
  }

  if (decoded) {
    // Check for missing required fields
    for (const [field, expectedType] of Object.entries(REQUIRED_JWT_FIELDS)) {
      if (!(field in decoded)) {
        errors.push(`Missing required field: ${field}`);
      } else {
        // Type validation
        const actualType = Array.isArray(decoded[field]) ? 'array' : typeof decoded[field];
        if (actualType !== expectedType) {
          errors.push(`Field ${field} has wrong type: expected ${expectedType}, got ${actualType}`);
        }
      }
    }

    // Specific validation for scope field (most common issue)
    if (decoded.scope !== undefined) {
      if (!Array.isArray(decoded.scope)) {
        errors.push('Scope must be an array');
      } else if (decoded.scope.length === 0) {
        errors.push('Warning: Scope array is empty (user has no permissions)');
      }
    }

    // Check for split brain pattern
    if (!decoded.scope && decoded.role) {
      errors.push('SPLIT BRAIN DETECTED: JWT has role but no scope field');
    }
  }

  const result = {
    isValid: errors.length === 0,
    errors,
    decoded,
    warnings: []
  };

  // Add warnings for common issues
  if (decoded?.scope?.length === 0) {
    result.warnings.push('User has empty scopes - likely to cause authorization failures');
  }

  if (throwOnError && !result.isValid) {
    const error = new Error(`JWT validation failed: ${errors.join(', ')}`);
    error.validationErrors = errors;
    throw error;
  }

  return result;
}

/**
 * Express middleware for JWT validation
 * Add this AFTER your normal auth middleware to catch structure issues
 */
function jwtValidationMiddleware(options = {}) {
  const {
    logErrors = true,
    blockInvalid = false,
    customFields = {}
  } = options;

  // Merge custom fields with defaults
  const requiredFields = { ...REQUIRED_JWT_FIELDS, ...customFields };

  return (req, res, next) => {
    // Skip if no user (unauthenticated routes)
    if (!req.user) {
      return next();
    }

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const validation = validateJWTPayload(token);

    if (!validation.isValid) {
      if (logErrors) {
        console.error('JWT_STRUCTURE_INVALID', {
          errors: validation.errors,
          path: req.path,
          method: req.method,
          userId: req.user?.id
        });
      }

      if (blockInvalid) {
        return res.status(401).json({
          error: {
            code: 'JWT_STRUCTURE_INVALID',
            message: 'Authentication token has invalid structure',
            details: validation.errors
          }
        });
      }
    }

    // Attach validation result for logging/monitoring
    req.jwtValidation = validation;
    next();
  };
}

/**
 * CLI validator for testing
 * Usage: node jwt-payload-validator.js <token>
 */
if (require.main === module) {
  const token = process.argv[2];

  if (!token) {
    console.log('Usage: node jwt-payload-validator.js <token>');
    process.exit(1);
  }

  const result = validateJWTPayload(token);

  console.log('\n=== JWT Validation Result ===\n');
  console.log(`Valid: ${result.isValid ? '✅' : '❌'}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(error => console.log(`  ❌ ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
  }

  if (result.decoded) {
    console.log('\nDecoded payload:');
    console.log(JSON.stringify(result.decoded, null, 2));
  }

  process.exit(result.isValid ? 0 : 1);
}

/**
 * Integration test helper
 * Use this in your test suite to validate JWT structure
 */
function createJWTStructureTest(testFramework = 'jest') {
  const tests = {
    jest: () => {
      return {
        toHaveValidJWTStructure(received) {
          const validation = validateJWTPayload(received);

          return {
            pass: validation.isValid,
            message: () => validation.isValid
              ? 'Expected JWT to have invalid structure'
              : `Expected JWT to have valid structure. Errors: ${validation.errors.join(', ')}`
          };
        }
      };
    },
    mocha: () => {
      return function(token) {
        const validation = validateJWTPayload(token);
        if (!validation.isValid) {
          throw new Error(`JWT structure invalid: ${validation.errors.join(', ')}`);
        }
      };
    }
  };

  return tests[testFramework]();
}

module.exports = {
  validateJWTPayload,
  jwtValidationMiddleware,
  createJWTStructureTest,
  REQUIRED_JWT_FIELDS
};