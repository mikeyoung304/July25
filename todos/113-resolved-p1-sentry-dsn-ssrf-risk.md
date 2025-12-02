---
status: resolved
priority: p1
issue_id: 113
tags: [code-review, security, ssrf]
dependencies: []
resolution_date: 2025-12-02
---

# SSRF Risk via Sentry DSN Parsing

## Problem Statement
The Sentry DSN parsing in security middleware does not validate the hostname, allowing potential Server-Side Request Forgery (SSRF) attacks. An attacker could craft a malicious DSN that causes the server to make requests to internal network resources, perform port scanning, or leak credentials. This represents a critical security vulnerability that could enable reconnaissance and exploitation of internal infrastructure.

## Findings
**Location**: `server/src/middleware/security.ts:231-237`

The current implementation parses the Sentry DSN URL without validating that it points to a legitimate Sentry endpoint:

```typescript
// Lines 231-237
const url = new URL(dsn);
// No validation of hostname here
// Missing checks for:
// 1. Protocol must be https
// 2. Hostname must end with .sentry.io
// 3. No private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
```

This allows arbitrary URLs to be processed, potentially triggering requests to:
- Internal services (http://localhost:6379, http://internal-api:3000)
- Cloud metadata endpoints (http://169.254.169.254/latest/meta-data/)
- Private network resources

## Proposed Solutions

### Option 1: Strict Hostname Validation
- **Description**: Add validation to ensure DSN hostname ends with `.sentry.io` and uses `https` protocol
- **Pros**:
  - Simple to implement
  - Blocks most SSRF attack vectors
  - Aligns with Sentry's official domains
- **Cons**:
  - May break if using self-hosted Sentry (rare use case)
  - Requires updating if Sentry changes domain structure
- **Effort**: Small
- **Risk**: Low

### Option 2: URL Allowlist with Additional Checks
- **Description**: Implement comprehensive URL validation including protocol, hostname pattern, and private IP blocking
- **Pros**:
  - Most secure approach
  - Prevents all known SSRF vectors
  - Can support both cloud and self-hosted Sentry via configuration
- **Cons**:
  - Slightly more complex implementation
  - Requires configuration for non-standard setups
- **Effort**: Medium
- **Risk**: Low

### Option 3: Remove DSN Parsing Entirely
- **Description**: Use environment variable for Sentry DSN without runtime parsing/validation
- **Pros**:
  - Eliminates attack surface completely
  - Simplest approach
- **Cons**:
  - Less flexible
  - Doesn't address root cause if DSN parsing needed elsewhere
- **Effort**: Small
- **Risk**: Low

## Recommended Action
[Leave blank - to be filled during triage]

## Technical Details
- **Affected Files**:
  - `server/src/middleware/security.ts`
- **Components**:
  - Security middleware
  - Sentry integration
  - Error tracking system
- **Attack Vectors**:
  - Internal network scanning via malicious DSN
  - Cloud metadata service access (169.254.169.254)
  - Credential leakage from internal APIs
  - Port scanning of internal infrastructure

## Acceptance Criteria
- [x] DSN validation enforces `https` protocol only
- [x] Hostname must end with `.sentry.io` (or configured allowlist)
- [x] Private IP ranges (RFC 1918) are blocked
- [x] Localhost and loopback addresses are rejected
- [x] Cloud metadata endpoints (169.254.169.254) are blocked
- [x] Invalid DSNs throw clear error messages
- [x] Existing legitimate Sentry DSNs continue to work
- [ ] Unit tests cover all SSRF attack vectors

## Work Log
| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | From code review of commit a699c6c6 |
| 2025-12-02 | Resolved | Added validateSentryDSN method with SSRF protection |

## Resources
- PR/Commit: a699c6c6
- OWASP SSRF: https://owasp.org/www-community/attacks/Server_Side_Request_Forgery
- Sentry DSN Format: https://docs.sentry.io/product/sentry-basics/dsn-explainer/
