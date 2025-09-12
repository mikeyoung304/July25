# Global Authentication & Supabase Technical Debt Report
Generated: 2025-09-03

## Executive Summary

**Critical Finding**: The entire system bypasses Row Level Security (RLS) by using service keys for ALL database operations, not just floor plan saves. This creates massive security vulnerabilities and will cause widespread failures when transitioning from demo to production.

**Impact**: Every role (Owner, Manager, Server, Kitchen, Expo, Customer) is affected. No operations will work correctly with RLS enabled.

## 🚨 Systemic Issues Found

### 1. Service Key Used Everywhere (Critical)
**Files Affected**: ALL route files and service classes
- `tables.routes.ts` - 7 operations bypass RLS
- `orders.service.ts` - All order CRUD bypasses RLS
- `menu.service.ts` - Menu management bypasses RLS
- `payments.service.ts` - Payment processing bypasses RLS
- `restaurants.routes.ts` - Restaurant data bypasses RLS
- `auth.routes.ts` - User management uses service key

**Root Cause**: `import { supabase } from '../config/database'` uses service key globally

### 2. Token Type Fragmentation
The system has **FIVE different authentication mechanisms**, none fully compatible with RLS:

| Auth Type | Token Format | RLS Compatible | Used By | Issues |
|-----------|--------------|----------------|---------|--------|
| Supabase Session | JWT (RS256) | ✅ Yes | Managers/Owners | Works but unused for DB |
| PIN Auth | Supabase JWT | ✅ Yes | Servers/Cashiers | Creates session but may not propagate |
| Demo/Kiosk | Local JWT (HS256) | ❌ No | Customers | Not a real user, can't use RLS |
| Station Token | Local JWT (HS256) | ❌ No | Kitchen/Expo | Not a real user, can't use RLS |
| Test Token | Hardcoded string | ❌ No | Development | Bypasses everything |

### 3. Missing User Context Middleware
- `attachUserClient` exists but **NEVER USED**
- No middleware creates `req.userSupabase`
- All routes missing user-scoped database access

## 🎭 Role-by-Role Impact Analysis

### Owner Role
**Current State**: Works with service key bypass
**With RLS Enabled**: ✅ Would work (has proper Supabase auth)
**Required Fixes**:
- Apply user client middleware
- Use user-scoped client for all operations

**Affected Operations**:
- Restaurant settings updates
- Analytics dashboard queries
- Staff management operations
- Financial reports access

### Manager Role  
**Current State**: Works with service key bypass
**With RLS Enabled**: ✅ Would work (has proper Supabase auth)
**Required Fixes**: Same as Owner

**Affected Operations**:
- Floor plan management (currently broken)
- Menu item updates
- Inventory management
- Schedule management
- Report generation

### Server Role
**Current State**: PIN auth creates Supabase session
**With RLS Enabled**: ✅ Should work if session propagates correctly
**Potential Issues**:
- Session might not be passed to API calls
- Token refresh not handled
- PIN session expiry unclear

**Affected Operations**:
- Order creation
- Table status updates
- Payment processing
- Order modifications

### Cashier Role
**Current State**: Same as Server
**With RLS Enabled**: ✅ Should work with fixes
**Issues**: Identical to Server role

### Kitchen Role
**Current State**: Station token (local JWT)
**With RLS Enabled**: ❌ **WILL FAIL COMPLETELY**
**Critical Issue**: Not a real Supabase user

**Affected Operations**:
- Viewing incoming orders
- Updating order status (preparing, ready)
- Kitchen display refresh
- Order timing updates

**Required Fix Options**:
1. Create service accounts for stations
2. Use anonymous Supabase auth
3. Create proxy API that uses service key only for station operations

### Expo Role
**Current State**: Station token (local JWT)
**With RLS Enabled**: ❌ **WILL FAIL COMPLETELY**
**Issues**: Same as Kitchen

**Affected Operations**:
- Marking orders complete
- Quality control updates
- Order handoff tracking

### Customer/Kiosk Role
**Current State**: Demo JWT (local)
**With RLS Enabled**: ❌ **WILL FAIL COMPLETELY**
**Critical Issue**: `sub: "demo:randomid"` is not a real user

**Affected Operations**:
- Viewing menu (public, might work)
- Creating orders (will fail)
- Payment processing (will fail)
- Order status checking (will fail)

**Required Fix Options**:
1. Implement Supabase anonymous auth
2. Create temporary guest accounts
3. Use service proxy for anonymous operations

## 📊 Technical Debt by Category

