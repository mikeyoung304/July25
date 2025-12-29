# SECURITY THREAT MODEL

**Audit Date**: 2025-12-28
**System**: Grow / Restaurant OS (rebuild-6.0)
**Threat Modeling Method**: STRIDE + Attack Trees

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           THREAT SURFACE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   EXTERNAL NETWORK                    RESTAURANT NETWORK                 │
│   ┌─────────────┐                     ┌─────────────────────────────┐   │
│   │  Attackers  │                     │   Shared Devices            │   │
│   │  - Script   │                     │   ┌───────┐  ┌───────────┐  │   │
│   │    kiddies  │◄───── Internet ────►│   │ POS   │  │ KDS/Expo  │  │   │
│   │  - Fraud    │                     │   │Tablet │  │  Display  │  │   │
│   │  - Ransom   │                     │   └───────┘  └───────────┘  │   │
│   └─────────────┘                     └─────────────────────────────┘   │
│                                                    │                     │
│                                                    ▼                     │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │                    APPLICATION LAYER                          │      │
│   │  ┌─────────┐      ┌─────────┐      ┌─────────────────────┐   │      │
│   │  │ React   │─────►│ Express │─────►│    Supabase         │   │      │
│   │  │ Client  │ JWT  │ Server  │ JWT  │  (PostgreSQL+Auth)  │   │      │
│   │  └─────────┘      └─────────┘      └─────────────────────┘   │      │
│   │       │                │                      │               │      │
│   │       ▼                ▼                      ▼               │      │
│   │  localStorage     Rate Limiter            RLS Policies       │      │
│   │  (VULNERABLE)     (In-Memory)             (Defense Layer)    │      │
│   └──────────────────────────────────────────────────────────────┘      │
│                                                    │                     │
│                                                    ▼                     │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │                    EXTERNAL SERVICES                          │      │
│   │         Stripe API          OpenAI API         Twilio         │      │
│   └──────────────────────────────────────────────────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Threat Actors

### 1. External Attackers

| Actor | Capability | Motivation | Likely Attack Vector |
|-------|-----------|------------|---------------------|
| Script Kiddies | Low | Fame, practice | Automated scanners, known CVEs |
| Fraud Operators | Medium | Financial gain | Payment manipulation, refund abuse |
| Ransomware Groups | High | Extortion | Data exfiltration, service disruption |
| Competitors | Medium | Competitive advantage | Data theft, reputation damage |

### 2. Insider Threats

| Actor | Access Level | Motivation | Likely Attack Vector |
|-------|-------------|------------|---------------------|
| Disgruntled Employee | PIN auth | Revenge, theft | Order manipulation, data access |
| Malicious Manager | Full web access | Theft, sabotage | Configuration changes, data export |
| Restaurant Owner (Multi-tenant) | Own tenant | Access competitor data | Cross-tenant queries |

### 3. Accidental Threats

| Actor | Scenario | Impact |
|-------|----------|--------|
| Staff on shared device | Forgets to log out | Next user sees previous orders |
| Developer | Misconfiguration | Exposes secrets, disables auth |
| Vendor (OpenAI/Stripe) | API key leak | Financial/data exposure |

---

## Attack Trees

### Attack Tree 1: Unauthorized Data Access

```
GOAL: Access another restaurant's data
├── [OR] Bypass Authentication
│   ├── [AND] Forge Demo JWT
│   │   ├── Know JWT signing algorithm (HS256 - common)
│   │   ├── Set sub = "demo:evil"
│   │   └── Sign with weak/guessed secret
│   │       └── Try: "station-secret-change-in-production" ← KNOWN WEAK
│   │
│   ├── [AND] Steal localStorage Token (via XSS)
│   │   ├── Find XSS vulnerability in UI
│   │   ├── Inject script: localStorage.getItem('token')
│   │   └── Exfiltrate to attacker server
│   │
│   └── [AND] Brute Force PIN
│       ├── Enumerate users via timing attack
│       ├── Bypass rate limit (server restart)
│       └── Try common PINs (1234, 0000)
│
├── [OR] Bypass Authorization
│   ├── [AND] Manipulate restaurant_id header
│   │   ├── Find endpoint without STRICT_AUTH
│   │   └── Set X-Restaurant-ID to target
│   │
│   └── [AND] Exploit RLS Gap
│       ├── Find table without RLS policy
│       └── Query directly via compromised Supabase key
│
└── [OR] Exploit Shared Device
    ├── Access logged-in tablet in restaurant
    ├── Read localStorage tokens
    └── Access any restaurant user was authenticated for
```

