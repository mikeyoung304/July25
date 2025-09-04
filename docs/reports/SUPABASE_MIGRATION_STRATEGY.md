# Supabase RLS Migration Strategy
Generated: 2025-09-03

## The Hidden Iceberg

What started as a "floor plan save issue" is actually a systemic architectural problem that affects **EVERY database operation** in your application.

## 🔍 What We Found vs What's Actually Broken

### You Thought
- Floor plan saves are failing with RLS errors
- It's a tables-specific issue
- Quick fix needed for one feature

### Reality  
- **156+ database operations** use service key (100% of them)
- **0 operations** use user-scoped clients (0%)
- **5 different auth systems** fighting each other
- **2 roles** (Kitchen, Expo) have no Supabase identity
- **Customer role** uses fake tokens

## 🏗️ Why This Happened

### Original Sin: Demo-First Development
```typescript
// The path to hell:
1. Started with demo mode (no real auth needed)
2. Used service key for "quick development" 
3. Added RLS policies but never tested them
4. Built more features on broken foundation
5. Now RLS breaks everything
```

### Technical Debt Compound Interest
- Month 1: "We'll fix auth later" 
- Month 2: "Let's add PIN auth" (+1 auth system)
- Month 3: "Stations need auth too" (+1 auth system)  
- Month 4: "Kiosks need demo mode" (+1 auth system)
- Month 6: "Why doesn't RLS work?" (5 auth systems!)

## 🎯 Strategic Fix Approach

### Option A: Nuclear Option (Clean but Disruptive)
**Timeline**: 2-3 weeks  
**Approach**: Rip out all auth, rebuild with Supabase-first

✅ Pros:
- Clean architecture
- Fully RLS compliant
- Future-proof

❌ Cons:
- High risk of breaking changes
- Requires extensive testing
- Feature freeze during migration

### Option B: Surgical Strike (Recommended)
**Timeline**: 1-2 weeks  
**Approach**: Fix in layers, maintain compatibility

✅ Pros:
- Can deploy incrementally
- Lower risk
- Maintains backward compatibility

❌ Cons:
- Temporary dual-auth state
- More complex testing

### Option C: Proxy Pattern (Quick but Technical Debt)
**Timeline**: 3-4 days  
**Approach**: Create RLS-aware proxy service

✅ Pros:
- Fastest to implement
- No client changes needed
- Can deploy immediately

❌ Cons:
- Doesn't fix root cause
- Adds complexity
- Performance overhead

## 📐 Detailed Migration Plan (Option B - Recommended)

### Phase 1: Foundation (Day 1-2)
```typescript
// 1. Create middleware factory
export function withUserClient(requireAuth = true) {
  return async (req, res, next) => {
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      req.db = createUserClient(token);
    } else if (!requireAuth) {
      req.db = supabaseAnon; // For public endpoints
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };
}

// 2. Update ONE route as proof
router.get('/test', withUserClient(), async (req, res) => {
  const data = await req.db.from('tables').select();
  res.json(data);
});
```

### Phase 2: Critical Path (Day 3-5)
Fix in order of business impact:

1. **Orders** (Revenue critical)
   - `POST /orders` - Customer orders must work
   - `PUT /orders/:id/status` - Kitchen updates must work

2. **Payments** (Revenue critical)
   - `POST /payments/create` - Process payments
   - `GET /payments/:id` - Verify payment status

3. **Tables** (Current blocker)
   - `PUT /tables/batch` - Floor plan saves

### Phase 3: Role Fixes (Day 6-8)

#### Kitchen/Expo (Hardest)
```typescript
// Option 1: Service Accounts
async function createStationUser(type, name, restaurantId) {
  // Create a real Supabase user for the station
  const { user } = await supabase.auth.admin.createUser({
    email: `${type}-${name}@${restaurantId}.local`,
    password: generateSecurePassword(),
  });
  
  // Grant station role
  await supabase.from('user_restaurants').insert({
    user_id: user.id,
    restaurant_id: restaurantId,
    role: type, // 'kitchen' or 'expo'
  });
  
  return user;
}

// Option 2: Anonymous Auth
async function createStationSession(type, restaurantId) {
  // Use Supabase anonymous auth
  const { data } = await supabase.auth.signInAnonymously();
  
  // Store station metadata
  await supabase.from('station_sessions').insert({
    session_id: data.session.access_token,
    station_type: type,
    restaurant_id: restaurantId,
  });
  
  return data.session;
}
```

