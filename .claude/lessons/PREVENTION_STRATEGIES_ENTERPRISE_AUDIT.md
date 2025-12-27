# Prevention Strategies: Enterprise Audit Issues

**Comprehensive prevention framework for the five issues fixed in enterprise audit remediation**

---

## Executive Summary

In this enterprise audit remediation cycle, five critical infrastructure and code quality issues were identified and fixed:

| # | Issue | Pattern | Detection | Cost | Fix |
|---|-------|---------|-----------|------|-----|
| 1 | In-memory rate limiting without cleanup | Memory growth risk, state loss on restart | Memory usage increasing 1-20 MB/day | High | Add interval cleanup, graceful shutdown |
| 2 | Missing unit tests | No coverage for new functionality | Code review, absence of test files | Medium | Define minimum coverage expectations |
| 3 | Undocumented env vars | Developer confusion, deployment failures | Onboarding issues, misconfigurations | Medium | Centralize env var documentation |
| 4 | Unbatched API calls | Cost/performance inefficiency | Slow feature performance, API bills | Medium-High | Batch external API calls with limits |
| 5 | Index migration conflicts | Silent failures possible | Production errors, downtime | High | Validation checks in migrations |

**Prevention Goal:** Make these issues impossible to introduce in new code through patterns, automation, and code review.

---

## 1. In-Memory Rate Limiting Without Cleanup

### Problem Pattern

```typescript
// BROKEN: In-memory storage with no cleanup
class MenuEmbeddingService {
  private static generationHistory = new Map<string, number[]>();

  static generateEmbeddings(restaurantId: string) {
    const history = this.generationHistory.get(restaurantId) || [];
    // Map grows indefinitely, never cleaned up
    // On server restart: state is lost, rate limit resets
    // Long-running server: memory leak 1-20 MB/day
  }
}
```

### Detection Signals

