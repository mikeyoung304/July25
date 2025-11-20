# Prevention & Solutions - Security Best Practices

This document details the solutions, prevention measures, and best practices implemented to prevent recurrence of security vulnerabilities.

## Table of Contents

1. [Proper Middleware Chains](#proper-middleware-chains)
2. [Environment Guards for Dev Features](#environment-guards-for-dev-features)
3. [JWT Validation at Startup](#jwt-validation-at-startup)
4. [Two-Phase Audit Logging](#two-phase-audit-logging)
5. [Pre-Commit Secret Scanning](#pre-commit-secret-scanning)
6. [Multi-Tenancy Validation](#multi-tenancy-validation)
7. [Rate Limiting Configuration](#rate-limiting-configuration)

---

## Proper Middleware Chains

### Problem Solved
Multi-tenancy access control vulnerability where `req.restaurantId` was set from untrusted headers before validation.

### Solution: Strict Middleware Ordering

```typescript
//  CORRECT: Proper middleware chain
import { authenticate } from './middleware/auth';
import { validateRestaurantAccess } from './middleware/restaurantAccess';
import { requireScope } from './middleware/rbac';
import { errorHandler } from './middleware/errorHandler';

// Global middleware (applied to all routes)
app.use(express.json());
app.use(cors(corsOptions));
app.use(csrfMiddleware());

// Route-specific middleware chains
app.use('/api/v1/orders',
  authenticate,                   // 1. Verify JWT, extract user
  validateRestaurantAccess,       // 2. Validate restaurant access
  requireScope(['orders:read']),  // 3. Check RBAC permissions
  orderRoutes                     // 4. Business logic
);

app.use('/api/v1/payments',
  authenticate,
  validateRestaurantAccess,
  requireScope(['payments:create']),
  paymentRoutes
);

// Error handler MUST be last
app.use(errorHandler);
```

### Middleware Responsibilities

**1. authenticate**:
- Verify JWT signature
- Extract user from token
- Populate `req.user` with trusted data
- DO NOT set `req.restaurantId`

**2. validateRestaurantAccess**:
- Get requested restaurant from header
- Query database to verify user access
- ONLY set `req.restaurantId` after validation
- Set `req.restaurantRole` for fine-grained permissions

**3. requireScope**:
- Check RBAC scopes from JWT
- Verify user has required permissions
- Support wildcard scopes (`*`)

**4. errorHandler**:
- Catch all errors
- Format error responses
- Log errors for monitoring
- MUST be last middleware

### Testing Middleware Chains

```typescript
describe('Middleware Chain', () => {
  it('should execute in correct order', async () => {
    const calls: string[] = [];

    const mockAuth = (req, res, next) => {
      calls.push('auth');
      req.user = { id: 'user-123' };
      next();
    };

    const mockValidate = (req, res, next) => {
      calls.push('validate');
      req.restaurantId = 'restaurant-123';
      next();
    };

    const mockBusiness = (req, res) => {
      calls.push('business');
      res.json({ success: true });
    };

    app.use('/test', mockAuth, mockValidate, mockBusiness);

    await request(app).get('/test');

    expect(calls).toEqual(['auth', 'validate', 'business']);
  });
});
```

### Checklist for New Routes

- [ ] Authenticate first (JWT verification)
- [ ] Validate restaurant access second
- [ ] Check RBAC permissions third
- [ ] Business logic last
- [ ] Error handler after all routes
- [ ] Test with cross-tenant scenarios

---

## Environment Guards for Dev Features

### Problem Solved
Test-token authentication bypass working in production/Render environments.

### Solution: Multi-Flag Environment Detection

```typescript
/**
 * Determine if we're in TRUE local development
 * Must check NODE_ENV AND verify not on deployment platforms
 */
export function isLocalDevelopment(): boolean {
  return process.env['NODE_ENV'] === 'development'
    && process.env['RENDER'] !== 'true'
    && process.env['VERCEL'] !== '1'
    && process.env['HEROKU'] !== 'true'
    && !process.env['AWS_EXECUTION_ENV'];
}

// Use in guards
const isDev = isLocalDevelopment();
```

### Application in Auth Middleware

```typescript
export async function authenticate(req: AuthenticatedRequest, ...): Promise<void> {
  const token = authHeader.substring(7);

  // Test tokens ONLY in local development
  if (isLocalDevelopment() && token === 'test-token') {
    logger.warn(' Test-token used (local dev only)', {
      path: req.path,
      ip: req.ip
    });
    req.user = {
      id: 'test-admin',
      email: 'admin@test.com',
      role: 'admin',
      scopes: ['*']
    };
    return next();
  }

  // Production: Only JWT verification (no bypasses)
  const jwtSecret = config.supabase.jwtSecret;
  if (!jwtSecret) {
    logger.error('⛔ JWT_SECRET not configured');
    throw new Error('Server authentication not configured');
  }

  const decoded = jwt.verify(token, jwtSecret);
  // ...
}
```

### Application in Rate Limiting

```typescript
export const aiServiceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isLocalDevelopment() ? 100 : 50,
  skip: (_req: Request) => isLocalDevelopment(),
  handler: (req, res) => {
    console.error(`[RATE_LIMIT] AI service limit exceeded for ${req.ip}`);
    res.status(429).json({
      error: 'Too many AI requests. Please wait 5 minutes.',
      retryAfter: 300
    });
  }
});
```

### Platform Detection Reference

| Platform | Environment Variable | Value |
|----------|---------------------|-------|
| Render | `RENDER` | `"true"` |
| Vercel | `VERCEL` | `"1"` |
| Heroku | `HEROKU` | `"true"` |
| AWS Lambda | `AWS_EXECUTION_ENV` | (any value) |
| Local Dev | (none of above) | - |

### Testing Environment Guards

```typescript
describe('Environment Guards', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should detect local development', () => {
    process.env['NODE_ENV'] = 'development';
    delete process.env['RENDER'];
    delete process.env['VERCEL'];

    expect(isLocalDevelopment()).toBe(true);
  });

  it('should NOT detect Render as local dev', () => {
    process.env['NODE_ENV'] = 'development';
    process.env['RENDER'] = 'true';

    expect(isLocalDevelopment()).toBe(false);
  });

  it('should reject test-token on production platforms', async () => {
    process.env['NODE_ENV'] = 'development';
    process.env['RENDER'] = 'true';

    const response = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', 'Bearer test-token')
      .expect(401);

    expect(response.body.error).toContain('Invalid token');
  });
});
```

---

## JWT Validation at Startup

### Problem Solved
Missing or invalid JWT secrets allowed server to start without proper authentication configured.

### Solution: Comprehensive Startup Validation

```typescript
/**
 * Validate environment configuration before server starts
 * Throws errors for missing/invalid configuration
 */
export function validateEnvironment(): void {
  try {
    validateEnv(); // Basic env validation

    // JWT_SECRET is critical for authentication - required in all environments
    if (!env.SUPABASE_JWT_SECRET) {
      throw new Error(
        'SUPABASE_JWT_SECRET is required for authentication.\n' +
        'This secret is used to verify JWT tokens from Supabase.\n' +
        'Find it in your Supabase Dashboard: Settings > API > JWT Secret\n' +
        'It should be a base64-encoded string (~88 characters).'
      );
    }

    // Validate JWT_SECRET format (should be base64, typically ~88 characters)
    const jwtSecret = env.SUPABASE_JWT_SECRET.trim();
    if (jwtSecret.length < 32) {
      throw new Error(
        'SUPABASE_JWT_SECRET appears invalid: too short (expected ~88 characters).\n' +
        'Ensure you copied the full JWT Secret from Supabase Dashboard.'
      );
    }

    // Check for base64 format (warning, not error)
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(jwtSecret)) {
      logger.warn(
        '  SUPABASE_JWT_SECRET format warning: expected base64-encoded string.\n' +
        'If authentication fails, verify the JWT Secret from Supabase Dashboard.'
      );
    }

    // Validate other critical secrets
    if (!env.KIOSK_JWT_SECRET) {
      throw new Error('KIOSK_JWT_SECRET is required for kiosk authentication');
    }

    if (!env.PIN_PEPPER) {
      throw new Error('PIN_PEPPER is required for PIN authentication');
    }

    if (!env.DEVICE_FINGERPRINT_SALT) {
      throw new Error('DEVICE_FINGERPRINT_SALT is required for device security');
    }

    // Validate Square configuration (production only)
    if (env.NODE_ENV === 'production' && !isLocalDevelopment()) {
      if (!env.SQUARE_ACCESS_TOKEN || env.SQUARE_ACCESS_TOKEN === 'demo') {
        throw new Error('SQUARE_ACCESS_TOKEN is required for payment processing in production');
      }

      if (env.SQUARE_ENVIRONMENT === 'production' && !env.SQUARE_ACCESS_TOKEN.startsWith('EAAA')) {
        logger.warn('  Square production mode enabled but using sandbox token!');
      }
    }

    // OpenAI validation (with degraded mode option)
    if (env.NODE_ENV !== 'development' && !env.AI_DEGRADED_MODE && !env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required in production. Set AI_DEGRADED_MODE=true to use stubs.');
    }

    if (!env.OPENAI_API_KEY) {
      logger.warn('  OpenAI API key not configured - AI features will use stub implementations');
    } else {
      logger.info(' OpenAI configured');
    }

    logger.info(' JWT authentication configured');
    logger.info(' Environment validation complete');

  } catch (error) {
    logger.error(' Environment validation failed:', error);
    throw new Error(`Environment validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Call at server startup BEFORE listening
try {
  validateEnvironment();
} catch (error) {
  logger.error('Server cannot start due to configuration errors:', error);
  process.exit(1);
}

const PORT = env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(` Server listening on port ${PORT}`);
});
```

### Configuration Validation Levels

**Level 1: Required (Fail-Fast)**
- SUPABASE_JWT_SECRET
- KIOSK_JWT_SECRET
- PIN_PEPPER
- DEVICE_FINGERPRINT_SALT
- SQUARE_ACCESS_TOKEN (production)

**Level 2: Format Validation (Fail-Fast)**
- JWT secret length (minimum 32 characters)
- Base64 format check
- Square token format (EAAA prefix for production)

**Level 3: Warnings (Continue)**
- Missing OpenAI key (with degraded mode)
- Square environment mismatch
- Unexpected configuration values

### Testing Startup Validation

```typescript
describe('Startup Validation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should throw if SUPABASE_JWT_SECRET is missing', () => {
    delete process.env['SUPABASE_JWT_SECRET'];
    expect(() => validateEnvironment()).toThrow('SUPABASE_JWT_SECRET is required');
  });

  it('should throw if JWT_SECRET is too short', () => {
    process.env['SUPABASE_JWT_SECRET'] = 'short';
    expect(() => validateEnvironment()).toThrow('too short');
  });

  it('should warn if JWT_SECRET is not base64', () => {
    process.env['SUPABASE_JWT_SECRET'] = 'not-base64-but-long-enough-for-validation-test';
    validateEnvironment();
    // Check logger.warn was called
  });

  it('should throw if Square token is demo in production', () => {
    process.env['NODE_ENV'] = 'production';
    process.env['SQUARE_ACCESS_TOKEN'] = 'demo';
    expect(() => validateEnvironment()).toThrow('Cannot use demo Square token');
  });
});
```

---

## Two-Phase Audit Logging

### Problem Solved
Payment audit logging happened after Square payment processing, allowing charged-but-unrecorded scenarios.

### Solution: Log Before Action, Update After

```typescript
/**
 * Two-Phase Audit Logging Pattern
 * Phase 1: Log BEFORE external API call (status: 'initiated')
 * Phase 2: Update AFTER external API call (status: 'success' or 'failed')
 */

// Phase 1: Log payment attempt BEFORE Square API call
export async function logPaymentAttempt(data: PaymentAuditLog): Promise<void> {
  const auditLog = {
    id: randomUUID(),
    order_id: data.orderId,
    restaurant_id: data.restaurantId,
    amount: data.amount,
    status: data.status, // 'initiated', 'success', 'failed'
    payment_id: data.paymentId,
    payment_method: data.paymentMethod,
    idempotency_key: data.idempotencyKey,
    user_id: data.userId,
    ip_address: data.ipAddress,
    user_agent: data.userAgent,
    metadata: data.metadata,
    error_code: data.errorCode,
    error_detail: data.errorDetail,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('payment_audit_logs')
      .insert(auditLog);

    if (error) {
      logger.error('CRITICAL: Payment audit log failed', {
        orderId: data.orderId,
        status: data.status,
        error
      });
      // FAIL-FAST: Per ADR-009, audit log failures MUST block payment
      throw new Error('Payment processing unavailable - audit system failure');
    }

    logger.info('Payment audit logged', {
      orderId: data.orderId,
      status: data.status,
      idempotencyKey: data.idempotencyKey
    });
  } catch (dbError) {
    logger.error('CRITICAL: Database error storing payment audit', {
      orderId: data.orderId,
      error: dbError
    });
    throw new Error('Payment processing unavailable - audit system failure');
  }
}

// Phase 2: Update audit log status AFTER processing
export async function updatePaymentAuditStatus(
  idempotencyKey: string,
  status: 'success' | 'failed',
  paymentId?: string,
  errorCode?: string,
  errorDetail?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('payment_audit_logs')
      .update({
        status,
        payment_id: paymentId,
        error_code: errorCode,
        error_detail: errorDetail,
        updated_at: new Date().toISOString()
      })
      .eq('idempotency_key', idempotencyKey);

    if (error) {
      logger.error('CRITICAL: Failed to update payment audit status', {
        idempotencyKey,
        status,
        error
      });
      // STILL fail-fast - incomplete audit trail is compliance violation
      throw new Error('Payment audit system failure - unable to update status');
    }

    logger.info('Payment audit status updated', {
      idempotencyKey,
      status
    });
  } catch (error) {
    logger.error('CRITICAL: Exception updating payment audit', {
      idempotencyKey,
      error
    });
    throw new Error('Payment audit system failure - unable to update status');
  }
}
```

### Usage in Payment Route

```typescript
router.post('/api/v1/payments', async (req, res, next) => {
  try {
    const { order_id, source_id, amount } = req.body;
    const restaurantId = req.restaurantId!;
    const serverIdempotencyKey = randomUUID();

    // Validate order
    const order = await OrdersService.getOrder(order_id, restaurantId);
    if (!order) {
      throw NotFound('Order not found');
    }

    // PHASE 1: Log BEFORE Square call
    await PaymentService.logPaymentAttempt({
      orderId: order_id,
      status: 'initiated',  // Log intent before charging
      restaurantId: restaurantId,
      amount: amount,
      idempotencyKey: serverIdempotencyKey,
      paymentMethod: 'card',
      userAgent: req.headers['user-agent'],
      metadata: { order_number: order.order_number },
      ...(req.user?.id && { userId: req.user.id }),
      ...(req.ip && { ipAddress: req.ip })
    });

    // If audit fails here, NO CHARGE happens (safe)

    // PHASE 2: Call Square API
    const paymentRequest = {
      sourceId: source_id,
      idempotencyKey: serverIdempotencyKey,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)),
        currency: 'USD'
      },
      locationId: process.env['SQUARE_LOCATION_ID']!
    };

    let paymentResult;
    try {
      paymentResult = await withTimeout(
        paymentsApi.create(paymentRequest),
        30000,
        'Square payment'
      );
    } catch (squareError) {
      // Payment failed - update audit log
      await PaymentService.updatePaymentAuditStatus(
        serverIdempotencyKey,
        'failed',
        undefined,
        'square_error',
        String(squareError)
      );
      throw squareError;
    }

    // Check if payment succeeded
    if (paymentResult.payment?.status !== 'COMPLETED') {
      await PaymentService.updatePaymentAuditStatus(
        serverIdempotencyKey,
        'failed',
        paymentResult.payment?.id,
        paymentResult.payment?.status,
        'Payment not completed'
      );
      return res.status(400).json({
        error: 'Payment failed',
        status: paymentResult.payment?.status
      });
    }

    // Update order status
    await OrdersService.updateOrderPayment(
      order_id,
      restaurantId,
      paymentResult.payment.id,
      'completed'
    );

    // PHASE 3: Update audit to success
    await PaymentService.updatePaymentAuditStatus(
      serverIdempotencyKey,
      'success',
      paymentResult.payment.id
    );

    res.json({
      success: true,
      payment_id: paymentResult.payment.id,
      status: paymentResult.payment.status
    });

  } catch (error) {
    next(error);
  }
});
```

### Benefits

 **Prevents Charged-But-Unrecorded**: Initial log created before charge
 **Maintains Fail-Fast**: If initial log fails, no charge happens
 **Complete Audit Trail**: Shows initiation, result, and timing
 **Forensic Analysis**: Can identify incomplete payments
 **Idempotency**: Prevents duplicate audit logs
 **PCI DSS Compliant**: All payments have corresponding logs

### Testing Two-Phase Audit

```typescript
describe('Two-Phase Payment Audit', () => {
  it('should create initiated log before Square API call', async () => {
    const logSpy = vi.spyOn(PaymentService, 'logPaymentAttempt');
    const squareSpy = vi.spyOn(paymentsApi, 'create');

    await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_id, source_id, amount: 50.00 });

    // Verify log called before Square
    expect(logSpy).toHaveBeenCalledBefore(squareSpy);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'initiated' })
    );
  });

  it('should update to success after successful payment', async () => {
    const updateSpy = vi.spyOn(PaymentService, 'updatePaymentAuditStatus');

    await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_id, source_id, amount: 50.00 })
      .expect(200);

    expect(updateSpy).toHaveBeenCalledWith(
      expect.any(String), // idempotencyKey
      'success',
      expect.any(String)  // paymentId
    );
  });

  it('should prevent payment if initial audit fails', async () => {
    vi.spyOn(PaymentService, 'logPaymentAttempt').mockRejectedValue(
      new Error('Audit system failure')
    );
    const squareSpy = vi.spyOn(paymentsApi, 'create');

    await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_id, source_id, amount: 50.00 })
      .expect(500);

    // Verify Square was never called
    expect(squareSpy).not.toHaveBeenCalled();
  });
});
```

---

## Pre-Commit Secret Scanning

### Problem Solved
Vercel OIDC token committed to git history for 60+ days.

### Solution: Husky Pre-Commit Hooks

#### Installation

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run pre-commit"
```