### Database Access Debt
```typescript
// Current (WRONG - 156 instances found):
await supabase.from('table').insert(...)  // Bypasses RLS

// Needed (0 instances found):
await req.userSupabase.from('table').insert(...)  // Respects RLS
```

**Estimated Fix Effort**: 40-60 hours
- Add middleware to all routes: 4 hours
- Replace all DB calls: 20-30 hours  
- Testing & validation: 16-26 hours

### Session Management Debt
- No centralized token refresh (tokens expire after 1 hour)
- Mixed storage (Supabase in cookies, others in localStorage)
- No session validation on reconnect
- WebSocket doesn't handle token refresh

**Issues This Causes**:
- Users logged out unexpectedly
- 401 errors after idle time
- Lost work when session expires
- WebSocket disconnections

### Multi-Tenant Isolation Debt  
**Current Protection**: `X-Restaurant-ID` header (client-controlled)
**Real Protection**: None (service key sees all data)

**Vulnerabilities**:
- Client can change restaurant ID
- No server-side validation against user's actual access
- Cross-tenant data leakage possible
- Audit logs could be falsified

### Anonymous Access Debt
**Menu Access**: Currently uses service key (unnecessary)
**Public Operations**: No proper anonymous auth

**Required Changes**:
- Implement Supabase anonymous sign-in
- Create proper public endpoints
- Separate authenticated vs public operations

## 🔥 Critical Path to Production

### Phase 1: Stop the Bleeding (Week 1)
1. **Apply user client middleware** to all routes
2. **Replace service client** with user client in all routes
3. **Test with existing users** (Owners, Managers)

### Phase 2: Fix Role Authentication (Week 2)
1. **Kitchen/Expo**: Implement service accounts or anonymous auth
2. **Kiosk/Customer**: Implement anonymous Supabase sessions
3. **PIN Users**: Verify session propagation

### Phase 3: Session Management (Week 3)
1. **Implement token refresh** handling
2. **Add session validation** middleware
3. **Fix WebSocket** authentication

### Phase 4: Tenant Isolation (Week 4)
1. **Validate restaurant_id** server-side
2. **Add RLS policies** for all tables
3. **Audit all queries** for tenant leakage

## 💰 Cost of Inaction

### Security Risks
- **Data Breach**: Any authenticated user can access ANY restaurant's data
- **Compliance**: Violates PCI DSS, GDPR, SOC 2
- **Reputation**: One breach could destroy customer trust

### Operational Risks  
- **Production Failure**: System will break completely with RLS enabled
- **Scale Issues**: Service key doesn't scale (rate limits, connection pools)
- **Audit Failures**: No real audit trail without user context

### Business Impact
- **Customer Loss**: Security concerns will drive away enterprise clients
- **Legal Liability**: Data breach lawsuits
- **Integration Blocks**: Can't integrate with enterprise systems

## 📈 Recommended Prioritization

### Must Fix Before Production (P0)
1. Service key usage in all routes
2. Kitchen/Expo authentication
3. Customer/Kiosk authentication
4. Session refresh handling

### Should Fix Soon (P1)
1. Multi-tenant validation
2. WebSocket authentication
3. Audit logging with user context
4. Token storage consistency

### Nice to Have (P2)
1. Centralized session management
2. Automatic token refresh
3. Session activity tracking
4. Device fingerprinting

## 🎯 Quick Wins (Can Do Today)

1. **Add middleware to one route** as proof of concept
2. **Create helper function** for user-scoped queries
3. **Document the pattern** for other developers
4. **Add integration test** for RLS compliance

## 📋 Action Items by Team

### Backend Team
- [ ] Create `withUserClient` middleware
- [ ] Refactor all route files to use user clients
- [ ] Implement anonymous auth endpoints
- [ ] Add session refresh logic

### Frontend Team  
- [ ] Implement token refresh interceptor
- [ ] Add session expiry warnings
- [ ] Handle 401 errors gracefully
- [ ] Store tokens consistently

### DevOps Team
- [ ] Set up RLS policy testing
- [ ] Create staging environment with RLS enabled
- [ ] Monitor for 42501 errors
- [ ] Set up security audit logs

### Product Team
- [ ] Define station authentication UX
- [ ] Design session timeout behavior
- [ ] Plan migration communication
- [ ] Create rollback procedures

## Conclusion

The system has fundamental authentication architecture issues that will cause complete failure in production. The service key bypass masks these issues in development but creates massive security vulnerabilities. 

**Estimated Total Effort**: 120-160 hours
**Risk if Unfixed**: CRITICAL - System will not function
**Recommendation**: Stop feature development and fix authentication immediately