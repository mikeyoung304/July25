# ADR-008: Slug-Based Restaurant Routing

**Date**: 2025-11-06
**Status**: ✅ ACCEPTED
**Last Updated:** 2025-11-06
**Authors**: Development Team

---

## Context

The Restaurant OS uses multi-tenant architecture where each restaurant is identified by a UUID. While UUIDs are excellent for database integrity and uniqueness, they create poor user experience in customer-facing URLs:

### Before
```
https://restaurantos.com/order/11111111-1111-1111-1111-111111111111
https://restaurantos.com/checkout/11111111-1111-1111-1111-111111111111
```

### Problems

1. **Poor UX**: Long, unmemorable URLs that look technical and intimidating to customers
2. **Brand Identity**: URLs don't reflect the restaurant's brand or name
3. **Marketing**: Difficult to communicate URLs verbally or in marketing materials
4. **Accessibility**: Screen readers struggle with long UUID strings
5. **SEO**: Search engines prefer meaningful, human-readable URLs

### Real-World Example

**User Request**: "can we make it say 'grow' instead of all the digits? how can we make it simpler and easier on customer eyes"

The restaurant "Grow Fresh Local Food" was accessible only via:
- `/order/11111111-1111-1111-1111-111111111111`

Customers expect:
- `/order/grow`

---

## Decision

**Implement slug-based routing with transparent UUID resolution.**

Add support for human-friendly slugs (e.g., "grow", "pizza-palace") while maintaining backward compatibility with UUID-based routing.

### Architecture

1. **Database**: Add `slug` column to `restaurants` table (already exists, unique constraint)
2. **Backend Middleware**: Create `slugResolver` middleware to transparently convert slugs to UUIDs
3. **Frontend**: Use slugs in URLs and environment configuration
4. **Caching**: In-memory cache with 5-minute TTL for performance

---

## Rationale

### Technical Advantages

1. **Backward Compatibility**: Existing UUID-based URLs continue to work
2. **Performance**: In-memory caching minimizes database queries
3. **Transparency**: Business logic sees UUIDs, customers see slugs
4. **Zero Breaking Changes**: Slug resolution happens at middleware layer
5. **Type Safety**: UUID validation remains strict for database operations

### Alternative Considered: Store Slugs Throughout

**Pros**:
- Simpler architecture (no resolution needed)
- Faster lookups (direct slug-based queries)

**Cons**:
- Requires migrating all existing UUID references
- Breaking changes to database schema
- Loss of UUID benefits (immutability, uniqueness guarantees)
- Migration timeline: 1-2 weeks vs 2 hours

**Verdict**: Rejected due to migration complexity and loss of UUID benefits. The middleware approach provides UX improvements without architectural disruption.

---

## Implementation

### Phase 1: Backend Middleware ✅ (2025-11-06)

**Files Changed**:

1. **server/src/middleware/slugResolver.ts** (NEW)
   - Created middleware to intercept `x-restaurant-id` header
   - UUID detection: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
   - In-memory cache with 5-minute TTL
   - Transparent slug-to-UUID resolution
   - Non-blocking error handling

2. **server/src/server.ts**
   - Registered `slugResolver` middleware after body parsing
   - Runs before all route handlers

3. **server/src/routes/restaurants.routes.ts**
   - Updated `GET /:id` to accept both UUID and slug in URL params
   - Conditional query: `eq('id', id)` for UUIDs, `eq('slug', id)` for slugs

### Phase 2: Frontend Configuration ✅ (2025-11-06)

**Files Changed**:

4. **Environment Variables** (4 files)
   - `.env`: `VITE_DEFAULT_RESTAURANT_ID=grow`
   - `.env.example`: Updated documentation
   - `.env.production`: Production configuration
   - `.env.vercel.production`: Vercel deployment configuration

5. **Client Fallbacks** (16 files)
   - Updated all hardcoded UUID fallbacks from `'11111111-1111-1111-1111-111111111111'` to `'grow'`
   - Files: `UnifiedCartContext.tsx`, `AppRoutes.tsx`, `RestaurantContext.tsx`, `api.ts`, `env.ts`, etc.

6. **E2E Tests**
   - `tests/e2e/checkout-smoke.spec.ts`: Updated `DEFAULT_RESTAURANT_ID = 'grow'`

