# Prevention Strategies: API Error Handling Security

**Complete prevention strategy framework for the security issues fixed in enterprise audit remediation (Phase 3)**

---

## Executive Summary

In this session, four critical security and architecture issues were fixed:

| Issue | Type | Impact | Root Cause |
|-------|------|--------|-----------|
| Raw error message exposure | Security | HIGH | No utility for safe error responses |
| Test endpoints without auth | Security | MEDIUM | Development-only code in production |
| Inconsistent error patterns | Architecture | MEDIUM | Multiple pattern approaches |
| Redundant fallback patterns | Tech Debt | LOW | Utility created after code existed |

**Prevention goal:** Make these issues impossible to introduce in new code through:
1. **Code patterns** (templates, examples)
2. **Automation** (linting, testing, CI/CD)
3. **Code review** (checklists, training)
4. **Team knowledge** (documentation, quick reference)

---

## Document Index

This prevention strategy is documented across four guides:

### 1. **CL-SEC-001: Error Handling & Authentication Security** (Full Guide)
**Location:** `.claude/lessons/CL-SEC-001-error-handling-security.md`

Deep-dive document covering:
- Detailed issue analysis
- Prevention strategies with implementation
- Automation opportunities (ESLint, tests, CI/CD)
- Best practices for API endpoint development
- Security and code review checklists

**Use when:** Understanding the full context or implementing prevention

### 2. **API_ERROR_HANDLING_QUICK_REFERENCE** (Developer Guide)
**Location:** `.claude/lessons/API_ERROR_HANDLING_QUICK_REFERENCE.md`

Fast lookup for developers writing API code:
- Copy-paste templates
- Common mistakes vs. correct patterns
- Utility function reference
- Import statements
- Testing examples
- Authentication checklist

**Use when:** Building new API endpoints

### 3. **API_ERROR_HANDLING_ESLINT_RULES** (Automation Guide)
**Location:** `.claude/lessons/API_ERROR_HANDLING_ESLINT_RULES.md`

Technical implementation for automated detection:
- 5 recommended ESLint rules
- Full rule code and implementation
- Bash script helpers
- CI/CD integration
- Pre-commit hook setup

**Use when:** Implementing automation

### 4. **API_ERROR_HANDLING_CODE_REVIEW_CHECKLIST** (Review Guide)
**Location:** `.claude/lessons/API_ERROR_HANDLING_CODE_REVIEW_CHECKLIST.md`

Detailed checklist for code reviews:
- Pre-review file scanning
- Security checklist (blocking issues)
- Architecture checklist (important items)
- Best practices (recommended improvements)
- Test coverage requirements
- Common review comments (copy-paste)

**Use when:** Reviewing PRs with API or error handling changes

---

## Prevention Strategies Overview

### Strategy 1: Error Response Standardization

**Goal:** Eliminate raw error message exposure

**Implementation:**
- Always use `safeApiError(error, 'Generic message', logger)` in responses
- Log full details server-side with `logger.error()`
- Return only user-friendly messages to clients
- Sanitize sensitive data (passwords, tokens, database URLs)

**Code pattern:**
```typescript
try {
  // business logic
} catch (error) {
  // Log details server-side
  logger.error('Operation failed', {
    error: getErrorMessage(error),
    stack: getErrorStack(error),
    context: { restaurantId, userId }
  });

  // Return generic message to client
  res.status(500).json({
    error: safeApiError(error, 'Friendly message', logger)
  });
}
```

**Automated by:**
- ESLint rule: `no-direct-error-exposure`
- Test suite: Error response validation
- Pre-commit hook: Check for `.message` patterns

**Verified by:**
- Code review checklist: "No raw error.message in responses"

---

### Strategy 2: Authentication on Protected Resources

**Goal:** Prevent unauthenticated access to expensive or sensitive endpoints

**Implementation:**
- Apply `authenticate` middleware to all protected endpoints
- Apply `requireRole()` based on operation sensitivity
- Gate development-only endpoints with `NODE_ENV === 'development'`
- Validate restaurant_id on all data operations

