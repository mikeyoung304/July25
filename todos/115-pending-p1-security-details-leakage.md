---
status: pending
priority: p1
issue_id: 115
tags: [code-review, security, observability, data-leakage]
dependencies: []
---

# Security Event Details Data Leakage

## Problem Statement
Security events are sent to external observability services (DataDog, Sentry) with an unvalidated `details: any` object that may contain sensitive data including passwords, tokens, session IDs, and PII. This creates a critical data leakage vulnerability where authentication failures, security violations, and other sensitive events inadvertently transmit credentials and private information to third-party services. This violates data residency requirements, compliance standards, and exposes the system to credential theft if observability accounts are compromised.

## Findings
**Locations**:
- `server/src/middleware/security.ts:132` - Authentication failures
- `server/src/middleware/security.ts:205` - Security violations
- `server/src/middleware/security.ts:254` - Rate limit events

The current implementation forwards raw details objects to external services:

```typescript
// Line 132 - Authentication failure
trackSecurityEvent({
  type: 'auth_failure',
  details: req.body, // May contain password, email, tokens
  // ...
});

// Line 205 - Security violation
trackSecurityEvent({
  type: 'security_violation',
  details: { /* unvalidated object */ }, // May contain sensitive request data
  // ...
});

// Line 254 - Rate limit
trackSecurityEvent({
  type: 'rate_limit_exceeded',
  details: { /* user context */ }, // May contain session tokens, API keys
  // ...
});
```

Examples of sensitive data that could leak:
- Login attempts: `{ email: "user@example.com", password: "secret123" }`
- API requests: `{ headers: { Authorization: "Bearer token123" } }`
- Session data: `{ sessionId: "abc123", userId: "...", roles: [...] }`
- Request bodies with PII: payment info, SSN, health records
- Internal system details: IP addresses, hostnames, service topology

## Proposed Solutions

### Option 1: Details Sanitization Function
- **Description**: Create a sanitization function that strips known sensitive fields before forwarding to observability services
- **Pros**:
  - Preserves useful debugging context
  - Centralized implementation for all security events
  - Can use allowlist + blocklist approach
- **Cons**:
  - Requires comprehensive list of sensitive field names
  - May miss new sensitive fields added in future
- **Effort**: Medium
- **Risk**: Low

### Option 2: Explicit Safe Fields Allowlist
- **Description**: Define explicit allowed fields for each event type, only forward those fields
- **Pros**:
  - Most secure - only known-safe data transmitted
  - Forces developers to consider data sensitivity
  - Easy to audit
- **Cons**:
  - Less flexible
  - Requires defining safe fields for each event type
  - May lose useful debugging data
- **Effort**: Medium
- **Risk**: Low

### Option 3: Hash Sensitive Data Before Forwarding
- **Description**: Apply one-way hashing to sensitive fields (user IDs, IPs) while keeping structure
- **Pros**:
  - Allows correlation analysis without exposing raw data
  - Preserves analytics value
  - Reduces compliance scope
- **Cons**:
  - Can't trace back to specific users without lookup table
  - Hashing function must be consistent
  - Some fields can't be hashed (need full removal)
- **Effort**: Large
- **Risk**: Medium

### Option 4: Tiered Event Detail Levels
- **Description**: Separate internal (full details) vs external (sanitized) event tracking
- **Pros**:
  - Full debugging capability internally
  - Compliant external data sharing
  - Flexible per deployment environment
- **Cons**:
  - Requires dual tracking systems
  - More complex implementation
  - Operational overhead
- **Effort**: Large
- **Risk**: Medium

## Recommended Action
[Leave blank - to be filled during triage]

## Technical Details
- **Affected Files**:
  - `server/src/middleware/security.ts`
  - Any code calling `trackSecurityEvent()`
- **Components**:
  - Security middleware
  - Authentication system
  - Rate limiting
  - Observability integration (DataDog, Sentry)
- **Data at Risk**:
  - Passwords and credentials
  - API keys and tokens
  - Session identifiers
  - PII (email, name, phone)
  - Payment information
  - Internal system architecture details

## Acceptance Criteria
- [ ] Sanitization function strips sensitive fields (password, token, apiKey, authorization, etc.)
- [ ] Each event type has documented safe fields
- [ ] No authentication credentials forwarded to external services
- [ ] PII either removed or hashed before transmission
- [ ] Sanitization has comprehensive unit tests with realistic scenarios
- [ ] Code review checklist updated to verify security event sanitization
- [ ] Audit of existing DataDog/Sentry data to verify no historical leaks
- [ ] Documentation for developers on what data can/cannot be in security events
- [ ] TypeScript types enforce structure (replace `details: any` with typed interfaces)

## Work Log
| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | From code review of commit a699c6c6 |

## Resources
- PR/Commit: a699c6c6
- GDPR Article 32: Security of processing
- OWASP Top 10 2021 - A09: Security Logging and Monitoring Failures
- DataDog Data Privacy: https://docs.datadoghq.com/data_security/
- Sentry Data Scrubbing: https://docs.sentry.io/product/data-management-settings/scrubbing/
