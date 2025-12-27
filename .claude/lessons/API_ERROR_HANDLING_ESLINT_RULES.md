# API Error Handling - ESLint Rules & Automation

**Suggested ESLint rules and automation to prevent recurring issues**

---

## Problem: Why We Need Automation

The issues fixed in this session are systematic problems that required manual code review to catch:

1. **Raw error message exposure** - 12+ instances across 3 files
2. **Test endpoints without auth** - 2 major instances
3. **Inconsistent error extraction** - 36+ patterns (old and new mixed)
4. **Dead code fallback patterns** - Multiple unnecessary patterns

Manual code review catches these, but we can do better with automated rules.

---

## Recommended ESLint Rules

### Rule 1: No Direct Error Message Exposure in Responses

**Purpose:** Prevent sending raw `error.message` or `getErrorMessage()` directly to API clients

**Severity:** ERROR

**Implementation approach:**
```javascript
// .eslintrc.json custom rule configuration
{
  "rules": {
    "custom/no-direct-error-exposure": "error"
  }
}
```

**Pattern detection:**
```typescript
// WRONG - should trigger rule
res.json({ error: error.message });
res.status(500).json({ error: getErrorMessage(error) });
res.json({ message: error.message });
response.error = error.message;

// RIGHT - should NOT trigger rule
res.json({ error: safeApiError(error, 'Generic message', logger) });
res.json({ error: 'Hardcoded generic message' });
```

**Implementation details:**
```javascript
// ESLint rule file: rules/no-direct-error-exposure.js

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent raw error messages in API responses',
      category: 'Security',
      recommended: 'error'
    },
    fixable: 'code'
  },
  create(context) {
    return {
      ObjectExpression(node) {
        node.properties.forEach(prop => {
          if (['error', 'message'].includes(prop.key?.name)) {
            const valueType = prop.value?.type;
            const calleeName = prop.value?.callee?.name;

            // Flag getErrorMessage() calls
            if (calleeName === 'getErrorMessage') {
              context.report({
                node: prop.value,
                message: 'Use safeApiError() instead of getErrorMessage() for API responses',
                fix(fixer) {
                  return fixer.replaceText(
                    prop.value,
                    `safeApiError(${prop.value.arguments[0].name}, 'Operation failed', logger)`
                  );
                }
              });
            }

            // Flag direct .message property access
            if (prop.value?.type === 'MemberExpression' &&
                prop.value?.property?.name === 'message') {
              context.report({
                node: prop.value,
                message: 'Never send raw error.message to clients. Use safeApiError() instead',
                fix(fixer) {
                  const errorVar = prop.value.object.name;
                  return fixer.replaceText(
                    prop.value,
                    `safeApiError(${errorVar}, 'Operation failed', logger)`
                  );
                }
              });
            }
          }
        });
      }
    };
  }
};
```

**Usage in .eslintrc:**
```json
{
  "plugins": ["custom"],
  "rules": {
    "custom/no-direct-error-exposure": "error"
  }
}
```

**CLI verification:**
```bash
npm run lint -- --rule 'custom/no-direct-error-exposure'
```

---

### Rule 2: Enforce safeApiError for Error Responses

**Purpose:** Ensure all error responses use the standard `safeApiError()` utility with proper logging

**Severity:** WARN (to catch, but may have legitimate alternatives)

**Pattern detection:**
```typescript
// WRONG - missing safeApiError
catch (error) {
  res.status(500).json({ error: 'Something failed' });
}

// RIGHT - using safeApiError
catch (error) {
  res.status(500).json({
    error: safeApiError(error, 'Something failed', logger)
  });
}

// ACCEPTABLE - hardcoded messages in non-error scenarios
res.json({ error: 'Validation failed' });  // Not an exception response
```

**Implementation:**
```javascript
// ESLint rule: rules/enforce-safe-api-error.js

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensure error responses use safeApiError()',
      category: 'Best Practices'
    }
  },
  create(context) {
    return {
      CallExpression(node) {
        // Detect res.status().json() or res.json() patterns
        if (isResponseJsonCall(node)) {
          const objectArg = node.arguments[0];

          if (objectArg?.type === 'ObjectExpression') {
            const errorProp = objectArg.properties.find(
              p => p.key?.name === 'error'
            );

            // Check if this is within a catch block
            if (errorProp && isInCatchBlock(node)) {
              const isUsingSafeApiError = errorProp.value?.callee?.name === 'safeApiError';

              if (!isUsingSafeApiError) {
                context.report({
                  node: errorProp.value,
                  message: 'Error responses should use safeApiError() for consistency and security',
                  fix(fixer) {
                    return fixer.replaceText(
                      errorProp.value,
                      `safeApiError(error, 'Operation failed', logger)`
                    );
                  }
                });
              }
            }
          }
        }
      }
    };
  }
};

function isResponseJsonCall(node) {
  return (
    node.callee?.property?.name === 'json' &&
    (node.callee?.object?.callee?.property?.name === 'status' ||
     node.callee?.object?.property?.name === 'json')
  );
}

function isInCatchBlock(node) {
  let parent = node.parent;
  while (parent) {
    if (parent.type === 'CatchClause') return true;
    parent = parent.parent;
  }
  return false;
}
```

