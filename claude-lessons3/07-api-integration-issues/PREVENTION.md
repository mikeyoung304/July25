# API Integration Prevention Strategies

**Created:** 2025-11-19
**Category:** Prevention & Monitoring
**Based on:** 168 bug fixes over 6 months

---

## Core Prevention Strategy

**The 3-Layer Defense:**
1. **Startup Validation** - Catch config issues before production traffic
2. **Runtime Protection** - Timeouts, retries, circuit breakers
3. **Monitoring & Alerts** - Detect issues before customers report them

---

## Layer 1: Startup Validation

### Environment Variable Validation

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/config/env.ts`

```typescript
/**
 * Validate all required environment variables at startup
 * Fails fast with descriptive errors before accepting traffic
 */
export const validateEnvironment = (): void => {
  const required = [
    'OPENAI_API_KEY',
    'SQUARE_ACCESS_TOKEN',
    'SUPABASE_SERVICE_KEY',
    'KIOSK_JWT_SECRET'
  ];

  const errors: string[] = [];

  for (const key of required) {
    const value = process.env[key];

    // Check if missing
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
      continue;
    }

    // Check for malformed values (newlines from CLI)
    const trimmed = value.trim();
    if (trimmed.includes('\n') || trimmed.includes('\\n') || trimmed.includes('\r')) {
      errors.push(
        `Environment variable ${key} contains invalid characters (newlines). ` +
        `Fix: Use "echo -n" when setting via CLI.`
      );
    }

    // Check for placeholder values
    if (trimmed === 'CHANGEME' || trimmed === 'TODO' || trimmed === 'demo') {
      errors.push(
        `Environment variable ${key} contains placeholder value: ${trimmed}`
      );
    }

    // Trim and update
    process.env[key] = trimmed;
  }

  if (errors.length > 0) {
    console.error(' Environment validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    throw new Error('Invalid environment configuration');
  }

  console.log(' Environment validation passed');
};

// Run before starting server
validateEnvironment();
```

### API Key Validation

```typescript
/**
 * Validate API keys work before accepting traffic
 * Catches malformed keys, expired tokens, wrong environment
 */
