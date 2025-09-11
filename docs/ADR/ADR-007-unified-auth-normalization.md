# ADR-007: Unified Authentication Normalization

## Status
Accepted

## Date
2025-01-11

## Context

The Restaurant OS authentication system had grown organically with multiple token types, role systems, and authentication methods:

1. **Supabase tokens** - Generic "authenticated" role needing database lookups
2. **PIN-based auth** - For service staff 
3. **Station login** - Shared device authentication
4. **Kiosk tokens** - Customer self-service

This led to several issues:
- Inconsistent role naming (admin vs owner, user vs customer, kiosk_demo vs kiosk)
- Multiple code paths for role resolution
- Race conditions in WebSocket authentication
- No single source of truth for user identity
- Missing restaurant context on write operations

## Decision

We implemented a unified edge normalization pattern where all authentication flows converge at a single point (`AuthenticationService.validateToken()`), which returns a `NormalizedUser` object containing:

```typescript
interface NormalizedUser {
  id: string;
  email?: string;
  role: DatabaseRole;  // Canonical roles only
  scopes: ApiScope[];  // Derived from role
  restaurantId?: string;
  tokenType: TokenType;
}
```

### Key Design Choices

1. **Canonical Roles Only**: Seven database roles are the only allowed values:
   - owner, manager, server, cashier, kitchen, expo, customer

2. **Edge Normalization**: All role translation happens at the authentication boundary:
   - admin → owner
   - user → customer  
   - kiosk_demo → customer
   - authenticated → resolved from user_restaurants table

3. **Restaurant Context Mandatory**: Write operations (POST/PUT/PATCH/DELETE) require X-Restaurant-ID header

4. **Single Cache Layer**: 5-minute in-memory cache for role lookups to reduce database queries

5. **Thin Middleware**: `requireRole` and `requireScopes` are now simple wrappers that read from the normalized user

## Consequences

### Positive
- **Single source of truth** for user identity and permissions
- **Consistent authorization** across HTTP and WebSocket
- **Reduced database lookups** via caching
- **Clear audit trail** with structured logging
- **Simplified testing** with predictable role behavior
- **Better security** with mandatory restaurant context

### Negative
- **Breaking change** for clients sending legacy role names
- **Migration complexity** for existing tokens in production
- **Cache invalidation** needs careful handling
- **Additional latency** for Supabase token resolution (mitigated by cache)

## Implementation Notes

### Migration Path
1. Deploy with backward compatibility layer (`transformLegacyOrderPayload`)
2. Monitor logs for deprecated field usage
3. Update clients to use camelCase DTOs
4. Remove compatibility layer after 30 days

### Error Codes
Structured error codes help identify auth failures:
- `AUTH_ROLE_MISSING` - No role in token or database
- `AUTH_SCOPE_MISSING` - Required scope not present
- `RESTAURANT_CONTEXT_MISSING` - Missing X-Restaurant-ID

### Monitoring
Track these metrics:
- Cache hit rate (target >80%)
- Role resolution latency (target <50ms)
- Legacy field usage (should decrease over time)
- Failed auth attempts by reason code

## References
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices RFC 8725](https://datatracker.ietf.org/doc/html/rfc8725)
- Previous ADRs: ADR-003 (Multi-tenancy), ADR-005 (RBAC)