---
status: pending
priority: p2
issue_id: "087"
tags: [code-review, security, api]
dependencies: []
---

# Error Message Disclosure in Voice Ordering API

## Problem Statement

The realtime voice ordering endpoint returns raw OpenAI error messages directly to clients, potentially leaking internal configuration details and service provider information. This violates security best practices for API error handling.

## Findings

**Location:** `server/routes/realtime.routes.ts:484-493`

```typescript
} catch (error) {
  logger.error('Error creating ephemeral token:', error);
  res.status(500).json({
    error: 'Failed to create ephemeral token',
    details: error instanceof Error ? error.message : 'Unknown error'
  });
}
```

**Issues:**
1. OpenAI error messages exposed directly via `error.message`
2. Could reveal:
   - API key format/validation issues
   - Rate limit thresholds
   - Internal service dependencies
   - Model availability/configuration
3. Violates principle of least privilege for error information
4. Makes it easier for attackers to probe the API

**Example Leaked Information:**
- "Invalid API key format" → reveals authentication mechanism
- "Rate limit exceeded: 500 requests per minute" → reveals quotas
- "Model gpt-4-realtime not available" → reveals model configuration

## Proposed Solutions

### Option 1: Generic Error Response (Recommended)
```typescript
} catch (error) {
  logger.error('Error creating ephemeral token:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    restaurantId: session.user.restaurant_id
  });

  res.status(500).json({
    error: 'Voice ordering temporarily unavailable',
    code: 'VOICE_ORDER_UNAVAILABLE'
  });
}
```

### Option 2: Error Code Mapping
```typescript
const ERROR_CODES = {
  'Invalid API key': 'SERVICE_CONFIGURATION_ERROR',
  'Rate limit': 'SERVICE_TEMPORARILY_UNAVAILABLE',
  'Model not available': 'SERVICE_TEMPORARILY_UNAVAILABLE',
  default: 'VOICE_ORDER_UNAVAILABLE'
};

function getSafeErrorCode(error: Error): string {
  for (const [pattern, code] of Object.entries(ERROR_CODES)) {
    if (error.message.includes(pattern)) {
      return code;
    }
  }
  return ERROR_CODES.default;
}

// In catch block:
res.status(500).json({
  error: 'Voice ordering temporarily unavailable',
  code: getSafeErrorCode(error)
});
```

### Option 3: Development vs Production Modes
```typescript
} catch (error) {
  logger.error('Error creating ephemeral token:', error);

  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    error: 'Voice ordering temporarily unavailable',
    ...(isDevelopment && {
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  });
}
```

## Implementation Checklist

- [ ] Audit all error responses in `realtime.routes.ts`
- [ ] Replace direct error.message exposure with generic messages
- [ ] Ensure full error details logged server-side for debugging
- [ ] Add error code constants for client error handling
- [ ] Update client to handle generic error codes gracefully
- [ ] Test error scenarios don't leak sensitive information
- [ ] Document error codes in API documentation

## Related Files

- `/Users/mikeyoung/CODING/rebuild-6.0/server/routes/realtime.routes.ts`
- Other API routes that may have similar issues

## Security Impact

**Severity:** Medium (P2)
- Does not directly expose credentials
- Aids reconnaissance for potential attackers
- Violates defense-in-depth principles
- Quick fix with low risk
