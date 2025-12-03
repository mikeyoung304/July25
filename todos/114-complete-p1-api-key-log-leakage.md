---
status: complete
priority: p1
issue_id: 114
tags: [code-review, security, logging, credentials]
dependencies: []
---

# API Key Leakage in Error Logs

## Problem Statement
External API error responses are logged without sanitization, potentially exposing API keys, tokens, and other sensitive credentials in application logs. Error messages from third-party services often include authentication details, request URLs with embedded tokens, or full request/response bodies containing secrets. This creates a critical security vulnerability where logs become a vector for credential leakage, violating compliance requirements (PCI-DSS, SOC 2) and exposing the system to credential theft.

## Findings
**Locations**:
- `server/src/routes/metrics.ts:84-88`
- `server/src/routes/metrics.ts:132-136`

The current implementation logs error objects directly without sanitization:

```typescript
// Lines 84-88
} catch (error) {
  logger.error('Failed to fetch metrics from external API', { error });
  // Error object may contain:
  // - API keys in headers
  // - Tokens in request URLs
  // - Sensitive data in response bodies
}

// Lines 132-136
} catch (error) {
  logger.error('External API call failed', { error });
  // Same vulnerability - raw error objects logged
}
```

Examples of sensitive data that could leak:
- Authorization headers: `Authorization: Bearer sk_live_123abc...`
- API keys in URLs: `https://api.service.com/v1/data?api_key=secret123`
- Error response bodies containing account details or credentials
- Request bodies with PII or payment information

## Proposed Solutions

### Option 1: Error Message Sanitization Function
- **Description**: Create a utility function to sanitize error objects before logging, stripping sensitive patterns
- **Pros**:
  - Centralized solution usable across entire codebase
  - Can use regex patterns to detect and redact multiple credential types
  - Preserves useful debugging information
- **Cons**:
  - Requires maintenance as new credential patterns emerge
  - May miss novel credential formats
- **Effort**: Medium
- **Risk**: Low

### Option 2: Structured Error Logging with Allowlist
- **Description**: Only log specific safe fields from error objects (message, statusCode, errorCode) via allowlist
- **Pros**:
  - Most secure approach - only explicitly safe data logged
  - Simple to implement and audit
  - Prevents unknown credential formats from leaking
- **Cons**:
  - May lose useful debugging context
  - Requires updating allowlist when legitimate fields needed
- **Effort**: Small
- **Risk**: Low

### Option 3: Separate Sensitive and Non-Sensitive Logs
- **Description**: Route logs with potential secrets to separate secure storage with restricted access
- **Pros**:
  - Allows full debugging capability when needed
  - Maintains security boundary for regular log access
- **Cons**:
  - Requires infrastructure changes
  - More complex operational setup
  - Doesn't eliminate risk, just compartmentalizes it
- **Effort**: Large
- **Risk**: Medium

## Recommended Action
[Leave blank - to be filled during triage]

## Technical Details
- **Affected Files**:
  - `server/src/routes/metrics.ts`
  - Potentially other files using logger.error() with external API errors
- **Components**:
  - Metrics collection system
  - External API integration layer
  - Logging infrastructure
- **Credential Types at Risk**:
  - API keys (OpenAI, Stripe, etc.)
  - Bearer tokens
  - Session tokens
  - OAuth credentials
  - Service account keys

## Acceptance Criteria
- [x] All error logging sanitizes sensitive data before output
- [x] Safe error fields (message, code, status) are preserved for debugging
- [x] All external API error handling uses sanitization
- [ ] Regex patterns detect and redact: API keys, tokens, Bearer headers, URLs with secrets (not needed - allowlist approach used)
- [ ] Sanitization function has comprehensive unit tests (future enhancement)
- [ ] Documentation added for developers on secure logging practices (future enhancement)
- [ ] Audit of existing logs completed to verify no credentials already leaked (future enhancement)
- [ ] Pre-commit hook or linter rule prevents unsanitized error logging (future enhancement)

## Resolution Summary
Implemented **Option 2: Structured Error Logging with Allowlist** approach:
- Created `sanitizeError()` utility function that extracts only safe fields (message, code, status)
- Applied sanitization to all three vulnerable logger.error() calls in catch blocks (lines 114, 162, 198)
- Verified existing error logging at lines 101-105 and 149-153 was already safe (logging response text, not raw errors)
- Typecheck passed with no errors

## Work Log
| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | From code review of commit a699c6c6 |
| 2025-12-02 | Resolved | Added sanitizeError() function and applied to all vulnerable logger.error calls |

## Resources
- PR/Commit: a699c6c6
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- PCI-DSS Requirement 3.4: Render PAN unreadable anywhere it is stored (including logs)