export const validateApiKeys = async (): Promise<void> => {
  const checks: Promise<void>[] = [];

  // OpenAI API
  checks.push(
    (async () => {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`
          }
        });

        if (!response.ok) {
          throw new Error(`OpenAI API key validation failed: ${response.status}`);
        }
      } catch (error) {
        throw new Error(`OpenAI API key invalid: ${error.message}`);
      }
    })()
  );

  // Square API
  checks.push(
    (async () => {
      try {
        const client = new SquareClient({
          accessToken: env.SQUARE_ACCESS_TOKEN,
          environment: env.SQUARE_ENVIRONMENT
        });

        const { result } = await client.locationsApi.listLocations();

        if (!result.locations || result.locations.length === 0) {
          throw new Error('Square API key has no locations');
        }
      } catch (error) {
        throw new Error(`Square API key invalid: ${error.message}`);
      }
    })()
  );

  // Supabase Connection
  checks.push(
    (async () => {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('id')
          .limit(1);

        if (error) {
          throw new Error(`Supabase connection failed: ${error.message}`);
        }
      } catch (error) {
        throw new Error(`Supabase connection invalid: ${error.message}`);
      }
    })()
  );

  await Promise.all(checks);
  console.log(' API key validation passed');
};
```

### Startup Checklist

```typescript
/**
 * Complete startup validation sequence
 * Called in server.ts before app.listen()
 */
export const runStartupChecks = async (): Promise<void> => {
  console.log(' Running startup checks...');

  // 1. Environment variables
  validateEnvironment();

  // 2. Database connection
  await validateDatabaseConnection();

  // 3. API keys
  if (process.env.NODE_ENV === 'production') {
    await validateApiKeys();
  }

  // 4. Required tables exist
  await validateDatabaseSchema();

  // 5. Migrations up to date
  await validateMigrations();

  console.log(' All startup checks passed');
};
```

---

## Layer 2: Runtime Protection

### Timeout Implementation

```typescript
/**
 * Universal timeout wrapper for all external APIs
 * Default: 30 seconds for most operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Usage examples
const payment = await withTimeout(
  paymentsApi.create(request),
  30000,
  'Square payment creation'
);

const user = await withTimeout(
  supabase.from('users').select('*').eq('id', userId).single(),
  5000,
  'User database query'
);

const session = await withTimeout(
  openai.createRealtimeSession(),
  60000,
  'OpenAI Realtime session creation'
);
```

### Retry Logic with Exponential Backoff

```typescript
/**
 * Retry transient failures with exponential backoff
 * Does NOT retry client errors (4xx)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry client errors (4xx)
      if (error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Calculate exponential backoff with jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const delayMs = Math.min(exponentialDelay + jitter, maxDelayMs);

      // Log retry attempt
      logger.warn('Retrying after error', {
        attempt: attempt + 1,
        maxRetries,
        delayMs,
        error: lastError.message
      });

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

// Usage
const result = await withRetry(
  () => withTimeout(apiCall(), 30000, 'API call'),
  {
    maxRetries: 3,
    baseDelayMs: 1000,
    onRetry: (attempt, error) => {
      logger.info('Retrying API call', { attempt, error: error.message });
    }
  }
);
```

### Circuit Breaker

```typescript
/**
 * Circuit breaker to prevent cascading failures
 * Opens after threshold failures, closes after timeout
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      logger.error('Circuit breaker opened', {
        failureCount: this.failureCount,
        threshold: this.threshold
      });
    }
  }

  private reset(): void {
    this.failureCount = 0;
    this.state = 'closed';
    logger.info('Circuit breaker closed');
  }
}

// Usage
const squareBreaker = new CircuitBreaker(5, 60000);

const payment = await squareBreaker.execute(() =>
  withTimeout(
    paymentsApi.create(request),
    30000,
    'Square payment creation'
  )
);
```

### Two-Phase Audit Logging

```typescript
/**
 * Log intent before external API call
 * Update log with result after
 */
export class AuditLogger {
  /**
   * Phase 1: Log intent before API call
   */
  static async logIntent(
    operation: string,
    metadata: Record<string, any>
  ): Promise<string> {
    const auditId = uuidv4();

    await supabase.from('audit_logs').insert({
      id: auditId,
      operation,
      status: 'initiated',
      metadata,
      created_at: new Date().toISOString()
    });

    return auditId;
  }

  /**
   * Phase 2: Update log with result
   */
  static async logResult(
    auditId: string,
    status: 'success' | 'failed',
    result?: Record<string, any>
  ): Promise<void> {
    await supabase
      .from('audit_logs')
      .update({
        status,
        result,
        updated_at: new Date().toISOString()
      })
      .eq('id', auditId);
  }
}

// Usage
const auditId = await AuditLogger.logIntent('payment_creation', {
  orderId: order_id,
  amount: amount,
  restaurantId: restaurant_id
});

try {
  const payment = await withTimeout(
    paymentsApi.create(request),
    30000,
    'Square payment creation'
  );

  await AuditLogger.logResult(auditId, 'success', {
    paymentId: payment.id
  });
} catch (error) {
  await AuditLogger.logResult(auditId, 'failed', {
    error: error.message
  });
  throw error;
}
```

---

## Layer 3: Monitoring & Alerts

### Health Check Endpoints

```typescript
/**
 * Health check for all external dependencies
 * Called by monitoring systems every 60 seconds
 */
router.get('/health', async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: false,
      openai: false,
      square: false,
      supabase: false
    }
  };

  // Database connectivity
  try {
    await supabase.from('restaurants').select('id').limit(1);
    checks.checks.database = true;
  } catch (error) {
    checks.status = 'unhealthy';
    logger.error('Health check: Database failed', { error });
  }

  // OpenAI API
  try {
    const apiKey = env.OPENAI_API_KEY;
    const isValid = apiKey &&
      !apiKey.includes('\n') &&
      !apiKey.includes('\\n') &&
      apiKey.length > 20;
    checks.checks.openai = isValid;
  } catch (error) {
    checks.status = 'unhealthy';
    logger.error('Health check: OpenAI failed', { error });
  }

  // Square API
  try {
    const token = env.SQUARE_ACCESS_TOKEN;
    const isValid = token &&
      !token.includes('\n') &&
      token.length > 20;
    checks.checks.square = isValid;
  } catch (error) {
    checks.status = 'unhealthy';
    logger.error('Health check: Square failed', { error });
  }

  // Supabase Auth
  try {
    const key = env.SUPABASE_SERVICE_KEY;
    const isValid = key && key.length > 20;
    checks.checks.supabase = isValid;
  } catch (error) {
    checks.status = 'unhealthy';
    logger.error('Health check: Supabase failed', { error });
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});
```

### Metrics Collection

```typescript
/**
 * Collect API performance metrics
 * Track timeouts, errors, latency
 */
export class ApiMetrics {
  private static metrics = new Map<string, {
    calls: number;
    errors: number;
    timeouts: number;
    totalLatency: number;
  }>();

  static recordCall(
    provider: string,
    latencyMs: number,
    error?: boolean,
    timeout?: boolean
  ): void {
    const current = this.metrics.get(provider) || {
      calls: 0,
      errors: 0,
      timeouts: 0,
      totalLatency: 0
    };

    current.calls++;
    current.totalLatency += latencyMs;

    if (error) current.errors++;
    if (timeout) current.timeouts++;

    this.metrics.set(provider, current);
  }

  static getMetrics(provider: string) {
    const metrics = this.metrics.get(provider);
    if (!metrics) return null;

    return {
      calls: metrics.calls,
      errors: metrics.errors,
      timeouts: metrics.timeouts,
      errorRate: metrics.errors / metrics.calls,
      timeoutRate: metrics.timeouts / metrics.calls,
      avgLatency: metrics.totalLatency / metrics.calls
    };
  }

  static reset(): void {
    this.metrics.clear();
  }
}

// Metrics endpoint
router.get('/metrics', (req, res) => {
  const providers = ['openai', 'square', 'supabase'];
  const metrics = {};

  for (const provider of providers) {
    metrics[provider] = ApiMetrics.getMetrics(provider);
  }

  res.json(metrics);
});
```

### Alert Conditions

```typescript
/**
 * Alert on critical conditions
 * Send to Slack, PagerDuty, etc.
 */
export class AlertManager {
  static async checkAndAlert(): Promise<void> {
    // Alert on high error rate
    const openaiMetrics = ApiMetrics.getMetrics('openai');
    if (openaiMetrics && openaiMetrics.errorRate > 0.1) {
      await this.sendAlert('OpenAI API error rate > 10%', {
        errorRate: openaiMetrics.errorRate,
        calls: openaiMetrics.calls,
        errors: openaiMetrics.errors
      });
    }

    // Alert on high timeout rate
    const squareMetrics = ApiMetrics.getMetrics('square');
    if (squareMetrics && squareMetrics.timeoutRate > 0.05) {
      await this.sendAlert('Square API timeout rate > 5%', {
        timeoutRate: squareMetrics.timeoutRate,
        calls: squareMetrics.calls,
        timeouts: squareMetrics.timeouts
      });
    }

    // Alert on stale audit logs
    const { data: staleAudits } = await supabase
      .from('payment_audit_logs')
      .select('id')
      .eq('status', 'initiated')
      .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (staleAudits && staleAudits.length > 0) {
      await this.sendAlert('Stale audit logs detected', {
        count: staleAudits.length
      });
    }
  }

  private static async sendAlert(
    message: string,
    context: Record<string, any>
  ): Promise<void> {
    logger.error('ALERT: ' + message, context);

    // Send to Slack
    if (env.SLACK_WEBHOOK_URL) {
      await fetch(env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 ${message}`,
          attachments: [{
            color: 'danger',
            fields: Object.entries(context).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true
            }))
          }]
        })
      });
    }
  }
}