#### Pre-Commit Script

**File**: `.husky/pre-commit`

```bash
#!/usr/bin/env bash
. "$(dirname "$0")/_/husky.sh"

echo " Running pre-commit checks..."

# 1. Prevent committing .env files
echo "Checking for .env files..."
if git diff --cached --name-only | grep -E "^\.env(\.|$)"; then
  echo "🚨 ERROR: Attempting to commit .env file(s)"
  echo "Blocked files:"
  git diff --cached --name-only | grep -E "^\.env(\.|$)"
  echo ""
  echo "These files should never be committed to git."
  echo "Add them to .gitignore and use environment variables instead."
  exit 1
fi

# 2. Check for hardcoded secrets in code
echo "Checking for potential secrets..."
SECRETS_FOUND=false

# Check for common secret patterns
if git diff --cached -U0 | grep -iE "(api[_-]?key|secret[_-]?key|password|token)" | grep -vE "^[+-]\s*(//|#|\*)"; then
  echo "  WARNING: Potential secrets detected in staged changes"
  echo "Review carefully before committing:"
  echo ""
  git diff --cached -U0 | grep -iE "(api[_-]?key|secret[_-]?key|password|token)" | grep -vE "^[+-]\s*(//|#|\*)"
  echo ""
  SECRETS_FOUND=true
fi

# Check for common credential patterns
if git diff --cached -U0 | grep -E "(-----BEGIN.*PRIVATE KEY-----)|(sk_live_|pk_live_|ghp_|gho_|EAA)"; then
  echo "🚨 ERROR: Detected credential patterns in staged changes"
  echo "DO NOT commit these files:"
  echo ""
  git diff --cached -U0 | grep -E "(-----BEGIN.*PRIVATE KEY-----)|(sk_live_|pk_live_|ghp_|gho_|EAA)"
  exit 1
fi

# Warn but don't block if potential secrets found
if [ "$SECRETS_FOUND" = true ]; then
  echo ""
  echo "Press Enter to continue or Ctrl+C to cancel..."
  read -r
fi

# 3. Check for console.log statements (optional)
echo "Checking for console.log..."
if git diff --cached -U0 | grep -E "^\+.*console\.(log|debug|info)" | grep -vE "logger\.(log|debug|info)"; then
  echo "  WARNING: Found console.log statements (use logger instead)"
  echo "Consider using the logger utility for production code."
  echo ""
fi

echo " Pre-commit checks passed"
```