### Attack Tree 2: Financial Fraud

```
GOAL: Steal money or cause financial loss
├── [OR] Payment Manipulation
│   ├── [AND] Modify payment amount client-side
│   │   ├── Intercept request
│   │   ├── Change amount to $0.01
│   │   └── BLOCKED: Server recalculates from DB
│   │
│   ├── [AND] Duplicate refunds
│   │   ├── Initiate refund request
│   │   ├── Network timeout/retry
│   │   └── No idempotency key → VULNERABLE
│   │
│   └── [AND] Webhook replay attack
│       ├── Capture successful payment webhook
│       ├── Replay to different order
│       └── No timestamp check → VULNERABLE
│
├── [OR] Order Manipulation
│   ├── [AND] Change order after payment
│   │   ├── Access order via stolen token
│   │   ├── Modify items
│   │   └── State machine blocks paid order changes? → VERIFY
│   │
│   └── [AND] Free orders via status manipulation
│       ├── Skip payment, mark as completed
│       └── BLOCKED: Status transitions enforced
│
└── [OR] Refund Fraud
    ├── Claim false order issue
    ├── Request refund
    └── Keep food + money
```

### Attack Tree 3: Service Disruption

```
GOAL: Make system unavailable
├── [OR] Exhaust Resources
│   ├── [AND] Rate limit bypass
│   │   ├── Trigger server restart
│   │   ├── In-memory limits cleared
│   │   └── Flood with requests
│   │
│   ├── [AND] Memory exhaustion
│   │   ├── Trigger embedding generation flood
│   │   ├── 4GB limit exceeded
│   │   └── Server OOM crash
│   │
│   └── [AND] Database connection exhaustion
│       ├── Open many WebSocket connections
│       └── Pool exhausted
│
├── [OR] Lock Out Legitimate Users
│   ├── [AND] Trigger account lockouts
│   │   ├── Target known user PINs
│   │   ├── Fail 5 attempts each
│   │   └── All staff locked out
│   │
│   └── [AND] Invalidate sessions
│       ├── Change JWT secret (if admin access)
│       └── All tokens invalid
│
└── [OR] Data Corruption
    ├── [AND] Orphan orders in bad state
    │   ├── Find edge case in state machine
    │   └── Leave orders stuck
    │
    └── [AND] Corrupt audit logs
        ├── Gain write access to audit table
        └── BLOCKED: Insert-only, no updates
```

---

## STRIDE Analysis

### Spoofing

| Threat | Current Mitigation | Gap | Severity |
|--------|-------------------|-----|----------|
| Forge demo user JWT | None | Demo prefix bypasses all checks | **Critical** |
| Forge station JWT | Secret in env var | Weak default fallback | **Critical** |
| Forge PIN token | JWT verification | Weak secret possible | High |
| Impersonate another user | Session binding | localStorage accessible | High |

### Tampering

| Threat | Current Mitigation | Gap | Severity |
|--------|-------------------|-----|----------|
| Modify payment amount | Server recalculation | None - well protected | Low |
| Modify order items | State machine | Post-payment changes unclear | Medium |
| Modify audit logs | Insert-only table | None - well protected | Low |
| Modify JWT claims | Signature verification | Weak secrets possible | High |

### Repudiation

| Threat | Current Mitigation | Gap | Severity |
|--------|-------------------|-----|----------|
| Deny placing order | Audit logs | Auth logs comprehensive | Low |
| Deny payment | Stripe records + audit | Two-phase logging | Low |
| Deny refund request | Audit logs | Refund lacks full context | Medium |

