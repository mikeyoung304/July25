# Naming Charter

**Version:** 1.0
**Last Updated:** 2025-10-18
**Owner:** Platform Team

## Principles

1. **Single Source of Truth (SSOT):** Each concept has ONE canonical name
2. **Explicit Over Defaults:** No implicit defaults; always specify role, scope, or context
3. **Lifecycle Management:** propose → adopt → deprecate → remove (with timeline)

## Naming Conventions

### Roles
- **Format:** Singular nouns (e.g., `customer`, `server`, NOT `customers`)
- **Scope:** Application-level identity (who the user is)
- **Examples:** `customer`, `server`, `manager`, `owner`, `kitchen`, `expo`

### Scopes
- **Format:** `resource:action` (kebab-case)
- **Examples:** `orders:create`, `menu:read`, `payments:process`
- **Avoid:** CamelCase (`ordersCreate`), underscores (`orders_create`)

### Routes
- **Format:** `/api/v1/kebab-case`
- **Examples:** `/api/v1/orders`, `/api/v1/menu-items`
- **Avoid:** Snake_case in URLs, camelCase in paths

### Events
- **Format:** `product.v1.resource.action` (dot-separated)
- **Examples:** `restaurant.v1.order.created`, `restaurant.v1.payment.completed`

## Deprecation Policy

When deprecating a name:
1. **Announce:** Document in CHANGELOG, ADR, and relevant docs
2. **Alias:** Provide backwards-compatible alias with deprecation warning (log WARN)
3. **Sunset:** Set removal date (minimum 30 days after zero usage)
4. **Remove:** Delete alias, update docs, create migration

**Example:** `kiosk_demo` → `customer` (v6.0.8)
- Announced: 2025-10-18
- Alias: `AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true`
- Sunset: 30 days after zero usage
- Removal: TBD (post-monitoring)

## See Also
- [LEXICON.md](./LEXICON.md) - Canonical term registry
- [ROLE_SCOPE_MATRIX.md](./ROLE_SCOPE_MATRIX.md) - Role-to-scope mappings
- [lexicon.json](./lexicon.json) - Machine-readable registry