- Memory usage increases gradually over days
- Rate limiter resets after server restarts
- Maps/arrays accessed but never pruned
- No `clearInterval()` for cleanup tasks
- Interval created but not stored (can't be cleared)

### Prevention Checklist

**Code Review - Rate Limiting Patterns:**
- [ ] Every in-memory rate limiter has a cleanup interval
- [ ] Cleanup interval is stored in class property (not discarded)
- [ ] Cleanup method registered with graceful shutdown
- [ ] Stale entries pruned periodically (hourly or daily)
- [ ] Size limits enforced (max entries per restaurant)
- [ ] Production deployment plan includes Redis/distributed option

**Architecture Review:**
- [ ] Check for `STALE_ENTRY_THRESHOLD_MS` constant with realistic TTL
- [ ] Verify cleanup happens via `setInterval()` with stored reference
- [ ] Confirm `clearInterval()` called in shutdown handler
- [ ] Plan for horizontal scaling (when multiple instances run)

**Before Merging:**
```bash
# Verify cleanup is implemented
grep -A 5 "setInterval" server/src/middleware/rateLimiter.ts

# Verify cleanup is called on shutdown
grep "clearInterval\|stopCleanup\|shutdown" server/src/server.ts

# Check for TOCTOU race conditions in rate limit checks
grep -B 2 -A 2 "\.has(" server/src/middleware/rateLimiter.ts | grep -A 3 "\.set("
```

### Implementation Pattern

**Pattern 1: Rate Limiter with Interval Cleanup**

```typescript
// CORRECT: Track interval, implement cleanup
class RateLimiter {
  private static store = new Map<string, number[]>();
  private static cleanupInterval: NodeJS.Timeout | null = null;

  // Start cleanup during server initialization
  static startCleanup(): void {
    if (this.cleanupInterval) return; // Prevent double-start

    this.cleanupInterval = setInterval(() => {
      this.pruneStaleEntries();
    }, 60 * 60 * 1000); // 1 hour

    logger.info('Rate limit cleanup started');
  }

  // Stop cleanup during server shutdown
  static stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Rate limit cleanup stopped');
    }
  }

  // Prune entries older than threshold
  private static pruneStaleEntries(): void {
    const now = Date.now();
    const threshold = 60 * 60 * 1000; // 1 hour

    for (const [key, timestamps] of this.store.entries()) {
      // Keep only recent entries
      const recent = timestamps.filter(t => now - t < threshold);

      if (recent.length === 0) {
        this.store.delete(key); // Remove stale entry entirely
      } else if (recent.length < timestamps.length) {
        this.store.set(key, recent); // Update with pruned list
      }
    }
  }

  // Optional: Enforce maximum size limit
  private static enforceMaxSize(): void {
    const MAX_ENTRIES = 10000;
    if (this.store.size > MAX_ENTRIES) {
      // Delete oldest entries
      const entriesToDelete = this.store.size - MAX_ENTRIES;
      let deleted = 0;

      for (const key of this.store.keys()) {
        if (deleted >= entriesToDelete) break;
        this.store.delete(key);
        deleted++;
      }
    }
  }
}
```

**Pattern 2: Server Graceful Shutdown**

```typescript
// In server.ts - Initialize and cleanup
import { startServer } from './server';
import { MenuEmbeddingService } from './services/menu-embedding.service';

const server = startServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  // Stop all cleanup intervals
  MenuEmbeddingService.stopRateLimitCleanup();
  RateLimiter.stopCleanup();

  // Close server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000); // 30 seconds
});
```

### Testing Requirements

**Test 1: Cleanup Removes Stale Entries**

```typescript
describe('RateLimiter - Cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    RateLimiter.clear(); // Reset state
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should remove stale entries after threshold', () => {
    const service = new RateLimiter();

    // Add entry
    service.record('restaurant-1', Date.now());
    expect(service.getSize()).toBe(1);

    // Advance time past threshold
    vi.advanceTimersByTime(61 * 60 * 1000); // 61 minutes

    // Trigger cleanup
    service.cleanup();

    // Entry should be removed
    expect(service.getSize()).toBe(0);
  });

  it('should keep recent entries', () => {
    const service = new RateLimiter();
    const now = Date.now();

    service.record('restaurant-1', now);
    service.record('restaurant-1', now - 30 * 60 * 1000); // 30 min ago

    // Advance 45 minutes
    vi.advanceTimersByTime(45 * 60 * 1000);
    service.cleanup();

    // Recent entry kept, old one removed
    expect(service.getSize()).toBe(1);
  });

  it('should enforce maximum size limit', () => {
    const service = new RateLimiter(100); // Max 100 entries

    for (let i = 0; i < 150; i++) {
      service.record(`restaurant-${i}`, Date.now());
    }

    service.enforceMaxSize();

    expect(service.getSize()).toBeLessThanOrEqual(100);
  });

  it('should stop cleanup interval on shutdown', () => {
    const spy = vi.spyOn(global, 'clearInterval');

    RateLimiter.startCleanup();
    RateLimiter.stopCleanup();

    expect(spy).toHaveBeenCalled();
  });
});
```

**Test 2: No Accumulated Overhead**

```typescript
describe('RateLimiter - Memory Safety', () => {
  it('should not accumulate multiple cleanup intervals', () => {
    const spy = vi.spyOn(global, 'setInterval');

    RateLimiter.startCleanup();
    RateLimiter.startCleanup(); // Second call should be no-op

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should handle rapid start/stop cycles', () => {
    for (let i = 0; i < 100; i++) {
      RateLimiter.startCleanup();
      RateLimiter.stopCleanup();
    }

    // Should complete without leaking handles
    expect(global._getActiveHandles?.().length || 0).toBeLessThan(10);
  });
});
```

### Documentation Standard

**Update CLAUDE.md:**

```markdown
### In-Memory Rate Limiting

All in-memory rate limiters MUST implement cleanup:

1. **Store with TTL:** Use `Map<string, Timestamp[]>`
2. **Cleanup Interval:** `setInterval(() => pruneStale(), 1h)`
3. **Graceful Shutdown:** `clearInterval()` in SIGTERM handler
4. **Max Size:** Enforce limit to prevent unbounded growth
5. **Future:** Plan Redis migration for horizontal scaling

Example: `server/src/services/menu-embedding.service.ts`

For distributed deployments (multiple instances), use Redis-backed
rate limiting instead of in-memory Maps. See TODO-231.
```

**Update .env.example:**

```bash
# Rate Limiting & Cleanup
# Menu embedding rate limit: max 5 regenerations per hour per restaurant
# In-memory storage: cleaned up hourly, resets on server restart
# For distributed deployments: set REDIS_URL to enable distributed rate limiting
REDIS_URL=redis://localhost:6379  # Optional - enables Redis-backed rate limiting

# Graceful shutdown timeout (seconds)
SHUTDOWN_GRACE_PERIOD=30
```

---

## 2. Missing Unit Tests

### Problem Pattern

```typescript
// NEW: No tests written for new functionality
export async function generateMenuEmbeddings(
  restaurantId: string
): Promise<void> {
  // Complex logic, external API calls, but no test coverage
  // When refactoring, this breaks silently
}

// BROKEN: Code exists but no tests
class AuthRateLimiter {
  private attempts = new Map<string, number>();
  // No tests verify rate limiting actually works
}
```

### Detection Signals

- Code review shows new files with no `.test.ts` or `.spec.ts` pair
- `npm run test` passes but code coverage drops
- Complex logic added without tests (external APIs, state machines)
- Bug fixes made because "it worked in dev but not in production"

### Prevention Checklist

**Pre-Commit - Test Coverage:**
- [ ] Every new `.ts` file has corresponding `.test.ts` or `.spec.ts`
- [ ] External API calls have mocked tests (OpenAI, Stripe, Supabase)
- [ ] Error paths tested (success AND failure cases)
- [ ] Edge cases tested (empty input, boundary values, null)
- [ ] Async/await logic tested with proper timing
- [ ] State mutations tested (Map updates, array operations)

**Code Review - Test Quality:**
- [ ] Test file exists and runs without errors
- [ ] At least one positive test case (happy path)
- [ ] At least one negative test case (error handling)
- [ ] Tests use mock/spy for external dependencies
- [ ] No `skip()` or `xit()` in submitted code
- [ ] Test names clearly describe what they test

**Before Merging:**
```bash
# Find new code without tests
git diff main -- '*.ts' | grep "^+" | grep -v "test\|spec" | wc -l

# Verify test coverage increased
npm run test:coverage -- --testPathPattern=new-feature

# Check no tests are skipped
grep -r "\.skip\|\.only\|it\.skip\|describe\.skip" server/tests/
```

### Implementation Pattern

**Pattern 1: Service with External API Calls**

```typescript
// server/src/services/transcription.service.ts
import OpenAI from 'openai';
import { getErrorMessage } from '@rebuild/shared/utils/error-utils';

export class TranscriptionService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async transcribe(audioUrl: string): Promise<string> {
    // Implementation with error handling
  }
}
```

```typescript
// server/tests/services/transcription.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TranscriptionService } from '@/services/transcription.service';

// Mock OpenAI
vi.mock('openai');

describe('TranscriptionService', () => {
  let service: TranscriptionService;
  let openaiMock: any;

  beforeEach(() => {
    openaiMock = {
      audio: {
        transcriptions: {
          create: vi.fn()
        }
      }
    };

    vi.mocked(OpenAI).mockReturnValue(openaiMock);
    service = new TranscriptionService('test-key');
  });

  describe('transcribe', () => {
    it('should return transcription text on success', async () => {
      // ARRANGE
      const audioUrl = 'https://example.com/audio.mp3';
      openaiMock.audio.transcriptions.create.mockResolvedValue({
        text: 'Hello world'
      });

      // ACT
      const result = await service.transcribe(audioUrl);

      // ASSERT
      expect(result).toBe('Hello world');
      expect(openaiMock.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({ file: audioUrl })
      );
    });

    it('should throw on API error', async () => {
      // ARRANGE
      const apiError = new Error('Rate limit exceeded');
      openaiMock.audio.transcriptions.create.mockRejectedValue(apiError);

      // ACT & ASSERT
      await expect(service.transcribe('url')).rejects.toThrow();
    });

    it('should handle timeout', async () => {
      // ARRANGE
      openaiMock.audio.transcriptions.create.mockImplementation(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      // ACT & ASSERT
      await expect(
        Promise.race([
          service.transcribe('url'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Test timeout')), 50)
          )
        ])
      ).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should reject empty audio URL', async () => {
      await expect(service.transcribe('')).rejects.toThrow();
    });

    it('should reject null response', async () => {
      openaiMock.audio.transcriptions.create.mockResolvedValue(null);

      await expect(service.transcribe('url')).rejects.toThrow();
    });

    it('should extract text from various response formats', async () => {
      // Handle if API changes response structure
      openaiMock.audio.transcriptions.create.mockResolvedValue({
        text: 'Transcription',
        duration: 30,
        language: 'en'
      });

      const result = await service.transcribe('url');
      expect(result).toBe('Transcription');
    });
  });
});
```

**Pattern 2: API Endpoint with Error Handling**

```typescript
// server/src/routes/transcription.routes.ts
import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { transcriptionLimiter } from '../middleware/rateLimiter';
import { TranscriptionService } from '../services/transcription.service';
import { safeApiError, getErrorMessage } from '@rebuild/shared';
import { logger } from '../utils/logger';

const router = Router();
const transcriptionService = new TranscriptionService(
  process.env.OPENAI_API_KEY!
);

router.post(
  '/transcribe',
  authenticate,
  transcriptionLimiter,
  async (req, res) => {
    try {
      const { audioUrl } = req.body;

      if (!audioUrl) {
        return res.status(400).json({ error: 'Audio URL required' });
      }

      const text = await transcriptionService.transcribe(audioUrl);

      res.json({ success: true, text });
    } catch (error) {
      logger.error('Transcription failed', {
        error: getErrorMessage(error),
        userId: req.user?.id
      });

      res.status(500).json({
        error: safeApiError(error, 'Transcription failed', logger)
      });
    }
  }
);
```

```typescript
// server/tests/routes/transcription.routes.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '@/server';

vi.mock('@/services/transcription.service');
vi.mock('@/middleware/auth');
vi.mock('@/middleware/rateLimiter');

describe('POST /transcribe', () => {
  describe('success path', () => {
    it('should return transcription on success', async () => {
      const response = await request(app)
        .post('/transcribe')
        .send({ audioUrl: 'https://example.com/audio.mp3' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('text');
    });
  });

  describe('error handling', () => {
    it('should return 400 for missing audio URL', async () => {
      const response = await request(app)
        .post('/transcribe')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    it('should return 500 with generic message on service error', async () => {
      // Mock service to throw
      const response = await request(app)
        .post('/transcribe')
        .send({ audioUrl: 'url' });

      expect(response.status).toBe(500);
      expect(response.body.error).not.toContain('ECONNREFUSED');
      expect(response.body.error).not.toContain('OpenAI');
    });

    it('should NOT expose stack trace in response', async () => {
      const response = await request(app)
        .post('/transcribe')
        .send({ audioUrl: 'url' });

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body.error).not.toContain('at ');
    });
  });

  describe('authentication', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/transcribe')
        .send({ audioUrl: 'url' });

      expect(response.status).toBe(401);
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limit', async () => {
      // Make multiple requests
      for (let i = 0; i < 11; i++) {
        const response = await request(app)
          .post('/transcribe')
          .send({ audioUrl: 'url' });

        if (i < 10) {
          expect([200, 400]).toContain(response.status);
        } else {
          expect(response.status).toBe(429); // 11th request rate limited
        }
      }
    });
  });
});
```

### Documentation Standard

**Create CLAUDE.md - Testing Section:**

```markdown
## Testing Requirements

### Minimum Coverage Per Feature

- **New Services:** ≥ 80% line coverage (success + error paths)
- **API Routes:** ≥ 100% endpoint coverage (normal + edge cases)
- **Middleware:** ≥ 90% coverage (all branches tested)
- **Utilities:** ≥ 95% coverage (all inputs tested)

### Test Structure (AAA Pattern)

Every test uses Arrange-Act-Assert:

```typescript
it('should do something', async () => {
  // ARRANGE: Set up mocks and data
  const input = { ... };
  mockService.mockResolvedValue(expected);

  // ACT: Call the function
  const result = await service.doSomething(input);

  // ASSERT: Verify the result
  expect(result).toEqual(expected);
});
```

### External API Tests

For services calling external APIs (OpenAI, Stripe, etc.):

- [ ] Mock the API client (not actual HTTP calls)
- [ ] Test success response parsing
- [ ] Test error response handling
- [ ] Test rate limit/timeout scenarios
- [ ] Test with realistic response data

### Coverage Goals

Run `npm run test:coverage` before commits:

- Overall: ≥ 85%
- Server: ≥ 85%
- Client: ≥ 80%

Never decrease coverage in a PR.
```

---

## 3. Undocumented Environment Variables

### Problem Pattern

```typescript
// BROKEN: No documentation, developers guess at values
const MAX_EMBEDDINGS = parseInt(process.env.EMBEDDING_LIMIT || '100');
// → What does this do? When should it be changed?
// → Is it per-minute, per-hour, per-user?
// → What's the recommended value for production?

// BROKEN: Magic numbers in code
const RETRY_ATTEMPTS = 3; // Where does this come from?
const TIMEOUT_MS = 45000; // Is this the default? Can it be overridden?
```

### Detection Signals

- Developers ask "what's the value of X supposed to be?"
- Environment variable used but not in `.env.example`
- Deployment fails because "variable not set"
- Code comments say "TODO: document this"
- Different values in dev vs production with no explanation

### Prevention Checklist

**Code Review - Env Var Usage:**
- [ ] Every `process.env.VAR` is listed in `.env.example`
- [ ] `.env.example` includes description and default
- [ ] CLAUDE.md lists critical env vars (TIER 1, TIER 2)
- [ ] Production-only vars clearly marked
- [ ] Type checking: `getConfig()` validates all env vars
- [ ] No naked `process.env` access (use typed config object)

**Environment Validation:**
```bash
# Verify all env vars are documented
grep -r "process.env\." server/src --include="*.ts" | \
  sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' | sort -u | \
  while read var; do
    grep -q "^$var=" .env.example || echo "MISSING: $var"
  done
```

**Before Merging:**
- [ ] All `process.env.X` in new code exist in `.env.example`
- [ ] CLAUDE.md "Environment Variables" section updated
- [ ] Type validation works (tests with missing vars)
- [ ] No hardcoded values that should be env vars

### Implementation Pattern

**Pattern 1: Typed Configuration Object**

```typescript
// server/src/config/environment.ts
import { logger } from '../utils/logger';

export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;

  // Database
  databaseUrl: string;

  // OpenAI
  openai?: {
    apiKey: string;
    model: string;
    timeout: number;
    embeddingModel: string;
  };

  // Authentication
  auth: {
    jwtSecret: string;
    kioskSecret: string;
    strictMode: boolean;
  };

  // Rate Limiting
  rateLimit: {
    menuUpdateWindow: number; // milliseconds
    menuUpdateMax: number; // requests per window
    embeddingCooldown: number; // milliseconds
    maxGenerationsPerHour: number;
  };

  // External Services
  stripe?: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
}

/**
 * Load and validate environment variables
 * Throws if required vars are missing
 */
export function getConfig(): AppConfig {
  // Validate critical vars
  const requiredVars = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'KIOSK_JWT_SECRET'
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      const msg = `Missing required env var: ${varName}`;
      logger.error(msg);
      throw new Error(msg);
    }
  }

  // Validate types
  const port = parseInt(process.env.PORT || '3001', 10);
  if (isNaN(port)) {
    throw new Error('PORT must be a number');
  }

  // Build config object
  return {
    nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    port,

    databaseUrl: process.env.DATABASE_URL!,

    openai: process.env.OPENAI_API_KEY ? {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      timeout: parseInt(process.env.OPENAI_API_TIMEOUT_MS || '45000', 10),
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
    } : undefined,

    auth: {
      jwtSecret: process.env.SUPABASE_JWT_SECRET || 'dev-secret',
      kioskSecret: process.env.KIOSK_JWT_SECRET!,
      strictMode: process.env.STRICT_AUTH === 'true'
    },

    rateLimit: {
      menuUpdateWindow: parseInt(process.env.RATE_LIMIT_MENU_WINDOW_MS || String(60 * 1000), 10),
      menuUpdateMax: parseInt(process.env.RATE_LIMIT_MENU_MAX || '30', 10),
      embeddingCooldown: parseInt(process.env.EMBEDDING_COOLDOWN_MS || String(12 * 60 * 1000), 10),
      maxGenerationsPerHour: parseInt(process.env.EMBEDDING_BATCH_MAX || '5', 10)
    },

    stripe: process.env.STRIPE_SECRET_KEY ? {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!
    } : undefined
  };
}

// Validate on startup
let cachedConfig: AppConfig | null = null;
export function getConfigCached(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = getConfig();
  }
  return cachedConfig;
}
```

**Pattern 2: .env.example with Full Documentation**

```bash
# ============================================
# RESTAURANT OS ENVIRONMENT VARIABLES
# Last Updated: 2025-12-27
# ============================================
#
# TIER 1 (CRITICAL - Production MUST have these):
# - KIOSK_JWT_SECRET, SUPABASE_SERVICE_KEY, DATABASE_URL
#
# TIER 2 (IMPORTANT - Production should have):
# - OPENAI_API_KEY (if using voice orders)
# - STRIPE_SECRET_KEY (if using payments)
#
# TIER 3 (OPTIONAL - Features disabled if missing):
# - SENTRY_DSN, POSTMARK_SERVER_TOKEN
#
# ============================================

# ====================
# Server Configuration
# ====================

# Node environment: 'development', 'production', 'test'
# Default: development
# Production: MUST be 'production' for security checks
NODE_ENV=development

# Server port for Express
# Default: 3001
# Used: npm run dev:server listening port
PORT=3001

# ====================
# Database (TIER 1)
# ====================

# Supabase project URL
# Get from: https://app.supabase.com/project/YOUR_PROJECT
# Format: https://YOUR_PROJECT_REF.supabase.co
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co

# Supabase anonymous key (public, safe in client code)
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Supabase service role key (SECRET - server only)
# NEVER expose to client
# Used for: Admin operations, server-side queries
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Database connection string (for migrations)
# Get from: Supabase Dashboard > Settings > Database > Connection
# Format: postgresql://[user:password]@[host]:[port]/[database]
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres

# JWT secret for signing Supabase tokens
# Generate: openssl rand -hex 32
# WARNING: Changing this invalidates all existing tokens
SUPABASE_JWT_SECRET=your_jwt_secret_here

# ====================
# Authentication (TIER 1-2)
# ====================

# Kiosk JWT secret for signing kiosk session tokens
# Generate: openssl rand -hex 32
# Used for: PIN-based authentication, shared device sessions
# WARNING: CRITICAL - token validation depends on this
KIOSK_JWT_SECRET=[GENERATE_WITH_openssl_rand_-hex_32]

# Station authentication secret for KDS displays
# Generate: openssl rand -hex 32
# Used for: Kitchen display system authentication
STATION_TOKEN_SECRET=[GENERATE_WITH_openssl_rand_-hex_32]

# PIN hashing pepper for additional security
# Generate: openssl rand -hex 32
PIN_PEPPER=[GENERATE_WITH_openssl_rand_-hex_32]

# Device fingerprint salt for binding tokens to devices
# Generate: openssl rand -hex 32
DEVICE_FINGERPRINT_SALT=[GENERATE_WITH_openssl_rand_-hex_32]

# Strict authentication mode
# Default: false
# Set to 'true' in production for strict multi-tenant security
# When true: JWT MUST contain restaurant_id claim
STRICT_AUTH=false

# ====================
# OpenAI (TIER 2 - Optional)
# ====================

# OpenAI API key for voice ordering and embeddings
# Get from: https://platform.openai.com/api-keys
# Used for: Voice transcription, menu embeddings
# Default: undefined (voice ordering disabled)
OPENAI_API_KEY=your_openai_api_key_here

# OpenAI chat model
# Options: gpt-4-turbo, gpt-4, gpt-3.5-turbo
# Default: gpt-4-turbo
# Used for: Realtime voice conversations, function calling
OPENAI_MODEL=gpt-4-turbo

# OpenAI API timeout in milliseconds
# Default: 45000 (45 seconds)
# Increase if: Slow network, large requests
# Decrease if: Aggressive timeout needed
OPENAI_API_TIMEOUT_MS=45000

# OpenAI embedding model for semantic search
# Options: text-embedding-3-small, text-embedding-3-large
# Default: text-embedding-3-small
# Small: Cheaper, 1536 dimensions, good for most use cases
# Large: More accurate, 3072 dimensions, higher cost
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# ====================
# Rate Limiting
# ====================

# Menu update rate limit window in milliseconds
# Default: 60000 (1 minute)
# Controls: How often menu can be updated
RATE_LIMIT_MENU_WINDOW_MS=60000

# Menu update max requests per window
# Default: 30 updates per minute
# Prevent: Cache thrashing, cost attacks
RATE_LIMIT_MENU_MAX=30

# Menu embedding generation cooldown in milliseconds
# Default: 720000 (12 minutes)
# Prevents: Cost attacks, rate limit abuse
EMBEDDING_COOLDOWN_MS=720000

# Maximum menu embedding generations per hour
# Default: 5 generations per hour
# Limits: Bulk regeneration frequency
EMBEDDING_BATCH_MAX=5

# ====================
# Stripe Payment (TIER 2 - Optional)
# ====================

# Stripe secret API key
# Get from: https://dashboard.stripe.com/apikeys
# Format: sk_test_... (test) or sk_live_... (production)
# NEVER expose to client - server only
# Used for: Payment processing, webhook verification
STRIPE_SECRET_KEY=sk_test_...

# Stripe publishable key (safe in client code)
# Get from: https://dashboard.stripe.com/apikeys
# Format: pk_test_... (test) or pk_live_... (production)
# Used in: Client-side Stripe Elements
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe webhook signing secret
# Get from: https://dashboard.stripe.com/webhooks
# Format: whsec_...
# Used for: Verifying webhook authenticity
STRIPE_WEBHOOK_SECRET=whsec_...

# ====================
# Monitoring & Errors (TIER 3 - Optional)
# ====================

# Sentry error tracking DSN
# Get from: https://sentry.io/settings/projects/YOUR_PROJECT/keys/
# Default: undefined (error tracking disabled)
# Used for: Production error monitoring
SENTRY_DSN=your_sentry_dsn_here

# Log level for server
# Options: debug, info, warn, error
# Default: debug
# Production: Should be 'info' or 'warn'
LOG_LEVEL=debug

# Log format
# Options: json, text
# Default: json
# JSON: Better for production monitoring
LOG_FORMAT=json

# ====================
# Email (TIER 3 - Optional)
# ====================

# Postmark email service token
# Get from: https://postmarkapp.com/account/servers
# Used for: Transactional emails
POSTMARK_SERVER_TOKEN=your_postmark_server_token_here

# Email address for sending transactional emails
# Format: noreply@yourdomain.com
POSTMARK_FROM_EMAIL=noreply@example.com

# ====================
# CORS Configuration
# ====================

# Frontend URL (where client is deployed)
# Default: http://localhost:5173 (dev)
# Production: https://yourdomain.com
FRONTEND_URL=http://localhost:5173

# Allowed CORS origins (comma-separated)
# Default: http://localhost:5173
# Add multiple: https://example.com,https://app.example.com
ALLOWED_ORIGINS=http://localhost:5173

# ====================
# Optional Features
# ====================

# Enable semantic search for menu items
# Default: false
# Requires: OPENAI_API_KEY set, vector embeddings in database
ENABLE_SEMANTIC_SEARCH=false

# Demo login credentials for testing
# Default: true in development, false in production
DEMO_LOGIN_ENABLED=true

# AI degraded mode (fallback when OpenAI is down)
# Default: false
# When true: Voice ordering disabled, voice features unavailable
# AI_DEGRADED_MODE=false
```

**Pattern 3: CLAUDE.md - Environment Variables Section**

```markdown
## Environment Variables

### Tier System

**TIER 1 (CRITICAL - No fallback)**
- KIOSK_JWT_SECRET
- SUPABASE_SERVICE_KEY
- DATABASE_URL

Without these, server won't start.

**TIER 2 (IMPORTANT - Features disabled if missing)**
- OPENAI_API_KEY (voice ordering disabled)
- STRIPE_SECRET_KEY (payment disabled)

**TIER 3 (OPTIONAL - Graceful degradation)**
- SENTRY_DSN (error tracking disabled)
- POSTMARK_SERVER_TOKEN (email disabled)

### Using Environment Variables

Never use `process.env` directly. Always use the typed config object:

```typescript
// WRONG: Direct access, no type safety
const timeout = parseInt(process.env.OPENAI_API_TIMEOUT_MS || '45000');

// CORRECT: Typed config with validation
import { getConfig } from './config/environment';
const config = getConfig();
const timeout = config.openai.timeout; // Type-safe, validated
```

### Adding New Variables

When adding a new env var:

1. Add to `server/src/config/environment.ts` (typed)
2. Add to `.env.example` with documentation
3. Add to CLAUDE.md in this section
4. Add validation logic in `getConfig()`
5. Update tests to verify validation
6. Test with missing variable (should have fallback or error)

### Production Checklist

Before deploying:

- [ ] All TIER 1 vars set on Render
- [ ] TIER 2 vars set if features are used
- [ ] NODE_ENV=production
- [ ] LOG_LEVEL=info or warn
- [ ] STRICT_AUTH=true
- [ ] Test deployment with minimal env vars (missing optional ones)
```

### Testing Requirements

**Test 1: Environment Validation**

```typescript
describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Required Variables', () => {
    it('should throw if DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;

      expect(() => getConfig()).toThrow('Missing required env var: DATABASE_URL');
    });

    it('should throw if KIOSK_JWT_SECRET is missing', () => {
      delete process.env.KIOSK_JWT_SECRET;

      expect(() => getConfig()).toThrow('Missing required env var: KIOSK_JWT_SECRET');
    });
  });

  describe('Type Validation', () => {
    it('should parse PORT as number', () => {
      process.env.PORT = '3001';
      const config = getConfig();

      expect(config.port).toBe(3001);
      expect(typeof config.port).toBe('number');
    });

    it('should throw on invalid PORT', () => {
      process.env.PORT = 'invalid';

      expect(() => getConfig()).toThrow('PORT must be a number');
    });

    it('should validate NODE_ENV', () => {
      process.env.NODE_ENV = 'invalid';

      expect(() => getConfig()).toThrow('Invalid NODE_ENV');
    });
  });

  describe('Optional Features', () => {
    it('should have undefined openai when OPENAI_API_KEY missing', () => {
      delete process.env.OPENAI_API_KEY;
      const config = getConfig();

      expect(config.openai).toBeUndefined();
    });

    it('should include openai config when key is set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const config = getConfig();

      expect(config.openai).toBeDefined();
      expect(config.openai?.apiKey).toBe('test-key');
      expect(config.openai?.model).toBe('gpt-4-turbo');
      expect(config.openai?.timeout).toBe(45000);
    });
  });

  describe('Defaults', () => {
    it('should use default rate limit values', () => {
      const config = getConfig();

      expect(config.rateLimit.menuUpdateWindow).toBe(60 * 1000);
      expect(config.rateLimit.menuUpdateMax).toBe(30);
    });

    it('should use default OpenAI timeout', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      delete process.env.OPENAI_API_TIMEOUT_MS;

      const config = getConfig();
      expect(config.openai?.timeout).toBe(45000);
    });
  });
});
```

**Test 2: Env Var Documentation Sync**

```typescript
describe('Environment Variable Documentation', () => {
  it('should have all env vars documented in .env.example', () => {
    const source = fs.readFileSync('server/src/config/environment.ts', 'utf8');
    const envExample = fs.readFileSync('.env.example', 'utf8');

    // Extract all process.env calls
    const envVars = new Set(
      source.match(/process\.env\.([A-Z_]+)/g)?.map(m => m.replace('process.env.', ''))
    );

    for (const varName of envVars) {
      const documented = envExample.includes(`${varName}=`);
      expect(documented).toBe(true, `${varName} not documented in .env.example`);
    }
  });

  it('should document all TIER 1 vars in CLAUDE.md', () => {
    const claudeMd = fs.readFileSync('CLAUDE.md', 'utf8');
    const tier1Vars = ['KIOSK_JWT_SECRET', 'SUPABASE_SERVICE_KEY', 'DATABASE_URL'];

    tier1Vars.forEach(varName => {
      expect(claudeMd).toContain(varName);
      expect(claudeMd).toContain('TIER 1');
    });
  });
});
```

---

## 4. Unbatched API Calls

### Problem Pattern

```typescript
// BROKEN: Loop makes individual API calls
async function generateEmbeddingsForAllItems(restaurantId: string) {
  const items = await db.getMenuItems(restaurantId);

  for (const item of items) {
    // Each item = 1 API call = high cost + slow
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: `${item.name} ${item.description}`
    });
    await db.updateItemEmbedding(item.id, embedding.data[0].vector);
  }
  // For 500 items: 500 API calls = $0.50-$5.00 cost!
  // Duration: 10+ minutes
}
```

### Detection Signals

- Feature is slow (should take seconds, takes minutes)
- API costs increasing unexpectedly
- Rate limiting errors even with high limits
- OpenAI rate limit warnings in logs
- N+1 query patterns (loop over items calling API each time)

### Prevention Checklist

**Code Review - API Call Patterns:**
- [ ] External API calls are batched (not in loops)
- [ ] Batch size reasonable (OpenAI limit is 1000/call for embeddings)
- [ ] Batch size limited by memory (not loading 10K items at once)
- [ ] Rate limit delays between batches (`await sleep(1000)`)
- [ ] Proper error handling per batch
- [ ] Partial success handled (some items fail, others succeed)

**Code Review Questions:**
- Is this loop calling `openai.` / `stripe.` / `fetch()` each iteration?
- What's the cost per call? (Embeddings: $0.02-0.20 per 1M tokens)
- How many items typically processed? (100 items = 100 calls!)
- What's the timeout risk? (1000 calls × 5 sec timeout = 1.4 hours)

**Before Merging:**
```bash
# Find loops with API calls
grep -B 2 -A 2 "for\|forEach" server/src/services/*.ts | \
  grep -B 2 -A 2 "openai\|stripe\|fetch" | head -20

# Verify batching logic exists
grep -r "batch\|chunk\|slice" server/src/services/ --include="*.ts"
```

### Implementation Pattern

**Pattern 1: Batched API Calls with Rate Limiting**

```typescript
// server/src/services/menu-embedding.service.ts
import OpenAI from 'openai';
import { getErrorMessage } from '@rebuild/shared/utils/error-utils';
import { logger } from '../utils/logger';

const EMBEDDING_BATCH_SIZE = 20; // Max 20 items per call
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between batches

export class MenuEmbeddingService {
  private static openai: OpenAI;

  /**
   * Generate embeddings for multiple items in batches
   *
   * Instead of: 500 API calls (1 per item)
   * Use: 25 API calls (20 items per call)
   * Result: 20x faster, 20x cheaper
   */
  static async generateBatchEmbeddings(
    restaurantId: string,
    items: MenuItemForEmbedding[]
  ): Promise<Map<string, number[]>> {
    const embeddings = new Map<string, number[]>();
    const errors: { itemId: string; error: string }[] = [];

    // Process items in batches of EMBEDDING_BATCH_SIZE
    for (let i = 0; i < items.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = items.slice(i, i + EMBEDDING_BATCH_SIZE);

      try {
        // Create batch input: "name | description"
        const inputs = batch.map(item =>
          `${item.name}${item.description ? ' | ' + item.description : ''}`
        );

        // Single API call for entire batch
        logger.info(`Generating embeddings batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}`, {
          restaurantId,
          batchSize: batch.length,
          totalItems: items.length
        });

        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: inputs,
          dimensions: 1536
        });

        // Map results back to items
        response.data.forEach((embeddingData, index) => {
          embeddings.set(batch[index].id, embeddingData.embedding as number[]);
        });

        // Rate limiting: wait between batches (except last)
        if (i + EMBEDDING_BATCH_SIZE < items.length) {
          await sleep(RATE_LIMIT_DELAY_MS);
        }
      } catch (error) {
        // Log batch error but continue with other batches
        const errorMsg = getErrorMessage(error);
        logger.error('Batch embedding generation failed', {
          restaurantId,
          batchIndex: Math.floor(i / EMBEDDING_BATCH_SIZE),
          batchSize: batch.length,
          error: errorMsg
        });

        // Track failed items for retry
        batch.forEach(item => {
          errors.push({
            itemId: item.id,
            error: errorMsg
          });
        });
      }
    }

    // Log summary
    logger.info('Batch embedding generation complete', {
      restaurantId,
      successful: embeddings.size,
      failed: errors.length,
      total: items.length,
      apiCallsUsed: Math.ceil(items.length / EMBEDDING_BATCH_SIZE)
    });

    return embeddings;
  }

  /**
   * Stream batch results to database instead of loading all in memory
   * For large catalogs (10K+ items), prevents memory issues
   */
  static async generateAndSaveEmbeddings(
    restaurantId: string
  ): Promise<{ processed: number; failed: number }> {
    const items = await db.getMenuItems(restaurantId);
    let processed = 0;
    let failed = 0;

    // Process in memory batches
    for (let i = 0; i < items.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = items.slice(i, i + EMBEDDING_BATCH_SIZE);

      try {
        const embeddings = await this.generateBatchEmbeddings(restaurantId, batch);

        // Save immediately instead of accumulating
        for (const [itemId, embedding] of embeddings) {
          await db.updateItemEmbedding(itemId, embedding);
          processed++;
        }

        // Rate limit between batches
        if (i + EMBEDDING_BATCH_SIZE < items.length) {
          await sleep(RATE_LIMIT_DELAY_MS);
        }
      } catch (error) {
        failed += batch.length;
        logger.error('Batch save failed', {
          restaurantId,
          batchIndex: Math.floor(i / EMBEDDING_BATCH_SIZE),
          error: getErrorMessage(error)
        });
      }
    }

    return { processed, failed };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Pattern 2: Batch Processing with Retry Logic**

```typescript
// server/src/services/stripe-sync.service.ts
import Stripe from 'stripe';