// Run every 5 minutes
setInterval(() => {
  AlertManager.checkAndAlert();
}, 5 * 60 * 1000);
```

### Provider Changelog Monitoring

```typescript
/**
 * Monitor provider changelogs for breaking changes
 * Daily check of OpenAI, Square, Supabase updates
 */
export class ChangelogMonitor {
  private static feeds = [
    {
      name: 'OpenAI',
      url: 'https://platform.openai.com/docs/changelog',
      keywords: ['deprecat', 'breaking', 'removed', 'discontinued']
    },
    {
      name: 'Square',
      url: 'https://developer.squareup.com/blog/rss',
      keywords: ['deprecat', 'breaking', 'sunset', 'end of life']
    },
    {
      name: 'Supabase',
      url: 'https://supabase.com/changelog',
      keywords: ['breaking', 'migration', 'upgrade required']
    }
  ];

  static async checkChangelogs(): Promise<void> {
    for (const feed of this.feeds) {
      try {
        const response = await fetch(feed.url);
        const content = await response.text();

        // Check for keywords
        const foundKeywords = feed.keywords.filter(keyword =>
          content.toLowerCase().includes(keyword.toLowerCase())
        );

        if (foundKeywords.length > 0) {
          await this.sendAlert(`${feed.name} changelog contains breaking changes`, {
            url: feed.url,
            keywords: foundKeywords
          });
        }
      } catch (error) {
        logger.warn('Failed to check changelog', {
          feed: feed.name,
          error: error.message
        });
      }
    }
  }