#### Customer/Kiosk
```typescript
// Replace demo JWT with anonymous Supabase session
async function createKioskSession(restaurantId) {
  // Sign in anonymously
  const { data, error } = await supabase.auth.signInAnonymously();
  
  // Set metadata for the session
  const { error: updateError } = await supabase.auth.updateUser({
    data: { 
      restaurant_id: restaurantId,
      role: 'customer',
      is_kiosk: true
    }
  });
  
  return data.session.access_token;
}
```

### Phase 4: Testing & Validation (Day 9-10)

#### RLS Compliance Test Suite
```typescript
describe('RLS Compliance', () => {
  it('should prevent cross-tenant access', async () => {
    const user1 = await createUser('restaurant-1');
    const user2 = await createUser('restaurant-2');
    
    // User 1 creates data
    const { data } = await asUser(user1)
      .from('orders')
      .insert({ restaurant_id: 'restaurant-1' });
    
    // User 2 shouldn't see it
    const { data: leaked } = await asUser(user2)
      .from('orders')
      .select()
      .eq('id', data.id);
    
    expect(leaked).toHaveLength(0);
  });
});
```

## 🚦 Migration Checkpoints

### Before Each Phase
- [ ] Database backup completed
- [ ] Rollback script prepared  
- [ ] Feature flags configured
- [ ] Error monitoring enhanced

### After Each Phase  
- [ ] Integration tests pass
- [ ] No 42501 errors in logs
- [ ] Performance metrics stable
- [ ] User reports verified

## 🔄 Rollback Plan

### Instant Rollback (if critical failure)
```sql
-- Break glass in emergency
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE tables DISABLE ROW LEVEL SECURITY;
-- Repeat for all affected tables
```

### Code Rollback
```typescript
// Feature flag in environment
if (process.env.USE_RLS === 'true') {
  router.use(withUserClient());
} else {
  router.use((req, res, next) => {
    req.db = supabase; // Service key fallback
    next();
  });
}
```

## 📊 Success Metrics

### Technical Metrics
- ✅ 0 service key usages in user routes
- ✅ 100% of operations use user context
- ✅ 0 RLS policy violations (42501 errors)
- ✅ All roles can perform their operations

### Business Metrics  
- ✅ No increase in failed orders
- ✅ No increase in payment failures
- ✅ Kitchen display continues working
- ✅ No customer complaints

## ⚠️ Gotchas We Found

### 1. The `auth.uid()` Trap
```sql
-- This ALWAYS returns NULL with service key
WHERE user_id = auth.uid()  

-- Even if you pass a user token in the query!
```

### 2. The Migration Order Matters
```
Wrong: Apply RLS → Fix code (💥 everything breaks)
Right: Fix code → Test → Apply RLS
```

### 3. The Anonymous Auth Gotcha
```typescript
// Anonymous sessions expire!
// Must handle renewal or data loss occurs
```

### 4. The WebSocket Problem
```typescript
// WebSockets maintain long connections
// Token refresh must be handled specially
```

## 🎓 Lessons for the Future

### 1. Never Use Service Keys for User Operations
Service keys are like root access - use only for:
- System initialization
- Scheduled jobs
- Admin operations

### 2. Design for RLS from Day 1
Even if disabled initially, structure code assuming RLS

### 3. One Auth System Only
Multiple auth systems = exponential complexity

### 4. Test with RLS Enabled
Development environment should match production

## 📞 When to Call for Help

### Red Flags
- Multiple 42501 errors after migration
- Performance degradation > 20%
- Any data leakage incidents
- Station displays stop working

### Supabase Support Tickets
Prepared templates for common issues:

1. "RLS policies blocking legitimate access"
2. "Anonymous auth session limits"  
3. "Performance impact of RLS policies"

## Final Thoughts

This isn't just a bug fix - it's a critical architectural correction that determines whether your application can scale securely. The service key shortcut saved time initially but created a security time bomb.

**The good news**: Your RLS policies exist and are well-designed. You just need to actually use them.

**The bad news**: Every database operation needs updating.

**The reality**: This is 1-2 weeks of focused work that will save you from a catastrophic security breach.

Start with Phase 1 today. Test one route. Prove the pattern. Then systematically migrate the rest.