export class StripeSyncService {
  private stripe: Stripe;

  /**
   * Sync multiple orders to Stripe in batches
   * Handles partial failures (some succeed, some fail)
   */
  async syncOrdersToStripe(restaurantId: string, orderIds: string[]) {
    const results = {
      succeeded: [] as string[],
      failed: [] as Array<{ orderId: string; error: string }>
    };

    const BATCH_SIZE = 10; // Process 10 orders at a time
    const RETRY_ATTEMPTS = 3;

    for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
      const batch = orderIds.slice(i, i + BATCH_SIZE);

      // Retry logic for failed batches
      for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
        const stillNeedingSync = batch.filter(
          orderId => !results.succeeded.includes(orderId) &&
                     !results.failed.some(f => f.orderId === orderId)
        );

        if (stillNeedingSync.length === 0) break; // All succeeded

        // Process remaining items in parallel (but not in loop!)
        const syncPromises = stillNeedingSync.map(orderId =>
          this.syncSingleOrderSafe(restaurantId, orderId)
            .then(() => results.succeeded.push(orderId))
            .catch(error => results.failed.push({
              orderId,
              error: getErrorMessage(error)
            }))
        );

        await Promise.all(syncPromises);

        if (stillNeedingSync.length === results.failed.length) {
          // All failed this attempt, wait before retry
          await sleep(1000 * attempt); // Exponential backoff
        }
      }
    }

    logger.info('Stripe sync batch complete', {
      restaurantId,
      succeeded: results.succeeded.length,
      failed: results.failed.length,
      totalOrders: orderIds.length
    });

    return results;
  }

  private async syncSingleOrderSafe(
    restaurantId: string,
    orderId: string
  ): Promise<void> {
    const order = await db.getOrder(orderId);

    try {
      await this.stripe.charges.create({
        amount: order.totalAmount * 100,
        currency: 'usd',
        customer: order.stripeCustomerId
      });
    } catch (error) {
      throw new Error(`Stripe sync failed for order ${orderId}: ${getErrorMessage(error)}`);
    }
  }
}
```

**Pattern 3: Chunking Large Datasets**

```typescript
// Utility for batching any operation
export async function batchProcess<T, R>(
  items: T[],
  processor: (items: T[]) => Promise<R[]>,
  options: {
    batchSize: number;
    delayMs?: number;
    onProgress?: (processed: number, total: number) => void;
  }
): Promise<{ succeeded: R[]; failed: Array<{ item: T; error: string }> }> {
  const { batchSize, delayMs = 0, onProgress } = options;
  const succeeded: R[] = [];
  const failed: Array<{ item: T; error: string }> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    try {
      const results = await processor(batch);
      succeeded.push(...results);

      onProgress?.(succeeded.length + failed.length, items.length);

      // Rate limiting between batches
      if (delayMs && i + batchSize < items.length) {
        await sleep(delayMs);
      }
    } catch (error) {
      // If entire batch fails, mark items as failed
      batch.forEach(item => {
        failed.push({
          item,
          error: getErrorMessage(error)
        });
      });
    }
  }

  return { succeeded, failed };
}