### Information Disclosure

| Threat | Current Mitigation | Gap | Severity |
|--------|-------------------|-----|----------|
| Cross-tenant data access | RLS policies | Demo user bypass | **Critical** |
| Token theft via XSS | None | localStorage exposed | **Critical** |
| User enumeration | PIN timing obfuscation | Timing attack possible | High |
| Error message leakage | Generic errors | Stack traces in dev mode | Medium |

### Denial of Service

| Threat | Current Mitigation | Gap | Severity |
|--------|-------------------|-----|----------|
| Brute force lockout | Rate limiting | Resets on restart | High |
| Memory exhaustion | 4GB limit | Embedding service unbounded | Medium |
| Connection exhaustion | Pool limits | WebSocket limits unclear | Medium |

### Elevation of Privilege

| Threat | Current Mitigation | Gap | Severity |
|--------|-------------------|-----|----------|
| Staff → Admin | Role checks | Dual RBAC source confusion | Medium |
| Guest → Authenticated | Auth required | Demo bypass allows escalation | **Critical** |
| Single-tenant → Multi-tenant | restaurant_id checks | Header fallback exploitable | High |

---

## Blast Radius Analysis

### Scenario 1: JWT Secret Compromise

**Trigger**: STATION_TOKEN_SECRET or KIOSK_JWT_SECRET exposed

**Blast Radius**:
- ALL station tokens can be forged
- ALL PIN tokens can be forged
- Attacker has access to ALL restaurants
- No way to detect without audit log analysis
- Recovery requires secret rotation + all devices re-auth

**Containment**:
- Per-restaurant signing keys would limit blast radius
- Short token expiry would limit window
- Token binding to device would prevent reuse

### Scenario 2: localStorage XSS Attack

**Trigger**: XSS vulnerability exploited on any page

**Blast Radius**:
- All tokens in localStorage exfiltrated
- Attacker impersonates victim user
- Access to all restaurants victim authenticated for
- Persists until tokens expire (or forever if no expiry)

**Containment**:
- HTTPOnly cookies would prevent theft
- CSP headers would limit XSS vectors
- Token binding to browser fingerprint

### Scenario 3: Demo User Bypass Exploited

**Trigger**: Attacker forges demo JWT

**Blast Radius**:
- Full read/write access to ANY restaurant
- No audit trail (demo user actions may be filtered)
- Payment manipulation possible
- Order history exposure for all customers

**Containment**:
- Validate demo users against whitelist
- Demo mode disabled in production
- Demo users restricted to demo restaurant

### Scenario 4: Database Credentials Leaked

**Trigger**: SUPABASE_SERVICE_KEY exposed

**Blast Radius**:
- Full database access bypassing RLS
- All tenant data exposed
- Payment records, PII accessible
- Can modify audit logs

**Containment**:
- Service key only used server-side (verified)
- RLS provides defense in depth
- Audit logs are insert-only (immutable)

---

## Threat Prioritization Matrix

| Threat | Likelihood | Impact | Risk Score | Priority |
|--------|-----------|--------|------------|----------|
| Demo user bypass | High | Critical | 25 | **P0** |
| localStorage XSS | Medium | Critical | 20 | **P0** |
| Refund idempotency | Medium | High | 15 | **P0** |
| Weak station secret | Medium | Critical | 20 | **P0** |
| PIN timing attack | Medium | Medium | 12 | P1 |
| Webhook replay | Low | High | 10 | P1 |
| Rate limit bypass | Medium | Medium | 12 | P1 |
| Restaurant header fallback | Medium | High | 15 | P1 |
| Dual RBAC confusion | Low | Medium | 6 | P2 |
| Memory exhaustion | Low | Medium | 6 | P2 |

---

## Security Controls Assessment

### What's Working