### .gitignore Configuration

```gitignore
# Environment files
.env
.env.*
!.env.example

# Credentials and keys
*.key
*.pem
*.p12
*credentials*.json
*-credentials.json

# Square/payment provider tokens
*square*.token
*stripe*.key

# Supabase service keys
*service-key*.json

# CI/CD secrets
.vercel
.github/secrets

# Backup files that might contain credentials
*.backup
*.bak
```

### GitHub Secret Scanning (Optional)

Enable GitHub Advanced Security for automatic secret scanning:

**File**: `.github/workflows/secret-scan.yml`

```yaml
name: Secret Scanning

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for scanning

      - name: TruffleHog OSS
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --debug --only-verified
```

### Secret Rotation Procedure

If a secret is committed:

1. **Immediate Actions**:
   ```bash
   # Revoke the exposed secret immediately
   # Generate new secret
   # Update all environments
   ```

2. **Verify Damage**:
   ```bash
   # Check access logs for suspicious activity
   # Determine exposure duration
   # Identify affected systems
   ```

3. **Document**:
   ```bash
   # Create incident report
   # Record timeline
   # Document lessons learned
   ```

4. **Optional: Clean Git History**:
   ```bash
   # Only if secret is critical and recently committed
   git filter-repo --invert-paths --path .env.production --force
   git push origin --force --all
   ```