---

### Rule 3: Require Authentication on External Service Calls

**Purpose:** Prevent unauthenticated access to expensive external APIs (OpenAI, Stripe, etc.)

**Severity:** ERROR

**Pattern detection:**
```typescript
// WRONG - calling external service without auth middleware
router.post('/ai/transcribe', async (req, res) => {
  const result = await openai.audio.transcriptions.create({...});
});

// RIGHT - external service protected
router.post('/ai/transcribe',
  authenticate,
  requireRole(['admin']),
  async (req, res) => {
    const result = await openai.audio.transcriptions.create({...});
  }
);
```

**Implementation:**
```javascript
// ESLint rule: rules/require-auth-on-external-calls.js

const EXTERNAL_SERVICES = {
  'openai': ['openai', 'OpenAI'],
  'stripe': ['stripe', 'Stripe'],
  'twilio': ['twilio', 'Twilio'],
  'sendgrid': ['sendgrid', 'SendGrid'],
  'aws': ['aws', 'AWS', 'dynamodb', 's3']
};

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require authentication on external service API calls',
      category: 'Security'
    }
  },
  create(context) {
    let currentRouteNode = null;
    let routeHasAuth = false;

    return {
      // Track router.post/get/put/delete declarations
      CallExpression(node) {
        if (isRouterMethodCall(node)) {
          currentRouteNode = node;
          routeHasAuth = checkForAuthMiddleware(node);
        }

        // Check for external service calls without auth
        if (callsExternalService(node) && currentRouteNode && !routeHasAuth) {
          context.report({
            node,
            message: `Unauthenticated external API call. Add authenticate middleware to route.`,
            fix(fixer) {
              // Suggest adding authenticate middleware
              return null; // Manual fix required
            }
          });
        }
      }
    };
  }
};

function isRouterMethodCall(node) {
  return ['post', 'get', 'put', 'delete'].includes(node.callee?.property?.name);
}

function checkForAuthMiddleware(node) {
  return node.arguments.some(arg =>
    arg.name === 'authenticate' ||
    (arg.type === 'Identifier' && arg.name.includes('auth'))
  );
}

function callsExternalService(node) {
  const memberExpr = node.callee?.object?.object?.name;
  const apiName = node.callee?.property?.name;

  for (const [service, names] of Object.entries(EXTERNAL_SERVICES)) {
    if (names.some(n => memberExpr?.includes(n) || apiName?.includes(n))) {
      return true;
    }
  }
  return false;
}
```

---

### Rule 4: Prevent Duplicate Error Extraction Patterns

**Purpose:** Enforce consistent use of error utilities; prevent redundant code

**Severity:** WARN

**Pattern detection:**
```typescript
// WRONG - old pattern (deprecated)
error instanceof Error ? error.message : String(error)

// WRONG - inline extraction
const msg = error?.message || 'Unknown';

// RIGHT - use utility
import { getErrorMessage } from '@rebuild/shared';
const msg = getErrorMessage(error);
```

**Implementation:**
```javascript
// ESLint rule: rules/use-error-utilities.js

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Use getErrorMessage() utility instead of manual error extraction',
      category: 'Best Practices'
    },
    fixable: 'code'
  },
  create(context) {
    return {
      ConditionalExpression(node) {
        // Detect: error instanceof Error ? error.message : ...
        if (isInstanceofErrorCheck(node)) {
          context.report({
            node,
            message: 'Use getErrorMessage() utility instead of manual instanceof checks',
            fix(fixer) {
              const errorVar = getErrorVariable(node);
              return fixer.replaceText(
                node,
                `getErrorMessage(${errorVar})`
              );
            }
          });
        }
      },

      MemberExpression(node) {
        // Detect: error?.message fallback chains
        if (node.property?.name === 'message' && isErrorVariable(node.object)) {
          context.report({
            node,
            message: 'Use getErrorMessage() utility for safe error extraction',
            fix(fixer) {
              const errorVar = node.object.name;
              return fixer.replaceText(
                node,
                `getErrorMessage(${errorVar})`
              );
            }
          });
        }
      }
    };
  }
};
```

---

### Rule 5: Environment Guards on Development-Only Endpoints

**Purpose:** Ensure test and debug endpoints are properly gated to development only

**Severity:** WARN

**Pattern detection:**
```typescript
// WRONG - unguarded test endpoint
router.post('/test-api', async (req, res) => {
  // Accessible in production!
});

// RIGHT - development-only guard
if (process.env.NODE_ENV === 'development') {
  router.post('/test-api', async (req, res) => {
    // Only in dev
  });
}
```