// Usage:
const results = await batchProcess(
  allMenuItems,
  async (batch) => {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch.map(item => item.name)
    });
    return response.data;
  },
  {
    batchSize: 20,
    delayMs: 1000,
    onProgress: (processed, total) => {
      logger.info(`Processed ${processed}/${total} items`);
    }
  }
);
```

### Testing Requirements

**Test 1: Batching Reduces API Calls**

```typescript
describe('Batched API Calls', () => {
  it('should batch embeddings instead of individual calls', async () => {
    const items = generateMockItems(100);
    const apiSpy = vi.spyOn(openai.embeddings, 'create');

    await MenuEmbeddingService.generateBatchEmbeddings('restaurant-1', items);

    // With batch size 20: should be 5 calls, not 100
    expect(apiSpy).toHaveBeenCalledTimes(5);
  });

  it('should handle partial batch failures', async () => {
    const items = generateMockItems(50);
    const apiSpy = vi.spyOn(openai.embeddings, 'create');

    // Fail on 2nd batch
    apiSpy.mockResolvedValueOnce({ data: [...] });
    apiSpy.mockRejectedValueOnce(new Error('Rate limit'));
    apiSpy.mockResolvedValueOnce({ data: [...] });

    const result = await MenuEmbeddingService.generateBatchEmbeddings(
      'restaurant-1',
      items
    );

    // Should succeed for batches 1 and 3, fail for batch 2
    expect(result.size).toBeGreaterThan(0);
    expect(result.size).toBeLessThan(50);
  });

  it('should enforce rate limit delays', async () => {
    const items = generateMockItems(50);
    const timeSpy = vi.spyOn(global, 'setTimeout');

    await MenuEmbeddingService.generateBatchEmbeddings('restaurant-1', items);

    // With 50 items and batch size 20: 3 batches = 2 delays
    expect(timeSpy).toHaveBeenCalledTimes(2);
    expect(timeSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
  });
});
```

**Test 2: Cost Calculation**

```typescript
describe('API Cost Optimization', () => {
  it('should calculate cost correctly', () => {
    const items = generateMockItems(500);
    const costPerMillionTokens = 0.02; // $0.02 per 1M tokens for embeddings

    // Unbatched: 500 items * $0.00004 (50k tokens per item) = $20
    const unbatchedCost = 500 * 0.00004;

    // Batched: 25 API calls * $0.00004 * 500 tokens = $0.50
    const batchedCost = 25 * 0.00004 * 500;

    expect(unbatchedCost).toBeGreaterThan(batchedCost * 10);
  });

  it('should log API call count and cost', async () => {
    const items = generateMockItems(100);
    const logSpy = vi.spyOn(logger, 'info');

    await MenuEmbeddingService.generateBatchEmbeddings('restaurant-1', items);

    const lastLog = logSpy.mock.calls[logSpy.mock.calls.length - 1];
    expect(lastLog[1]).toHaveProperty('apiCallsUsed', 5);
  });
});
```

### Documentation Standard

**Update CLAUDE.md:**

```markdown
### External API Integration

**Batch all external API calls:**

1. **Never loop with API calls:**
   ```typescript
   // WRONG: 500 API calls
   for (const item of items) {
     await openai.embeddings.create({ input: item.name });
   }

   // CORRECT: 5 API calls
   const inputs = items.map(item => item.name);
   await openai.embeddings.create({ input: inputs });
   ```

2. **Enforce batch size limits:**
   - OpenAI embeddings: max 1000 per call
   - Stripe: 100 operations per request
   - Database: chunked by memory limits

3. **Implement rate limiting between batches:**
   - Add delays: `await sleep(1000)`
   - Log progress for monitoring
   - Handle partial failures gracefully

4. **Cost calculation before implementation:**
   - Embeddings: $0.02-0.20 per 1M tokens
   - Stripe: $0.29 per successful charge
   - Calculate worst-case cost for full dataset
```

---

## 5. Index Migration Conflicts

### Problem Pattern

```sql
-- BROKEN: Silent conflict possible
-- Migration A: Create index on orders(restaurant_id)
CREATE INDEX orders_restaurant_id_idx ON orders(restaurant_id);

-- Migration B: Create index with same name (another developer)
CREATE INDEX orders_restaurant_id_idx ON orders(status);
-- ERROR if not idempotent: "Index already exists"
-- Or worse: silently uses wrong index
```

### Detection Signals

- Migration fails in production with "index already exists"
- Queries slow because wrong index is being used
- Database has multiple indexes with similar names
- Migrations don't have `IF NOT EXISTS` check
- Different team members add same index

### Prevention Checklist

**Code Review - Migration Safety:**
- [ ] All CREATE/DROP use `IF NOT EXISTS` / `IF EXISTS`
- [ ] Index names are unique (no duplicates across migrations)
- [ ] Index serves actual query patterns (checked against slow logs)
- [ ] Constraints match TypeScript enums (CL-DB-002)
- [ ] No circular dependencies (dropping index used by constraint)
- [ ] Test migration runs in clean database

**Migration Naming Convention:**
- [ ] Indexes named: `[table]_[columns]_[type]`
  - Good: `orders_restaurant_id_status_idx`
  - Bad: `idx_orders`
- [ ] Unique constraints: `[table]_[column]_uk`
  - Good: `users_email_uk`
- [ ] Foreign keys: `[table]_[column]_fk`

**Before Merging:**
```bash
# Check for index name conflicts
grep -r "CREATE INDEX" supabase/migrations/ | \
  sed 's/.*CREATE INDEX //' | \
  sed 's/ ON.*//' | sort | uniq -d

# Verify IF NOT EXISTS/IF EXISTS used
grep -r "CREATE INDEX\|DROP INDEX\|DROP CONSTRAINT" \
  supabase/migrations/*.sql | \
  grep -v "IF NOT EXISTS\|IF EXISTS"
```

### Implementation Pattern

**Pattern 1: Idempotent Index Creation**

```sql
-- ✅ CORRECT: Idempotent, won't fail if exists
-- supabase/migrations/20251227_add_order_indexes.sql

-- Drop old index if it exists (safe cleanup)
DROP INDEX IF EXISTS orders_restaurant_id_idx;

-- Recreate with same logic (or add new index)
CREATE INDEX idx_orders_restaurant_id
  ON public.orders (restaurant_id)
  WHERE deleted_at IS NULL; -- Partial index only for active orders

-- Add composite index for common queries
CREATE INDEX idx_orders_restaurant_status
  ON public.orders (restaurant_id, status)
  WHERE deleted_at IS NULL;

-- Unique constraint for upsert patterns
CREATE UNIQUE INDEX uk_order_items_order_item
  ON public.order_items (order_id, menu_item_id)
  WHERE deleted_at IS NULL;
```

**Pattern 2: Migration with Rollback**

```sql
-- supabase/migrations/20251227_add_customer_indexes.sql

-- Up migration
DO $$
BEGIN
  -- Create main lookup index
  CREATE INDEX IF NOT EXISTS idx_customers_email
    ON public.customers (email)
    WHERE deleted_at IS NULL;

  -- Create partial index for active customers (faster for common queries)
  CREATE INDEX IF NOT EXISTS idx_customers_status
    ON public.customers (status, created_at DESC)
    WHERE deleted_at IS NULL AND status = 'active';

  -- Log successful migration
  RAISE NOTICE 'Customer indexes created successfully';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Customer indexes already exist, skipping creation';
END $$;

-- Rollback (created as separate migration if needed)
-- DROP INDEX IF EXISTS idx_customers_email;
-- DROP INDEX IF EXISTS idx_customers_status;
```

**Pattern 3: Constraint and Index Alignment**

```sql
-- ✅ CORRECT: Constraint values match TypeScript
-- supabase/migrations/20251227_add_order_status_check.sql

-- First: verify all existing data matches allowed values
-- This would catch data issues before constraint
DO $$
DECLARE
  invalid_count INT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.orders
  WHERE status NOT IN (
    'new', 'pending', 'confirmed', 'preparing',
    'ready', 'picked-up', 'completed', 'cancelled'
  );

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % orders with invalid status. Fix before adding constraint.', invalid_count;
  END IF;
END $$;

-- Then: add constraint with values from TypeScript
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check,
  ADD CONSTRAINT orders_status_check
    CHECK (status IN (
      'new', 'pending', 'confirmed', 'preparing',
      'ready', 'picked-up', 'completed', 'cancelled'
    ));

-- Create index to speed up status queries
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders (status)
  WHERE deleted_at IS NULL;
```

### Testing Requirements

**Test 1: Migration Idempotency**

```typescript
// Create a test that runs migrations multiple times
describe('Database Migrations - Idempotency', () => {
  it('should apply migration without errors when run multiple times', async () => {
    // Run migration 1st time
    await runMigration('20251227_add_customer_indexes.sql');

    // Run again - should not throw
    await expect(
      runMigration('20251227_add_customer_indexes.sql')
    ).resolves.not.toThrow();

    // Verify indexes exist
    const indexes = await db.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'customers'
    `);
    expect(indexes).toHaveLength(3);
  });

  it('should not create duplicate indexes', async () => {
    await runMigration('20251227_add_customer_indexes.sql');
    await runMigration('20251227_add_customer_indexes.sql');

    const indexes = await db.query(`
      SELECT COUNT(*) as count FROM pg_indexes
      WHERE tablename = 'customers'
    `);

    expect(indexes[0].count).toBe(3); // Not 6
  });

  it('should handle DROP IF EXISTS correctly', async () => {
    // Create index in schema
    await db.query(`CREATE INDEX test_idx ON customers(email)`);

    // Migration drops it
    await runMigration('drop_test_idx.sql'); // DROP INDEX IF EXISTS test_idx

    // Run again - should not fail
    await expect(
      runMigration('drop_test_idx.sql')
    ).resolves.not.toThrow();
  });
});
```

**Test 2: Index Naming Validation**

```typescript
describe('Migration Index Naming', () => {
  it('should follow naming convention', async () => {
    const migrations = fs.readdirSync('supabase/migrations');

    for (const file of migrations) {
      const content = fs.readFileSync(`supabase/migrations/${file}`, 'utf8');

      // Find all CREATE INDEX statements
      const indexes = content.match(/CREATE INDEX\s+(\w+)/g) || [];

      for (const match of indexes) {
        const indexName = match.replace('CREATE INDEX ', '').trim();

        // Verify naming: idx_[table]_[column] or [table]_[column]_idx
        const validPattern = /^idx_\w+_\w+|^\w+_\w+_idx$/;
        expect(indexName).toMatch(validPattern,
          `Index name "${indexName}" doesn't follow convention`
        );
      }
    }
  });

  it('should not have duplicate index names', async () => {
    const migrations = fs.readdirSync('supabase/migrations');
    const indexNames: string[] = [];

    for (const file of migrations) {
      const content = fs.readFileSync(`supabase/migrations/${file}`, 'utf8');
      const matches = content.match(/CREATE INDEX\s+(\w+)/g) || [];

      matches.forEach(match => {
        const indexName = match.replace('CREATE INDEX ', '').trim();
        if (indexNames.includes(indexName)) {
          throw new Error(`Duplicate index name: ${indexName}`);
        }
        indexNames.push(indexName);
      });
    }

    expect(indexNames).toHaveLength(new Set(indexNames).size);
  });
});
```

**Test 3: Constraint-Enum Alignment**

```typescript
describe('Database Constraints Match Enums', () => {
  it('should have CHECK constraint for all enum types', async () => {
    // Get all enum types from TypeScript
    const orderStatusEnum = ['new', 'pending', 'confirmed', 'preparing',
                            'ready', 'picked-up', 'completed', 'cancelled'];

    // Get constraint from database
    const constraint = await db.query(`
      SELECT pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conname = 'orders_status_check'
    `);

    const constraintDef = constraint[0].pg_get_constraintdef;

    // Verify all enum values are in constraint
    for (const status of orderStatusEnum) {
      expect(constraintDef).toContain(`'${status}'`);
    }
  });

  it('should detect missing enum values in constraint', async () => {
    // TypeScript has new status 'confirmed' that's missing from DB
    const newStatus = 'confirmed';
    const constraint = await db.query(`
      SELECT pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conname = 'orders_status_check'
    `);

    if (!constraint[0].pg_get_constraintdef.includes(`'${newStatus}'`)) {
      throw new Error(`Missing status "${newStatus}" in database constraint`);
    }
  });
});
```

### Documentation Standard

**Create supabase/MIGRATION_GUIDE.md:**

```markdown
# Database Migration Guide

## Idempotency Requirement

**All migrations MUST be idempotent** - can be run multiple times safely.

### Pattern: CREATE with IF NOT EXISTS

```sql
-- ✅ CORRECT
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id
  ON public.orders (restaurant_id);

-- ❌ WRONG - will fail if index exists
CREATE INDEX idx_orders_restaurant_id
  ON public.orders (restaurant_id);
```

### Pattern: DROP with IF EXISTS

```sql
-- ✅ CORRECT
DROP INDEX IF EXISTS old_index_name;
DROP CONSTRAINT IF EXISTS old_constraint_name;

-- ❌ WRONG - will fail if doesn't exist
DROP INDEX old_index_name;
```

## Index Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Regular index | `idx_[table]_[column]` | `idx_orders_restaurant_id` |
| Composite index | `idx_[table]_[col1]_[col2]` | `idx_orders_restaurant_status` |
| Unique index | `[table]_[column]_uk` | `users_email_uk` |
| Foreign key | `[table]_[column]_fk` | `orders_customer_id_fk` |

## Constraint Alignment with TypeScript

When adding a CHECK constraint:

1. **Find TypeScript enum/union:**
   ```typescript
   // shared/types/order.ts
   type OrderStatus = 'new' | 'pending' | 'confirmed' | ...;
   ```

2. **Create matching migration:**
   ```sql
   ALTER TABLE orders
     ADD CONSTRAINT orders_status_check
     CHECK (status IN ('new', 'pending', 'confirmed', ...));
   ```

3. **Verify in tests:**
   ```typescript
   // Test that all TypeScript values are in constraint
   ```

## Testing Migrations

Before committing:

```bash
# Run migration
npm run db:migrate

# Verify idempotency
npm run db:migrate  # Run again, should not fail

# Check indexes exist
psql postgresql://... -c "SELECT * FROM pg_indexes WHERE tablename='orders';"

# Rollback test
npm run db:rollback
npm run db:migrate  # Should work again
```

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| No IF NOT EXISTS | Migration fails if runs twice | Add IF NOT EXISTS |
| Hardcoded data | Can't rollback | Use DO blocks |
| Constraint mismatch | Runtime errors | Add migration test |
| Missing partial index | Slow queries | Include WHERE clause |
| Duplicate index names | Confusion/conflicts | Use unique names |
```

**Update CLAUDE.md:**

```markdown
### Database Migrations

Every migration MUST be idempotent (safe to run multiple times):

```sql
-- ✅ CORRECT: IF NOT EXISTS / IF EXISTS
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
DROP INDEX IF EXISTS old_index_name;

-- ❌ WRONG: No safety check
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
DROP INDEX old_index_name;
```

**Index naming:** `idx_[table]_[column]` or `[table]_[column]_idx`
**Constraint values:** Must match TypeScript enums exactly

See: `supabase/MIGRATION_GUIDE.md`
```

---

## Cross-Cutting Prevention Strategies

### 1. Code Review Checklist (All Issues)

**Apply to every PR:**

```markdown
## Enterprise Audit Prevention Checklist

- [ ] **Rate Limiting & Memory**
  - No `setInterval()/setTimeout()` without storing reference
  - All intervals cleaned up on shutdown
  - No unbounded Map/Array growth

- [ ] **Testing**
  - All new `.ts` files have test counterparts
  - External API calls are mocked
  - Error cases tested (not just happy path)
  - No `skip()` or `xit()` in submitted code

- [ ] **Environment Variables**
  - New vars added to `.env.example`
  - Documented in CLAUDE.md
  - Used via typed config object (not direct `process.env`)

- [ ] **API Integration**
  - No API calls in loops
  - Batch size documented
  - Rate limiting implemented between batches
  - Partial failures handled

- [ ] **Database Migrations**
  - CREATE/DROP use IF NOT EXISTS/IF EXISTS
  - Index names follow convention
  - Constraints match TypeScript enums
```

### 2. Pre-Commit Hook Enhancement

```bash
#!/bin/bash
# .husky/pre-commit

echo "[husky] Running enterprise prevention checks..."

# Check 1: Untracked intervals
if git diff --cached --include="*.ts" --include="*.tsx" | \
   grep -E "setInterval\(|setTimeout\(" | \
   grep -v "const\|let\|var\|this\." > /dev/null; then
  echo "ERROR: Untracked intervals found"
  exit 1
fi

# Check 2: Missing test files
CHANGED_TS=$(git diff --cached --name-only | grep "\.ts$" | grep -v test | grep -v spec)
for file in $CHANGED_TS; do
  TEST_FILE="${file%.ts}.test.ts"
  if [ ! -f "$TEST_FILE" ]; then
    echo "WARNING: No test file for $file"
  fi
done

# Check 3: Env vars documented
CHANGED_ENV_ACCESS=$(git diff --cached | grep "process.env\." | sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' | sort -u)
for var in $CHANGED_ENV_ACCESS; do
  if ! grep -q "^$var=" .env.example; then
    echo "ERROR: process.env.$var not documented in .env.example"
    exit 1
  fi
done

# Check 4: API calls in loops
if git diff --cached --include="*.ts" | \
   grep -B 3 -A 3 "for\|forEach" | \
   grep -q "openai\|stripe\|fetch"; then
  echo "WARNING: API calls in loop detected - consider batching"
fi

# Check 5: IF NOT EXISTS in migrations
CHANGED_SQL=$(git diff --cached --name-only | grep "\.sql$")
for file in $CHANGED_SQL; do
  if git diff --cached "$file" | grep -E "^[\+].*CREATE INDEX|^[\+].*DROP" | \
     grep -v "IF NOT EXISTS\|IF EXISTS" > /dev/null; then
    echo "ERROR: Migration $file missing IF NOT EXISTS/IF EXISTS"
    exit 1
  fi
done

echo "[husky] All checks passed!"
```

### 3. CI/CD Validation

```yaml
# .github/workflows/ci.yml
name: Enterprise Audit Prevention

on: [pull_request]

jobs:
  prevention-checks:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Check 1: Rate Limiting
      - name: Verify interval cleanup
        run: |
          if grep -r "setInterval\|setTimeout" server/src --include="*.ts" | \
             grep -v "const\|let\|var\|this\." > /tmp/untracked.txt; then
            echo "Untracked intervals found:"
            cat /tmp/untracked.txt
            exit 1
          fi

      # Check 2: Test Coverage
      - name: Check test coverage
        run: npm run test:coverage -- --testPathPattern=src --coverage.thresholds.lines=80

      # Check 3: Environment Validation
      - name: Verify env vars documented
        run: npm run test:env-validation

      # Check 4: API Batching
      - name: Check for API calls in loops
        run: |
          if grep -r "for\|forEach" server/src --include="*.ts" | \
             grep -l "openai\|stripe\|fetch" > /tmp/loops.txt 2>/dev/null; then
            echo "API calls in loops detected:"
            cat /tmp/loops.txt
            exit 1
          fi

      # Check 5: Migration Safety
      - name: Validate migrations
        run: npm run test:migrations -- --validate-idempotency
```

### 4. Documentation Sync Script

```bash
#!/bin/bash
# scripts/validate-prevention-strategies.sh

set -e

echo "Validating prevention strategy implementation..."

# Check 1: All process.env vars in code
echo "Checking environment variables..."
UNDOCUMENTED=$(grep -r "process\.env\." server/src --include="*.ts" | \
  sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' | sort -u | \
  while read var; do
    grep -q "^$var=" .env.example || echo "$var"
  done)

if [ -n "$UNDOCUMENTED" ]; then
  echo "ERROR: Undocumented env vars: $UNDOCUMENTED"
  exit 1
fi

# Check 2: Test coverage
echo "Checking test coverage..."
npm run test:coverage -- --coverage.reporters=json
COVERAGE=$(jq '.total.lines.pct' coverage/coverage-final.json)
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
  echo "WARNING: Test coverage below 80%: $COVERAGE%"
fi

# Check 3: Rate limiter cleanup
echo "Checking rate limiter implementation..."
if grep -q "private.*cleanupInterval.*NodeJS.Timeout" server/src/services/*.ts; then
  echo "✓ Rate limiter cleanup interval stored"
else
  echo "ERROR: Rate limiter missing cleanup interval"
  exit 1
fi

# Check 4: Migration safety
echo "Checking migrations..."
for migration in supabase/migrations/*.sql; do
  if grep -E "^CREATE INDEX|^DROP" "$migration" | \
     grep -v "IF NOT EXISTS\|IF EXISTS" > /dev/null; then
    echo "ERROR: Unsafe migration in $migration"
    exit 1
  fi
done

echo "All prevention strategies validated successfully!"
```

---

## Success Metrics

### Metric 1: In-Memory Rate Limiting
**Target:** 0 memory growth from rate limiters
- Memory stable across restarts
- Cleanup intervals running
- Max entries enforced
- Tests verify cleanup

### Metric 2: Test Coverage
**Target:** ≥ 85% overall, ≥ 80% client, ≥ 85% server
- `npm run test:coverage` shows target met
- All new features have tests
- Error paths tested
- CI/CD blocks PRs below threshold

### Metric 3: Environment Variables
**Target:** 100% documented
- Every `process.env.X` in `.env.example`
- Every TIER 1/2 var in CLAUDE.md
- Validation tests pass
- No "what's this var for?" questions

### Metric 4: API Batching
**Target:** 0 unbatched API calls in loops
- Grep for API calls in loops returns 0
- Batch sizes documented
- Rate limiting between batches
- Cost calculations in code comments

### Metric 5: Index Migration Conflicts
**Target:** 0 migration failures due to conflicts
- All migrations idempotent
- Unique index names
- Constraints match TypeScript
- Migration tests pass

---

## Implementation Timeline

### Week 1: Immediate Actions
- [ ] Update `.env.example` with full documentation
- [ ] Add environment validation tests
- [ ] Enhance pre-commit hook
- [ ] Create migration guide

### Week 2: Code Patterns
- [ ] Implement rate limiter cleanup examples
- [ ] Create batching utility functions
- [ ] Add test templates
- [ ] Update CLAUDE.md sections

### Week 3: Automation
- [ ] Implement ESLint rules
- [ ] Add CI/CD checks
- [ ] Create validation scripts
- [ ] Set up code review automation

### Week 4: Team Enablement
- [ ] Train team on patterns
- [ ] Share quick references
- [ ] Review existing code for gaps
- [ ] Set up monitoring/alerts

---

## Related Documentation

- [CL-MEM-001: Memory Leaks from Intervals](./CL-MEM-001-interval-leaks.md)
- [CL-DB-002: Database Constraint Drift](./CL-DB-002-constraint-drift-prevention.md)
- [CL-TIMER-001: Stored Timeout Pattern](./CL-TIMER-001-stored-timeout-pattern.md)
- [PREVENTION_STRATEGIES_API_ERROR_HANDLING.md](./PREVENTION_STRATEGIES_API_ERROR_HANDLING.md)
- [QUICK_REFERENCE_PATTERNS.md](./QUICK_REFERENCE_PATTERNS.md)

---

**Document Created:** 2025-12-27
**Status:** Complete Prevention Strategy Framework
**Next Review:** Q1 2026
**Owner:** Architecture & Quality Team

---

## Quick Reference Checklist

Before submitting any PR, verify:

```
CODE QUALITY
[ ] No setInterval/setTimeout without storing reference
[ ] All intervals cleaned up on shutdown
[ ] No unbounded Map/Array growth

TESTING
[ ] Test files exist for all new code
[ ] External APIs mocked
[ ] Error paths tested
[ ] Coverage ≥ 80%

ENVIRONMENT
[ ] New vars in .env.example
[ ] Documented in CLAUDE.md
[ ] Using typed config object
[ ] Validation tests pass

APIS
[ ] No API calls in loops
[ ] Batch size specified
[ ] Rate limiting between batches
[ ] Partial failures handled

DATABASE
[ ] Migrations use IF NOT EXISTS/IF EXISTS
[ ] Unique index names
[ ] Constraints match enums
[ ] Migration tests pass
```

Keep this checklist in your pre-commit or PR template.