  private static async sendAlert(
    message: string,
    context: Record<string, any>
  ): Promise<void> {
    logger.warn('CHANGELOG ALERT: ' + message, context);

    // Send notification
    if (env.SLACK_WEBHOOK_URL) {
      await fetch(env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `📰 ${message}`,
          attachments: [{
            color: 'warning',
            fields: Object.entries(context).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: false
            }))
          }]
        })
      });
    }
  }
}

// Run daily at 9 AM
schedule('0 9 * * *', () => {
  ChangelogMonitor.checkChangelogs();
});
```

---

## Prevention Checklist

### Before Production Deployment

- [ ] All environment variables validated at startup
- [ ] API keys tested with real provider calls
- [ ] Timeouts added to all external API calls (30s default)
- [ ] Retry logic with exponential backoff implemented
- [ ] Two-phase audit logging for critical operations
- [ ] Health check endpoint returns all dependency status
- [ ] Metrics collection for API calls, errors, timeouts
- [ ] Alert conditions configured (error rate, timeout rate)
- [ ] Provider changelog monitoring set up
- [ ] Circuit breakers for high-failure endpoints

### Daily Operations

- [ ] Check health endpoint status
- [ ] Review API metrics (error rate, timeout rate, latency)
- [ ] Check for stale audit logs (>5 minutes old)
- [ ] Review provider changelogs for breaking changes
- [ ] Check alert history for patterns
- [ ] Review error logs for new issues

### Weekly Operations

- [ ] Smoke test critical flows with production API keys
- [ ] Review API performance trends
- [ ] Check for deprecated API usage
- [ ] Update provider SDK versions
- [ ] Review circuit breaker open events
- [ ] Test failover and recovery procedures

---

## Related Documentation

- [README.md](./README.md) - Executive summary
- [PATTERNS.md](./PATTERNS.md) - API patterns and best practices
- [INCIDENTS.md](./INCIDENTS.md) - Detailed incident reports
- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Code examples
- [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md) - AI development guidelines

---

**Last Updated:** 2025-11-19
**Prevention Strategies:** 10 layers of defense
**Maintainer:** Technical Lead
