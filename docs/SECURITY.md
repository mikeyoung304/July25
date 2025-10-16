# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 6.0.x   | :white_check_mark: |
| < 6.0   | :x:                |

## Reporting a Vulnerability

We take security seriously at Restaurant OS. If you discover a security vulnerability, please follow these steps:

1. **DO NOT** create a public GitHub issue
2. Email security details to: security@restaurant-os.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Resolution Target**: 30 days for critical, 90 days for moderate

## Security Measures

### Authentication & Authorization

- **JWT Tokens**: RS256 signed with secure keys
- **PIN Security**: bcrypt with pepper, rate-limited attempts
- **Session Management**: 
  - Managers: 8-hour sessions
  - Staff: 12-hour sessions
  - Automatic logout on inactivity
- **RBAC**: Fine-grained role-based permissions

### Data Protection

- **Encryption in Transit**: TLS 1.2+ required
- **Encryption at Rest**: Database encryption enabled
- **PII Handling**: Minimal storage, encrypted where necessary
- **Payment Data**: Never stored, tokenized via Square

### API Security

- **Rate Limiting**: Per-endpoint limits enforced
- **CSRF Protection**: Token validation on state-changing operations
- **Input Validation**: All inputs sanitized and validated
- **SQL Injection**: Parameterized queries only
- **XSS Prevention**: Content Security Policy headers

### Infrastructure

- **Environment Variables**: Secrets never in code
- **Dependency Scanning**: Regular vulnerability audits
- **Access Logs**: All API access logged with user context
- **Error Handling**: No sensitive data in error messages

## Security Checklist for Developers

### Before Committing Code

- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all user data
- [ ] Authentication checks on protected endpoints
- [ ] Rate limiting on resource-intensive operations
- [ ] Audit logging for sensitive operations
- [ ] Error messages don't expose system details

### API Development

- [ ] Validate `restaurant_id` context
- [ ] Check user permissions for operation
- [ ] Sanitize all inputs
- [ ] Use parameterized database queries
- [ ] Implement request size limits
- [ ] Add rate limiting where appropriate

### Frontend Security

- [ ] No sensitive data in localStorage
- [ ] API keys only on server-side
- [ ] Validate data before display
- [ ] Use HTTPS for all requests
- [ ] Implement Content Security Policy
- [ ] Sanitize user-generated content

## Known Security Considerations

### Current Implementation (v6.0.3)

- **Square Integration**: Configurable via SQUARE_ENVIRONMENT (sandbox/production)
- **WebSocket Auth**: Token passed in headers with validation
- **CORS**: Configured for known origins with auto-detected preview URLs
- **Security Headers**: Comprehensive Helmet configuration with CSP, HSTS, etc.
- **Suspicious Activity Detection**: Automated detection of SQL injection, XSS, path traversal
- **Security Monitoring**: Real-time event logging and statistics API
- **Request Size Limiting**: 10MB default limit on all requests
- **Enhanced CSP**: Nonce-based script execution in production

### Security Monitoring Endpoints

- `GET /api/v1/security/events` - View security events (admin only)
- `GET /api/v1/security/stats` - Security statistics dashboard
- `GET /api/v1/security/config` - Current security configuration

### Planned Improvements

- [ ] Implement 2FA for manager accounts
- [ ] Add API key rotation mechanism
- [x] Implement security headers middleware ✅
- [ ] Add penetration testing
- [ ] Implement WAF rules
- [ ] Add Redis-based session store
- [ ] Implement session fingerprinting

<a id="agent--operator-safety"></a>

## Agent & Operator Safety

### Security Rails for AI Agents & Human Operators

**(Source: AGENTS.md@1b8a708, verified)**

**RLS Multi-Tenancy Enforcement**

Row-Level Security (RLS) policies enforce multi-tenancy at the database level.

**Implementation:** `supabase/migrations/20251015_multi_tenancy_rls_and_pin_fix.sql`
- Migration file exists for RLS policies
- Database-level tenant isolation

**Security Requirements (Documented)**

Security rails enforced across the application:
- No secrets in logs
- CSRF protection on mutations
- Webhook signature validation
- Origin/CSP/Helmet security headers
- Rate limiting
- RLS enforcement

**Supporting Code:**
- `server/src/middleware/csrf.ts` - CSRF protection
- `server/src/middleware/security-headers.ts` - Security headers
- `supabase/migrations/` - RLS policies

---

## Compliance

### PCI DSS

- Payment processing via Square (PCI compliant)
- No credit card data stored locally
- Tokenization for all payment methods

### GDPR/Privacy

- Minimal data collection
- User consent for data processing
- Data deletion capabilities
- Export functionality planned

## Security Headers

Production deployments should include:

```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Dependencies

Regular security audits via:
- `npm audit` - Check for vulnerabilities
- `npm audit fix` - Auto-fix when possible
- Dependabot alerts enabled

## Incident Response

In case of security breach:

1. **Isolate**: Immediately isolate affected systems
2. **Assess**: Determine scope and impact
3. **Contain**: Prevent further damage
4. **Notify**: Alert affected users within 72 hours
5. **Remediate**: Fix vulnerability and deploy patches
6. **Review**: Post-mortem and process improvement

## Contact

Security Team: security@restaurant-os.com
Bug Bounty Program: Coming soon

---

Last Updated: September 1, 2025
Version: 6.0.3
