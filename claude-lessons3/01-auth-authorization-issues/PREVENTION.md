# Authentication & Authorization - Prevention Strategies

## 1. Required JWT Fields Validation

### Implementation

**File**: Create `/server/src/validators/jwt-validator.ts`

```typescript
interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  scope: string[];
  restaurant_id: string;
  auth_method: 'email' | 'pin' | 'station';
  iat: number;
  exp: number;
}

export function validateJWTPayload(decoded: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!decoded.sub) errors.push('Missing field: sub');
  if (!decoded.email) errors.push('Missing field: email');
  if (!decoded.role) errors.push('Missing field: role');
  if (!decoded.scope || !Array.isArray(decoded.scope)) {
    errors.push('Missing or invalid field: scope (must be array)');
  }
  if (!decoded.restaurant_id) errors.push('Missing field: restaurant_id');
  if (!decoded.iat) errors.push('Missing field: iat');
  if (!decoded.exp) errors.push('Missing field: exp');

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### Add to Auth Middleware

**File**: `/server/src/middleware/auth.ts:51-62`

```typescript
let decoded: any;
try {
  decoded = jwt.verify(token, jwtSecret) as any;

  // Validate JWT structure
  const validation = validateJWTPayload(decoded);
  if (!validation.isValid) {
    logger.error('JWT_STRUCTURE_INVALID', {
      errors: validation.errors,
      userId: decoded.sub
    });
    throw Unauthorized('Invalid token structure');
  }
} catch (error) {
  // ... existing error handling
}
```

### Test JWT Structure

**File**: `/server/src/__tests__/auth/jwt-structure.test.ts`

```typescript
describe('JWT Structure Validation', () => {
  it('should include all required fields', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password, restaurantId });

    // Validate response
    expect(response.status).toBe(200);

    // Decode and validate JWT structure
    const token = response.body.session.access_token;
    const decoded = jwt.decode(token);

    expect(decoded).toMatchObject({
      sub: expect.any(String),
      email: expect.stringMatching(/^.+@.+\..+$/),
      role: expect.any(String),
      scope: expect.any(Array),
      restaurant_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      auth_method: expect.stringMatching(/^(email|pin|station)$/),
      iat: expect.any(Number),
      exp: expect.any(Number)
    });

    // Verify response matches JWT
    expect(response.body.user.scopes).toEqual(decoded.scope);
    expect(response.body.restaurantId).toEqual(decoded.restaurant_id);
  });

  it('should reject JWT missing scope field', async () => {
    // Create JWT without scope
    const invalidPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      role: 'server',
      restaurant_id: '11111111-1111-1111-1111-111111111111'
      // Missing: scope field
    };

    const token = jwt.sign(invalidPayload, process.env.SUPABASE_JWT_SECRET);

    const response = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Invalid token structure');
  });
});
```

---

## 2. Middleware Chain Testing

### Test Template

**File**: `/server/src/__tests__/middleware/auth-chain.test.ts`

```typescript
describe('Middleware Chain', () => {
  describe('Protected Endpoint Order', () => {
    it('should enforce correct middleware order', async () => {
      // Mock middleware tracking
      const middlewareOrder: string[] = [];

      // Intercept middleware execution
      jest.spyOn(authMiddleware, 'authenticate')
        .mockImplementation((req, res, next) => {
          middlewareOrder.push('authenticate');
          next();
        });

      jest.spyOn(accessMiddleware, 'validateRestaurantAccess')
        .mockImplementation((req, res, next) => {
          middlewareOrder.push('validateRestaurantAccess');
          next();
        });

      jest.spyOn(rbacMiddleware, 'requireScopes')
        .mockImplementation(() => (req, res, next) => {
          middlewareOrder.push('requireScopes');
          next();
        });

      // Make request
      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .send(orderData);

      // Verify order
      expect(middlewareOrder).toEqual([
        'authenticate',
        'validateRestaurantAccess',
        'requireScopes'
      ]);
    });

    it('should fail if validateRestaurantAccess runs before authenticate', async () => {
      // Test vulnerability from commit 38f7bba0
      // This should be caught by route definition review
    });
  });

  describe('Restaurant Access Validation', () => {
    it('should prevent cross-tenant access', async () => {
      // User from Restaurant A
      const userAToken = await createToken({
        userId: 'user-a',
        restaurantId: RESTAURANT_A_ID
      });

      // Try to access Restaurant B orders
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('X-Restaurant-ID', RESTAURANT_B_ID);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied to this restaurant');
    });
  });
});
```

---

## 3. Environment Parity Checks

### Pre-Commit Hook

**File**: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check if auth files changed
AUTH_FILES=$(git diff --cached --name-only | grep -E "AuthContext|auth\.routes|auth\.middleware|auth\.ts")

if [ -n "$AUTH_FILES" ]; then
  echo "  Authentication files changed!"
  echo ""
  echo "BEFORE COMMITTING:"
  echo "1. Set STRICT_AUTH=true in server/.env"
  echo "2. Test login flow locally"
  echo "3. Check JWT structure with: npm run test:auth"
  echo ""

  # Check if STRICT_AUTH is set in .env
  if grep -q "STRICT_AUTH=false" server/.env 2>/dev/null; then
    echo " ERROR: STRICT_AUTH=false in server/.env"
    echo "   Change to STRICT_AUTH=true and test before committing"
    exit 1
  fi

  if ! grep -q "STRICT_AUTH=true" server/.env 2>/dev/null; then
    echo "  WARNING: STRICT_AUTH not found in server/.env"
    echo "   Add 'STRICT_AUTH=true' and test before committing"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
fi

# Run other pre-commit checks
npm run typecheck:quick
```