**Implementation:**
```javascript
// ESLint rule: rules/guard-test-endpoints.js

const TEST_ENDPOINT_PATTERNS = /test|debug|dev|internal/i;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require NODE_ENV guard on test/debug endpoints',
      category: 'Security'
    }
  },
  create(context) {
    return {
      CallExpression(node) {
        // Detect router.post('/test-...', ...) patterns
        if (isRouterMethodCall(node)) {
          const routePath = node.arguments[0]?.value;

          if (routePath && TEST_ENDPOINT_PATTERNS.test(routePath)) {
            // Check if wrapped in NODE_ENV guard
            if (!isInNodeEnvGuard(node)) {
              context.report({
                node,
                message: `Test endpoint '${routePath}' must be wrapped in: if (process.env.NODE_ENV === 'development')`
              });
            }
          }
        }
      }
    };
  }
};

function isInNodeEnvGuard(node) {
  let parent = node.parent;
  while (parent) {
    if (isNodeEnvCheckBlock(parent)) return true;
    parent = parent.parent;
  }
  return false;
}

function isNodeEnvCheckBlock(node) {
  return (
    node.type === 'IfStatement' &&
    node.test?.left?.property?.name === 'NODE_ENV' &&
    node.test?.right?.value === 'development'
  );
}
```

---

## Implementation Plan

### Phase 1: Rules Foundation (Week 1)
```json
{
  "extends": ["eslint:recommended"],
  "plugins": ["custom-security"],
  "rules": {
    "custom-security/no-direct-error-exposure": "error",
    "custom-security/guard-test-endpoints": "error"
  }
}
```

### Phase 2: Enforcement (Week 2)
Add to CI/CD pipeline:
```bash
# .github/workflows/lint.yml
- name: Check error handling patterns
  run: npm run lint -- --rule custom-security

- name: Verify test endpoints
  run: ./scripts/check-test-endpoints.sh

- name: Verify authentication coverage
  run: ./scripts/check-auth-coverage.sh
```

### Phase 3: Team Training (Week 3)
- [ ] Share quick reference guide
- [ ] Run workshop on error handling patterns
- [ ] Update PR review checklist
- [ ] Document in team handbook

---

## CLI Commands Setup

Add these to `package.json`:

```json
{
  "scripts": {
    "lint:security": "eslint . --rule custom-security",
    "lint:errors": "eslint . --rule 'custom-security/no-direct-error-exposure'",
    "lint:auth": "eslint . --rule 'custom-security/guard-test-endpoints'",
    "check:error-patterns": "./scripts/check-error-patterns.sh",
    "check:test-endpoints": "./scripts/check-test-endpoints.sh",
    "check:auth-coverage": "./scripts/check-auth-coverage.sh"
  }
}
```

---

## Bash Script Helpers

### Script 1: Check for raw error messages
```bash
#!/bin/bash
# scripts/check-error-patterns.sh

set -e

echo "Checking for unsafe error patterns..."

PATTERNS=(
  'res\.json.*error.*error\.message'
  'res\.status.*json.*error.*error\.message'
  'json.*error:.*error\.message'
)

found=0
for pattern in "${PATTERNS[@]}"; do
  if grep -r "$pattern" server/src --include="*.ts"; then
    echo "ERROR: Found raw error.message pattern: $pattern"
    found=1
  fi
done

if [ $found -eq 0 ]; then
  echo "OK: No unsafe error message patterns detected"
else
  exit 1
fi
```

### Script 2: Check test endpoints are guarded
```bash
#!/bin/bash
# scripts/check-test-endpoints.sh

set -e

echo "Checking test endpoint guards..."

# Find test endpoints
test_endpoints=$(grep -r "router\.(post\|get)" server/src/routes \
  --include="*.ts" | grep -i "test\|debug" | grep -v "NODE_ENV")

if [ ! -z "$test_endpoints" ]; then
  echo "ERROR: Found unguarded test endpoints:"
  echo "$test_endpoints"
  exit 1
fi

echo "OK: All test endpoints are properly guarded"
```

### Script 3: Check authentication coverage
```bash
#!/bin/bash
# scripts/check-auth-coverage.sh

set -e

echo "Checking authentication on external service endpoints..."

# Find external service calls without auth
for service in "openai" "stripe" "twilio"; do
  unprotected=$(grep -r "$service" server/src/routes \
    --include="*.ts" -B 5 | grep -v "authenticate" | grep "router\." || true)

  if [ ! -z "$unprotected" ]; then
    echo "WARNING: Found potentially unprotected $service endpoint"
  fi
done

echo "Check complete - review warnings above"
```

---

## Pre-Commit Hook Integration

```bash
#!/bin/bash
# .husky/pre-commit

# Check error handling patterns
npm run check:error-patterns || exit 1

# Lint security rules
npm run lint:security || exit 1

# Check test endpoints
npm run check:test-endpoints || exit 1
```

---

## Success Criteria

After implementing these rules, you should see:

- [ ] 0 raw `error.message` in API responses
- [ ] 0 unguarded test endpoints
- [ ] 100% consistent use of error utilities
- [ ] All external service endpoints authenticated
- [ ] Pre-commit hook prevents these issues
- [ ] CI/CD checks enforce rules

---

## References

- ESLint custom rule guide: https://eslint.org/docs/latest/extend/custom-rules
- ESLint rule testing: https://github.com/eslint/eslint/tree/main/tests/lib/rules
- Existing rules: `server/.eslintrc.json`

---

**Last Updated:** 2025-12-26
**Recommendation Status:** Ready for Phase 1 implementation
**Owner:** Security & Architecture