---

## Multi-Tenancy Validation

### Problem Solved
Cross-restaurant data access via header manipulation.

### Solution: Three-Layer Defense

#### Layer 1: Middleware Validation

```typescript
// server/src/middleware/restaurantAccess.ts
export async function validateRestaurantAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw Unauthorized('Authentication required');
    }

    const requestedRestaurantId =
      (req.headers['x-restaurant-id'] as string) ||
      req.restaurantId;

    if (!requestedRestaurantId) {
      throw Forbidden('Restaurant ID is required');
    }

    // Admin users can access any restaurant
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      req.restaurantId = requestedRestaurantId;
      return next();
    }

    // Demo users bypass DB check (scoped in JWT)
    const isDemoUser = req.user.id.startsWith('demo:');
    if (isDemoUser && req.user.restaurant_id === requestedRestaurantId) {
      req.restaurantId = requestedRestaurantId;
      req.restaurantRole = req.user.role || 'demo';
      return next();
    }

    // Validate user has access to this restaurant (DB lookup)
    const queryPromise = supabase
      .from('user_restaurants')
      .select('restaurant_id, role')
      .eq('user_id', req.user.id)
      .eq('restaurant_id', requestedRestaurantId)
      .single();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Database query timeout')),
        5000
      )
    );

    const { data: userRestaurant, error } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]);

    if (error || !userRestaurant) {
      throw Forbidden('Access denied to this restaurant');
    }

    // ONLY set after validation passes
    req.restaurantId = requestedRestaurantId;
    req.restaurantRole = userRestaurant.role;

    next();
  } catch (error) {
    next(error);
  }
}
```