| Control | Effectiveness | Notes |
|---------|--------------|-------|
| RLS Policies | Strong | All 13 tenant tables protected |
| Payment Audit Logging | Strong | Two-phase, fail-fast |
| Server-side Amount Calculation | Strong | Client cannot manipulate |
| Order State Machine | Strong | Prevents invalid transitions |
| JWT Signature Verification | Medium | Depends on secret strength |
| Rate Limiting | Medium | Works until restart |

### What's Missing

| Control | Risk | Recommendation |
|---------|------|----------------|
| HTTPOnly Cookies | XSS token theft | Migrate sensitive tokens |
| Webhook Timestamp Verification | Replay attacks | Check webhook age |
| Refund Idempotency | Duplicate refunds | Add to Stripe calls |
| Device Binding | Token reuse | Fingerprint tokens |
| WAF/Bot Protection | Automated attacks | Consider Cloudflare |
| Secret Rotation | Long-term exposure | Implement rotation |

### What's Partially Implemented

| Control | Current State | Gap |
|---------|--------------|-----|
| STRICT_AUTH | Optional env var | Should be default |
| PIN Attempt Limiting | Database + middleware | Race condition, restart clears |
| Demo Mode Protection | Sub prefix check | No validation against whitelist |
| RBAC | Code + database | Two sources, potential drift |

---

## Recommended Security Architecture

### Immediate (Pre-Launch)

```
┌─────────────────────────────────────────────────────────────────┐
│                    HARDENED AUTH FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Client                      Server                             │
│   ┌─────────┐                ┌─────────────────────────────┐    │
│   │         │   HTTPOnly     │  STRICT_AUTH = true         │    │
│   │  React  │◄──Cookies────►│  Demo bypass DISABLED       │    │
│   │         │                │  Station secret ROTATED     │    │
│   └─────────┘                └─────────────────────────────┘    │
│        │                              │                          │
│        ▼                              ▼                          │
│   NO localStorage              All endpoints validate            │
│   for tokens                   restaurant_id from JWT            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Short-Term (First Month)

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTED SECURITY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Redis                       Webhook Handler                    │
│   ┌─────────┐                ┌─────────────────────────────┐    │
│   │  Rate   │                │  Timestamp verification     │    │
│   │  Limits │                │  (< 5 min old)              │    │
│   │  Store  │                │  Idempotency for refunds    │    │
│   └─────────┘                └─────────────────────────────┘    │
│        │                              │                          │
│        ▼                              ▼                          │
│   Survives restarts            Prevents replay attacks           │
│   Distributed state            Prevents duplicate refunds        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Incident Response Considerations

### Detection Signals

| Signal | Indicates | Action |
|--------|----------|--------|
| Multiple failed PIN attempts/restaurant | Brute force | Alert + temp lockout |
| Demo user accessing production data | Bypass exploit | Immediate investigation |
| Refund rate spike | Fraud or vulnerability | Manual review queue |
| Cross-tenant queries in logs | RLS bypass attempt | Security review |
| JWT validation failures spike | Token forgery attempts | Secret rotation consideration |

### Response Playbooks Needed

1. **Compromised JWT Secret**: Rotation procedure, session invalidation
2. **XSS Attack Detected**: Token revocation, affected user notification
3. **Payment Fraud Pattern**: Refund freeze, manual review process
4. **Account Lockout Storm**: Bulk unlock procedure, rate limit adjustment

---

## Conclusion

The threat model reveals a system with **strong payment integrity** but **weak authentication perimeter**. The most dangerous vulnerabilities are:

1. **Demo user bypass** - Trivial to exploit, full access
2. **localStorage token storage** - XSS gives total compromise
3. **Weak default secrets** - Brute-forceable or guessable
4. **Optional STRICT_AUTH** - Easy to misconfigure

The blast radius of authentication compromise is severe due to multi-tenant architecture. A single exploit potentially exposes all restaurants.

**Security Posture Grade**: C+ (Strong internals, weak perimeter)

---

**Report Prepared By**: Hostile Enterprise Auditor
**Review Date**: 2025-12-28
