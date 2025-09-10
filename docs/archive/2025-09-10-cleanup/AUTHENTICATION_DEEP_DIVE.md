# Restaurant OS Authentication Deep Dive

**IMPORTANT**: This document has been superseded by the master authentication documentation.

➡️ **Please refer to [AUTHENTICATION_MASTER.md](./AUTHENTICATION_MASTER.md) for the comprehensive authentication documentation.**

## What's New in v6.0.4?

The master authentication document includes:

- **Role Hierarchy System**: Higher roles automatically inherit permissions from lower roles
- **Enhanced Security**: Rate limiting, no hardcoded secrets, strict token verification
- **Unified Documentation**: All authentication information in one place
- **Production Configuration**: Complete environment setup guide
- **Migration Guide**: Step-by-step upgrade instructions

## Quick Migration Notes

### Role Hierarchy (NEW)
```typescript
// Old: Exact role matching
canAccess(['manager']) // Only managers

// New: Hierarchical permissions
canAccess(['manager']) // Managers AND owners
```

### Key Changes
- Owner role now properly inherits all lower role permissions
- Rate limiting on all auth endpoints (5 attempts/15 min)
- All secrets must be in environment variables (no defaults)
- Strict token verification (no unverified tokens accepted)

---

*Please see [AUTHENTICATION_MASTER.md](./AUTHENTICATION_MASTER.md) for full documentation.*