**Code pattern:**
```typescript
// External service endpoint - ALWAYS protected
router.post('/ai/transcribe',
  authenticate,
  requireRole(['admin']),
  rateLimiter,
  async (req, res) => { /* ... */ }
);

// Development-only endpoint
if (process.env.NODE_ENV === 'development') {
  router.post('/debug/test', authenticate, async (req, res) => { /* ... */ });
}
```

**Automated by:**
- ESLint rule: `require-auth-on-external-calls`
- ESLint rule: `guard-test-endpoints`
- Bash script: Check test endpoint guards
- CI/CD: Verify authentication coverage

**Verified by:**
- Code review checklist: "All external service endpoints require auth"
- Tests: Authentication enforcement tests

---

### Strategy 3: Consistent Error Utilities Usage

**Goal:** Eliminate redundant error extraction patterns

**Implementation:**
- Use `getErrorMessage(error)` for all message extraction
- Use `getErrorStack(error)` for stack traces
- Use `safeApiError()` for API responses
- Remove old patterns: `error instanceof Error ? error.message : ...`

**Code pattern:**
```typescript
import { getErrorMessage, getErrorStack, safeApiError } from '@rebuild/shared';

// Extract message
const msg = getErrorMessage(error);

// Extract stack (returns undefined if not Error)
const stack = getErrorStack(error);

// Safe API response
const response = safeApiError(error, 'User message', logger);
```

**Automated by:**
- ESLint rule: `use-error-utilities`
- Codemod: Replace old patterns with utility calls
- Linter: Flag `error instanceof Error` patterns

**Verified by:**
- Code review checklist: "Uses getErrorMessage() and safeApiError()"
- Grep: Search for old patterns in CI/CD

---

### Strategy 4: Logging Context Preservation

**Goal:** Enable debugging while protecting sensitive data

**Implementation:**
- Always log full error details with context
- Include: user ID, restaurant ID, resource IDs, timestamps
- Sanitize sensitive keys before external logging
- Use structured logging (logger.error with objects)

**Code pattern:**
```typescript
logger.error('Order processing failed', {
  error: getErrorMessage(error),
  stack: getErrorStack(error),
  orderId,
  restaurantId,
  userId,
  timestamp: new Date().toISOString()
});

// Before sending to external services, sensitive keys are redacted:
// password, token, apikey, authorization, secret, credential, session, cookie
```

**Automated by:**
- Logger sanitization middleware: `security.ts` sanitizeEventDetails()
- Test suite: Verify context is logged
- Code review: Verify no sensitive data in client messages

**Verified by:**
- Code review checklist: "Error logging includes context"
- Tests: Security event logging tests

---

### Strategy 5: Environment-Based Endpoint Gating

**Goal:** Prevent test/debug endpoints from running in production

**Implementation:**
- Wrap development-only endpoints with `if (NODE_ENV === 'development')`
- Use explicit environment check, not custom flags
- Test endpoints should also require authentication
- Document development-only endpoints clearly

**Code pattern:**
```typescript
// Development-only endpoint
if (process.env.NODE_ENV === 'development') {
  router.post('/debug/memory-profiling', authenticate, async (req, res) => {
    // Only available in development
  });
}
```

**Automated by:**
- ESLint rule: `guard-test-endpoints`
- Bash script: Check for unguarded test endpoints
- CI/CD: Prevent merging unguarded test code

**Verified by:**
- Code review checklist: "Test endpoints are development-only"

---

## Implementation Roadmap

### Phase 1: Immediate Actions (Done ✓)
- [x] Create `safeApiError()` utility
- [x] Update all existing routes to use utility
- [x] Complete error pattern migration
- [x] Add NODE_ENV guards to test endpoints
- [x] Document in lessons learned

### Phase 2: Automation (Next - 2 Weeks)
- [ ] Implement ESLint rules (5 rules)
- [ ] Set up pre-commit hooks
- [ ] Add CI/CD checks
- [ ] Create bash script helpers

### Phase 3: Team Enablement (3-4 Weeks)
- [ ] Train team on patterns
- [ ] Update PR review checklist
- [ ] Share quick reference guide
- [ ] Document in team handbook