### Phase 3: Database Update ✅ (2025-11-06)

```sql
UPDATE restaurants
SET slug = 'grow'
WHERE id = '11111111-1111-1111-1111-111111111111';
```

---

## Slug Resolution Flow

```
Customer Request: GET /order/grow
              ↓
Frontend: x-restaurant-id: grow
              ↓
slugResolver Middleware
  ├─ Is "grow" a UUID? No
  ├─ Check cache? Miss
  ├─ Query: SELECT id FROM restaurants WHERE slug = 'grow'
  ├─ Result: 11111111-1111-1111-1111-111111111111
  ├─ Cache result (5 min TTL)
  └─ Replace header: x-restaurant-id: 11111111-1111-1111-1111-111111111111
              ↓
Route Handlers (see UUID as always)
              ↓
Response to Customer
```

---

## Consequences

### Positive

- ✅ **UX**: Clean, memorable URLs (`/order/grow` instead of `/order/111...`)
- ✅ **Brand**: URLs reflect restaurant identity
- ✅ **Marketing**: Easy to share and communicate
- ✅ **SEO**: Search-engine friendly URLs
- ✅ **Performance**: Cached lookups minimize database queries
- ✅ **Backward Compatible**: UUID URLs still work
- ✅ **Type Safety**: UUID validation remains intact

### Negative

- ⚠️ **Cache Invalidation**: Slug changes require cache clear (5-minute max staleness)
- ⚠️ **Slug Uniqueness**: Database constraint enforces uniqueness (already exists)
- ⚠️ **Migration Complexity**: Changing slugs requires updating marketing materials

### Neutral

- Middleware adds minimal latency (~1ms for cache hit, ~50ms for DB query)
- Slug format validation needed (lowercase, hyphen-separated, no special chars)

---

## Validation & Testing

### Success Criteria ✅

**Immediate**:
- [x] Slug resolution middleware created
- [x] Backend routes support both UUID and slug
- [x] Frontend uses "grow" slug
- [x] Environment variables updated
- [x] E2E tests pass with slug
- [x] TypeScript build passes (0 errors)

**Production** (To verify after deployment):
- [ ] `/order/grow` loads correctly
- [ ] `/checkout/grow` works end-to-end
- [ ] Cache performs as expected
- [ ] No increase in database query load

---

## Rollback Strategy

If this decision needs to be reversed:

1. **Immediate Rollback**: Revert to commit before ADR-008 implementation
2. **Partial Rollback**:
   - Remove `slugResolver` middleware from server.ts
   - Revert environment variables to UUID
   - Frontend will fallback to UUID automatically

**Risk Assessment**: Low risk. Changes are additive and backward compatible.

---

## Related Documentation

- [ADR-002: Multi-Tenancy Architecture](./ADR-002-multi-tenancy-architecture.md) - Restaurant isolation
- [ADR-007: Per-Restaurant Configuration](./ADR-007-per-restaurant-configuration.md) - Restaurant settings
- [ENVIRONMENT.md](../../reference/config/ENVIRONMENT.md) - Environment variable configuration
- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) - System architecture overview

---

## Future Enhancements

### Potential Improvements

1. **Slug Validation**: Add middleware to validate slug format on creation
2. **Slug History**: Track slug changes for 301 redirects
3. **Custom Domains**: Support restaurant-specific domains (e.g., `order.growfreshfood.com`)
4. **Analytics**: Track slug usage patterns

---

## Lessons Learned

1. **UX Matters**: Technical correctness (UUIDs) shouldn't sacrifice user experience
2. **Middleware Pattern**: Transparent resolution preserves existing architecture
3. **Caching Strategy**: Simple in-memory cache sufficient for read-heavy operation
4. **Incremental Migration**: Backward compatibility enables gradual rollout

---

## Approval

This ADR was created to address customer UX concerns with long UUID-based URLs. The decision was validated through:

- Zero breaking changes (backward compatible)
- Successful E2E test execution with slug-based routing
- Minimal performance overhead with caching
- Alignment with web best practices for URL design

**Status**: ACCEPTED and IMPLEMENTED (2025-11-06)

---

**Revision History**:
- 2025-11-06: Initial version (v1.0)
