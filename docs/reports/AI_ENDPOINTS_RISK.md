# AI Endpoints Security Risk Assessment

## Executive Summary
Audit of AI-related endpoints reveals several endpoints without authentication, primarily health checks and transcription services. While health endpoints are typically public, the transcription endpoints pose a potential abuse risk.

## Endpoint Inventory

### Unauthenticated Endpoints (Auth: None)

| Endpoint | Method | Purpose | Risk Level | Recommendation |
|----------|--------|---------|------------|----------------|
| `/api/v1/ai/transcribe` | POST | Audio transcription | 🟡 **MEDIUM** | Add rate limiting |
| `/api/v1/ai/transcribe-with-metadata` | POST | Transcription + metadata | 🟡 **MEDIUM** | Add rate limiting |
| `/api/v1/ai/test-transcribe` | POST | Test endpoint | 🔴 **HIGH** | Remove or auth-gate |
| `/api/v1/ai/health` | GET | Service health check | 🟢 **LOW** | Keep public |
| `/api/v1/realtime/health` | GET | Realtime health check | 🟢 **LOW** | Keep public |
| `/healthz` | GET | Server health | 🟢 **LOW** | Keep public |
| `/health` | GET | Basic health | 🟢 **LOW** | Keep public |
| `/health/detailed` | GET | Detailed health | 🟡 **MEDIUM** | Consider auth |
| `/voice/health` | GET | Voice service health | 🟢 **LOW** | Keep public |

### Rate Limited Endpoints

```typescript
// Currently rate limited
const transcriptionLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10 // 10 requests per minute
});

router.post('/transcribe', transcriptionLimiter, ...)
router.post('/transcribe-with-metadata', transcriptionLimiter, ...)
```

## Risk Analysis

### 1. Transcription Endpoints (MEDIUM RISK)

**Current State**:
- No authentication required
- Basic rate limiting (10 req/min)
- Accepts audio files up to 10MB

**Vulnerabilities**:
- Cost amplification attack (OpenAI API charges)
- Resource exhaustion (CPU/memory)
- Data exfiltration via audio
- IP rotation bypass of rate limiting

**Recommended Mitigations**:
```typescript
// Add stricter rate limiting
const strictTranscriptionLimiter = rateLimit({
  windowMs: 60000,
  max: 5, // Reduce to 5/min
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      endpoint: req.path
    });
    res.status(429).json({
      error: 'Too many requests. Please try again later.'
    });
  }
});

// Add file size validation
const validateAudioFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file' });
  }
  
  // Max 5MB for unauthenticated
  if (req.file.size > 5 * 1024 * 1024) {
    return res.status(413).json({ error: 'File too large' });
  }
  
  // Validate MIME type
  const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/webm'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(415).json({ error: 'Invalid file type' });
  }
  
  next();
};
```

### 2. Test Transcribe Endpoint (HIGH RISK)

**Current State**:
- Completely open endpoint
- No rate limiting
- Marked as "for testing"

**Recommendation**: **REMOVE IN PRODUCTION**
```typescript
// This should be removed or protected
if (process.env.NODE_ENV !== 'production') {
  router.post('/test-transcribe', ...)
}
```

### 3. Detailed Health Endpoint (MEDIUM RISK)

**Current State**:
- Exposes internal metrics
- Shows database status
- Reveals system information

**Vulnerabilities**:
- Information disclosure
- Attack surface mapping
- Version fingerprinting

**Recommendation**:
```typescript
router.get('/health/detailed', 
  authenticate, // Require auth
  requireRole(['admin', 'manager']), // Admin only
  async (_req, res) => {
    // ... detailed health data
  }
);
```

## Cost Impact Analysis

### OpenAI API Costs
- Whisper transcription: ~$0.006/minute
- Potential abuse: 10 req/min × 60 min × 24 hr = **14,400 requests/day**
- Maximum daily cost exposure: **~$86/day** ($2,580/month)

### Mitigation Strategies

1. **Implement API Key Requirement**
```typescript
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ 
      error: 'API key required' 
    });
  }
  
  next();
};

router.post('/transcribe', 
  requireApiKey,
  strictTranscriptionLimiter,
  validateAudioFile,
  async (req, res) => { /* ... */ }
);
```

2. **Add IP-based Blocking**
```typescript
const ipBlocklist = new Set();
const maxFailures = 5;
const failureWindow = 300000; // 5 minutes

const trackFailures = (req, res, next) => {
  const ip = req.ip;
  
  if (ipBlocklist.has(ip)) {
    return res.status(403).json({ 
      error: 'IP blocked' 
    });
  }
  
  next();
};
```

3. **Implement CAPTCHA for Public Endpoints**
```typescript
const verifyCaptcha = async (req, res, next) => {
  const token = req.headers['x-captcha-token'];
  
  if (!token || !await validateCaptcha(token)) {
    return res.status(403).json({ 
      error: 'CAPTCHA verification required' 
    });
  }
  
  next();
};
```

## Recommended Implementation Priority

### Immediate (P0) - Deploy Today
1. ❌ Remove `/test-transcribe` endpoint
2. ⚠️ Reduce rate limit to 5 req/min for transcription
3. ⚠️ Add file size limit (5MB max)

### Short-term (P1) - This Week
1. Add API key requirement for transcription
2. Implement IP blocklist for abuse
3. Add auth to detailed health endpoint
4. Enhance logging for all AI endpoints

### Long-term (P2) - This Month
1. Implement usage quotas per API key
2. Add CAPTCHA for public endpoints
3. Set up cost alerts for OpenAI usage
4. Implement request signing

## Monitoring & Alerting

### Metrics to Track
- Requests per minute by endpoint
- Unique IPs per hour
- Total audio minutes processed
- OpenAI API costs per day
- Failed authentication attempts

### Alert Thresholds
- Rate limit exceeded >100 times/hour
- Single IP >50 requests/hour
- Daily cost >$50
- New IP accessing test endpoints

## Conclusion

While most health endpoints pose minimal risk, the transcription endpoints present a **medium risk** due to potential cost amplification attacks. The test endpoint should be **removed immediately** in production.

**Overall Risk Level: 🟡 MEDIUM**

### Immediate Actions Required
1. Remove test-transcribe endpoint
2. Tighten rate limits on transcription
3. Add file validation
4. Implement cost monitoring

### Success Metrics
- Zero unauthorized API usage
- <$10/day OpenAI costs from public endpoints
- No service disruptions from abuse
- Complete audit trail of all AI usage

---
*Risk Assessment Date: January 30, 2025*  
*Next Review: February 15, 2025*  
*Assessor: Security Audit System*