### Phase 4: Monitoring (Ongoing)
- [ ] Track lint violations
- [ ] Review PR metrics
- [ ] Incident tracking
- [ ] Annual strategy review

---

## Key Utilities Reference

### From `shared/utils/error-utils.ts`

```typescript
// Extract message from any error type
getErrorMessage(error: unknown): string
// getErrorMessage(new Error('Test')) → 'Test'
// getErrorMessage('String') → 'String'
// getErrorMessage(null) → 'null'

// Extract stack trace (undefined if not Error)
getErrorStack(error: unknown): string | undefined
// getErrorStack(new Error('Test')) → 'Error: Test\n    at ...'
// getErrorStack('String') → undefined

// Safe API error response
safeApiError(
  error: unknown,
  genericMessage: string,
  logger?: ErrorLogger | ((message: string, context: Record<string, unknown>) => void)
): string
// Logs full details server-side, returns generic message for client
// res.json({ error: safeApiError(error, 'Operation failed', logger) })
```

### From `server/src/middleware/security.ts`

```typescript
// Sanitizes sensitive keys from objects
sanitizeEventDetails(details: Record<string, unknown>): Record<string, unknown>
// Redacts: password, token, apikey, authorization, secret, credential, session, cookie
// Applied to: DataDog, Sentry event forwarding

// Security event logging
securityMonitor.logEvent({
  type: 'auth_failure' | 'rate_limit' | 'csrf_violation' | 'suspicious_activity',
  ip: string,
  userId?: string,
  details: Record<string, unknown>
})
```

---

## Success Metrics

Track these to measure prevention strategy effectiveness:

### Metric 1: Security - Error Message Leakage
**Target:** 0 instances in production

```typescript
// Measure: Grep production logs for error pattern indicators
grep -r "ECONNREFUSED\|postgres://\|Error:" logs/production.log

// Check: API responses contain no technical details
npm run test -- --testNamePattern="error response"
```

### Metric 2: Security - Unauthenticated Endpoints
**Target:** 0 unprotected external service endpoints

```typescript
// Measure: Scan routes for external services without auth
./scripts/check-auth-coverage.sh

// Check: All test endpoints guarded
./scripts/check-test-endpoints.sh
```

### Metric 3: Architecture - Code Consistency
**Target:** 100% using error utilities, 0 old patterns

```typescript
// Measure: Find remaining old error patterns
grep -r "error instanceof Error" server/src client/src

// Check: All error extractions use utility
grep -r "getErrorMessage\|getErrorStack" server/src | wc -l
```

### Metric 4: Automation - Rule Compliance
**Target:** 0 ESLint violations in PR reviews

```bash
npm run lint:security  # 0 errors
npm run lint:errors    # 0 errors
npm run lint:auth      # 0 errors
```

### Metric 5: Testing - Coverage
**Target:** 100% of error handling has tests

```bash
# Test coverage for error scenarios
npm run test:coverage -- --testPathPattern=error

# Must include: response safety, auth enforcement, logging
```

---

## Quick Start for Developers

### Step 1: Use the Template
When creating a new API endpoint, start with:

```typescript
// Copy from: API_ERROR_HANDLING_QUICK_REFERENCE.md
router.post('/your-endpoint',
  authenticate,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const result = await service.call(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Endpoint failed', { error: getErrorMessage(error) });
      res.status(500).json({ error: safeApiError(error, 'Operation failed', logger) });
    }
  }
);
```

### Step 2: Review Checklist
Before pushing, verify:

```
[ ] No raw error.message in responses
[ ] Full error details logged server-side
[ ] Test endpoints are development-only
[ ] External service endpoints authenticated
[ ] Using getErrorMessage() and safeApiError()
```

### Step 3: Code Review
Reviewers check:

```
[ ] Error response tests included
[ ] Authentication enforced
[ ] Consistent error handling patterns
[ ] Security checklist items verified
```

---

## Team Training Outline

### Session 1: Why This Matters (15 min)
- Real examples of error disclosure attacks
- Impact on security posture
- Cost of fixing later vs. preventing now