#### Layer 2: Service-Level Filtering

```typescript
// server/src/services/orders.service.ts
export class OrdersService {
  // ALWAYS include restaurant_id filter
  static async getOrders(restaurantId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId) // REQUIRED
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getOrder(
    orderId: string,
    restaurantId: string
  ): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId) // REQUIRED
      .single();

    if (error) return null;
    return data;
  }

  static async updateOrder(
    orderId: string,
    restaurantId: string,
    updates: Partial<Order>
  ): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId) // REQUIRED
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
```

#### Layer 3: Database RLS Policies

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "tenant_select_orders" ON orders
  FOR SELECT
  USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- INSERT policy
CREATE POLICY "tenant_insert_orders" ON orders
  FOR INSERT
  WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- UPDATE policy
CREATE POLICY "tenant_update_orders" ON orders
  FOR UPDATE
  USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
  WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- DELETE policy
CREATE POLICY "tenant_delete_orders" ON orders
  FOR DELETE
  USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);
```

### Testing Multi-Tenancy

```typescript
describe('Multi-Tenancy Enforcement', () => {
  const RESTAURANT_1 = '11111111-1111-1111-1111-111111111111';
  const RESTAURANT_2 = '22222222-2222-2222-2222-222222222222';

  it('should prevent cross-restaurant order access', async () => {
    const restaurant1Token = createToken({ restaurant_id: RESTAURANT_1 });
    const restaurant2Order = await createOrder(RESTAURANT_2);

    await request(app)
      .get(`/api/v1/orders/${restaurant2Order.id}`)
      .set('Authorization', `Bearer ${restaurant1Token}`)
      .set('X-Restaurant-ID', RESTAURANT_1)
      .expect(404); // Not 403 - don't leak existence
  });

  it('should prevent header spoofing', async () => {
    const restaurant1Token = createToken({ restaurant_id: RESTAURANT_1 });

    await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${restaurant1Token}`)
      .set('X-Restaurant-ID', RESTAURANT_2) // Spoofed header
      .expect(403)
      .expect(res => {
        expect(res.body.error.code).toBe('RESTAURANT_ACCESS_DENIED');
      });
  });
});
```

---

## Rate Limiting Configuration

### Problem Solved
Rate limiting disabled in production, allowing unlimited expensive API calls.

### Solution: Tiered Rate Limits by Cost

```typescript
// server/src/middleware/rateLimiter.ts

// Helper: Detect local development only
const isLocalDev = process.env['NODE_ENV'] === 'development'
  && process.env['RENDER'] !== 'true'
  && process.env['VERCEL'] !== '1';

// Tier 1: General API (moderate cost)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isLocalDev ? 10000 : 1000,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.restaurantId || authReq.ip || 'anonymous';
  },
  message: 'Too many requests, please try again later.',
  skip: (_req: Request) => isLocalDev
});

// Tier 2: AI Services (expensive)
export const aiServiceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isLocalDev ? 100 : 50,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.id || authReq.restaurantId || authReq.ip || 'anonymous';
  },
  skip: (_req: Request) => isLocalDev,
  handler: (req, res) => {
    console.error(`[RATE_LIMIT] AI service abuse: ${req.ip} at ${new Date().toISOString()}`);
    res.status(429).json({
      error: 'Too many AI requests. Please wait 5 minutes.',
      retryAfter: 300
    });
  }
});

// Tier 3: Transcription (very expensive)
export const transcriptionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isLocalDev ? 30 : 20,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.id || authReq.restaurantId || authReq.ip || 'anonymous';
  },
  skip: (_req: Request) => isLocalDev,
  handler: (req, res) => {
    console.error(`[RATE_LIMIT] Transcription abuse: ${req.ip}`);
    res.status(429).json({
      error: 'Too many transcription requests. Please wait 1 minute.',
      retryAfter: 60
    });
  }
});

// Tier 4: Auth (security-critical)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Very strict - only 5 attempts per 15 minutes
  keyGenerator: (req: Request) => req.ip || 'anonymous',
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true // Don't count successful logins
});
```

### Application

```typescript
// Apply appropriate limiter to each route
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/ai', aiServiceLimiter);
app.use('/api/v1/realtime/transcribe', transcriptionLimiter);
app.use('/api/v1', apiLimiter);
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-19
**Related**: README.md, PATTERNS.md, INCIDENTS.md