### CI/CD Environment Check

**File**: `.github/workflows/auth-validation.yml`

```yaml
name: Auth Validation

on:
  pull_request:
    paths:
      - 'server/src/middleware/auth.ts'
      - 'server/src/routes/auth.routes.ts'
      - 'client/src/contexts/AuthContext.tsx'

jobs:
  validate-auth:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Validate JWT structure in tests
        run: npm run test:auth:jwt-structure

      - name: Test with STRICT_AUTH=true
        env:
          STRICT_AUTH: true
          SUPABASE_JWT_SECRET: ${{ secrets.SUPABASE_JWT_SECRET }}
        run: npm run test:auth

      - name: Verify no Supabase direct auth
        run: |
          if grep -r "supabase.auth.signInWithPassword" client/src/contexts/; then
            echo " ERROR: Found supabase.auth.signInWithPassword in AuthContext"
            echo "   Use POST /api/v1/auth/login instead"
            exit 1
          fi

      - name: Check middleware ordering
        run: npm run test:middleware-order
```

### Environment Validation Script

**File**: `/scripts/validate-auth-env.js`

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function validateEnvironment() {
  const envPath = path.join(__dirname, '../server/.env');

  if (!fs.existsSync(envPath)) {
    console.error(' server/.env not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const errors = [];
  const warnings = [];

  // Check STRICT_AUTH
  if (!envContent.includes('STRICT_AUTH=true')) {
    if (envContent.includes('STRICT_AUTH=false')) {
      errors.push('STRICT_AUTH=false (should be true for production parity)');
    } else {
      warnings.push('STRICT_AUTH not set (defaults to false)');
    }
  }

  // Check required secrets
  if (!envContent.includes('SUPABASE_JWT_SECRET=')) {
    errors.push('SUPABASE_JWT_SECRET not set');
  }

  if (!envContent.includes('KIOSK_JWT_SECRET=')) {
    errors.push('KIOSK_JWT_SECRET not set');
  }

  // Report results
  if (errors.length > 0) {
    console.error(' Environment validation failed:');
    errors.forEach(err => console.error(`   - ${err}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('  Warnings:');
    warnings.forEach(warn => console.warn(`   - ${warn}`));
  }

  console.log(' Environment validation passed');
}

validateEnvironment();
```

**Add to package.json**:

```json
{
  "scripts": {
    "validate:auth-env": "node scripts/validate-auth-env.js"
  }
}
```

---

## 4. Proper Implementation Examples

### Login Endpoint (Complete)

**File**: `/server/src/routes/auth.routes.ts`

```typescript
router.post('/login',
  authRateLimiters.login,
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, restaurantId } = req.body;

    // 1. Validate input
    if (!email || !password) {
      throw BadRequest('Email and password are required');
    }
    if (!restaurantId) {
      throw BadRequest('Restaurant ID is required');
    }

    // 2. Authenticate with Supabase
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      throw Unauthorized('Invalid email or password');
    }

    // 3. Verify restaurant access
    const { data: userRole, error: roleError } = await supabase
      .from('user_restaurants')
      .select('role')
      .eq('user_id', authData.user.id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (roleError || !userRole) {
      throw Unauthorized('No access to this restaurant');
    }

    // 4. Fetch scopes BEFORE JWT creation
    const { data: scopesData, error: scopesError } = await supabase
      .from('role_scopes')
      .select('scope')
      .eq('role', userRole.role);

    if (scopesError) {
      logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
    }

    const scopes = scopesData?.map(s => s.scope) || [];

    // 5. Create JWT with ALL required fields
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const payload = {
      sub: authData.user.id,
      email: authData.user.email,
      role: userRole.role,
      restaurant_id: restaurantId,
      scope: scopes,  //  Required for RBAC
      auth_method: 'email',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
    };

    const accessToken = jwt.sign(payload, jwtSecret);
    const refreshToken = jwt.sign(
      { sub: authData.user.id, type: 'refresh' },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // 6. Log successful login
    await supabase
      .from('auth_logs')
      .insert({
        user_id: authData.user.id,
        restaurant_id: restaurantId,
        event_type: 'login_success',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

    // 7. Return response
    res.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userRole.role,
        scopes  // Include in response for debugging
      },
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 8 * 60 * 60,
        token_type: 'Bearer'
      },
      restaurantId
    });
  } catch (error) {
    next(error);
  }
});
```

### Frontend Login (Complete)

**File**: `/client/src/contexts/AuthContext.tsx`

```typescript
const login = async (email: string, password: string, restaurantId: string) => {
  try {
    // 1. Resolve slug to UUID (hardcoded)
    const GROW_RESTAURANT_UUID = '11111111-1111-1111-1111-111111111111';
    const resolvedRestaurantId = restaurantId === 'grow'
      ? GROW_RESTAURANT_UUID
      : restaurantId;

    // 2. Call custom auth endpoint
    const response = await httpClient.post<{
      user: User;
      session: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
      restaurantId: string;
    }>('/api/v1/auth/login', {
      email,
      password,
      restaurantId: resolvedRestaurantId
    });

    // 3. Create session object
    const sessionData = {
      accessToken: response.session.access_token,
      refreshToken: response.session.refresh_token,
      expiresIn: response.session.expires_in,
      expiresAt: Date.now() / 1000 + response.session.expires_in
    };

    // 4. Store in localStorage (for httpClient)
    localStorage.setItem('auth_session', JSON.stringify({
      user: response.user,
      session: sessionData,
      restaurantId: response.restaurantId
    }));

    // 5. Sync with Supabase (for Realtime)
    await supabase.auth.setSession({
      access_token: response.session.access_token,
      refresh_token: response.session.refresh_token
    });

    // 6. Update React state
    setUser(response.user);
    setSession(sessionData);
    setRestaurantId(response.restaurantId);

    // 7. Sync httpClient global state
    setCurrentRestaurantId(response.restaurantId);

    logger.info('Login successful', {
      userId: response.user.id,
      role: response.user.role,
      restaurantId: response.restaurantId
    });

    return response.user;
  } catch (error) {
    logger.error('Login failed', error);
    throw error;
  }
};
```

### Protected Route (Complete)

**File**: `/server/src/routes/orders.routes.ts`

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateRestaurantAccess } from '../middleware/restaurantAccess';
import { requireScopes } from '../middleware/rbac';

const router = Router();

// CORRECT middleware order
router.post('/orders',
  authenticate,                    // 1. Validate JWT, set req.user
  validateRestaurantAccess,        // 2. Verify restaurant access
  requireScopes(['orders:create']), // 3. Check permission
  async (req, res, next) => {
    try {
      // req.user - authenticated user
      // req.restaurantId - validated restaurant ID
      // req.user.scopes - permission scopes

      const order = await createOrder({
        ...req.body,
        restaurant_id: req.restaurantId,  // Guaranteed to be validated
        created_by: req.user.id
      });

      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

---

## 5. Testing Checklist

### Before Committing Auth Changes

- [ ] JWT includes all required fields (sub, email, role, scope, restaurant_id)
- [ ] Scopes fetched BEFORE JWT creation
- [ ] Middleware order correct (authenticate → validateRestaurantAccess → requireScopes)
- [ ] localStorage session stored after login
- [ ] React state and httpClient synced
- [ ] STRICT_AUTH=true tested locally
- [ ] All auth tests passing
- [ ] No Supabase direct auth in workspace login

### Run These Commands

```bash
# Validate environment
npm run validate:auth-env

# Test JWT structure
npm run test -- auth/jwt-structure

# Test with STRICT_AUTH=true
STRICT_AUTH=true npm run test:server

# Test middleware chain
npm run test -- middleware/auth-chain

# Full auth test suite
npm run test:auth

# Integration tests
npm run test:e2e -- auth
```

---

## 6. Monitoring & Alerts

### Metrics to Track

```yaml
# Prometheus/Grafana metrics

auth_failures_total:
  description: Total authentication failures
  labels: [reason, endpoint]
  alert_threshold: > 10 per minute

jwt_validation_errors_total:
  description: JWT structure validation failures
  labels: [missing_field]
  alert_threshold: > 0

strict_auth_rejections_total:
  description: Tokens rejected by STRICT_AUTH
  labels: [user_id]
  alert_threshold: > 5 per hour

cross_tenant_access_attempts_total:
  description: Attempts to access other restaurants
  labels: [user_id, requested_restaurant_id]
  alert_threshold: > 0
```

### Alert Configuration

```yaml
# alerts/auth-alerts.yml

- alert: JWTStructureInvalid
  expr: jwt_validation_errors_total > 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: JWT tokens missing required fields
    description: Check auth endpoint JWT creation logic

- alert: StrictAuthRejections
  expr: rate(strict_auth_rejections_total[5m]) > 0.1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: Tokens being rejected by STRICT_AUTH
    description: Check if clients using Supabase direct auth

- alert: CrossTenantAccess
  expr: cross_tenant_access_attempts_total > 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: Potential multi-tenancy security breach
    description: Investigate user attempting cross-tenant access
```

---

## Prevention Checklist Summary

### Before Every Deployment

- [ ] Environment parity verified (STRICT_AUTH=true)
- [ ] JWT structure validated in tests
- [ ] Middleware order correct
- [ ] Cross-tenant access tests passing
- [ ] Auth integration tests passing
- [ ] Pre-commit hooks passing
- [ ] CI/CD auth validation passing

### Code Review Checklist

- [ ] No Supabase direct auth for workspace login
- [ ] JWT created with all required fields
- [ ] Scopes fetched before JWT creation
- [ ] localStorage session stored after login
- [ ] React state and httpClient synced
- [ ] Middleware order correct
- [ ] No test tokens in production paths
- [ ] Multi-tenancy validation enforced

### Post-Deployment Monitoring

- [ ] Auth success rate > 99.5%
- [ ] JWT validation errors = 0
- [ ] STRICT_AUTH rejections = 0
- [ ] Cross-tenant access attempts = 0
- [ ] No authentication loops reported

---

**Related**: [PATTERNS.md](./PATTERNS.md), [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