### Session 2: The Patterns (30 min)
- `safeApiError()` usage
- `getErrorMessage()` and `getErrorStack()`
- Authentication middleware
- Error logging with context

### Session 3: Hands-On (30 min)
- Write sample endpoint following template
- Code review using checklist
- Review ESLint rules and tests
- Q&A

### Session 4: Adoption (Ongoing)
- Monitor ESLint violations
- Review PR patterns
- Share learnings in retrospectives
- Celebrate compliance

---

## Resources

### Core Documents
1. **Full Guide:** `CL-SEC-001-error-handling-security.md`
2. **Developer Reference:** `API_ERROR_HANDLING_QUICK_REFERENCE.md`
3. **Code Review:** `API_ERROR_HANDLING_CODE_REVIEW_CHECKLIST.md`
4. **Automation:** `API_ERROR_HANDLING_ESLINT_RULES.md`

### Related Lessons
- [CL-AUTH-001: Strict Auth Drift](./CL-AUTH-001-strict-auth-drift.md)
- [CL-AUTH-002: Header Fallback Vulnerability](./CL-AUTH-002-header-fallback-vulnerability.md)
- [QUICK_REFERENCE_PATTERNS.md](./QUICK_REFERENCE_PATTERNS.md)

### External References
- OWASP Top 10: A01:2021 - Broken Access Control
- OWASP Top 10: A09:2021 - Security Logging and Monitoring Failures
- CWE-209: Generation of Error Message Containing Sensitive Information
- CWE-78: Improper Neutralization of Special Elements used in an OS Command

---

## Questions to Ask Yourself

Before committing API code, ask:

1. **Could this error message leak internal details?**
   - Database names, service IPs, file paths, API endpoints
   - If yes: Use `safeApiError()` with generic message

2. **Who should be able to call this endpoint?**
   - If restricted: Add `authenticate` and `requireRole()`
   - If public: Document why it's public

3. **Does this access external services?**
   - OpenAI, Stripe, Twilio, SendGrid, AWS, etc.
   - If yes: Require authentication + role restriction

4. **Is this for development only?**
   - Test, debug, or diagnostic endpoints
   - If yes: Wrap in `if (NODE_ENV === 'development')`

5. **How will we debug if this fails?**
   - If "unsure": Add structured error logging with context

6. **Could someone abuse this endpoint?**
   - High cost external APIs, data deletion, sensitive operations
   - If yes: Add rate limiting + authentication

---

## Final Checklist

Before releasing any new version with API endpoints:

```
SECURITY
[ ] No raw error messages in responses (verified with grep)
[ ] All stack traces logged server-side only
[ ] External service endpoints authenticated
[ ] Test endpoints development-only
[ ] No sensitive data in error messages

ARCHITECTURE
[ ] Using safeApiError() for all error responses
[ ] Using getErrorMessage() for message extraction
[ ] Consistent error response structure
[ ] Full error details logged with context
[ ] No duplicate error handling patterns

TESTING
[ ] Error response safety tests included
[ ] Authentication enforcement tests included
[ ] Error logging tests verify context preservation
[ ] Test coverage > 80% for error paths

AUTOMATION
[ ] ESLint rules pass without warnings
[ ] CI/CD checks all pass
[ ] Pre-commit hook executed successfully
[ ] No unguarded test endpoints detected
```

---

**Document Created:** 2025-12-26
**Status:** Complete Prevention Strategy Framework
**Next Review:** Q1 2026
**Owner:** Security & Architecture Team

---

## How to Use This Framework

**For individual developers:**
→ Start with `API_ERROR_HANDLING_QUICK_REFERENCE.md`

**For code reviewers:**
→ Use `API_ERROR_HANDLING_CODE_REVIEW_CHECKLIST.md`

**For DevOps/automation:**
→ Implement `API_ERROR_HANDLING_ESLINT_RULES.md`

**For team leads:**
→ Reference `CL-SEC-001-error-handling-security.md` for training

**For everyone:**
→ This overview document for understanding the complete strategy
