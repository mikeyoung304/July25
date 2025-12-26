# Git Forensics Report - Restaurant OS (rebuild-6.0)

**Generated**: 2025-12-26
**Analysis Period**: Last 300 commits (~1,970 total commits)
**Primary Contributor**: mikeyoung304 (1,970 commits)
**AI Contributors**: Devin AI (8), Claude (3)

---

## 1. Change Heatmap - Top 20 Highest-Churn Files

Files ranked by change frequency. High churn indicates either active development, instability, or central integration points.

| Rank | File | Changes | Risk Level | Category |
|------|------|---------|------------|----------|
| 1 | `client/src/modules/voice/services/VoiceSessionConfig.ts` | 28 | HIGH | Voice/WebRTC |
| 2 | `server/src/middleware/auth.ts` | 28 | CRITICAL | Authentication |
| 3 | `server/src/routes/auth.routes.ts` | 23 | CRITICAL | Authentication |
| 4 | `server/src/routes/payments.routes.ts` | 24 | CRITICAL | Payments |
| 5 | `client/src/modules/voice/services/VoiceEventHandler.ts` | 21 | HIGH | Voice/WebRTC |
| 6 | `client/src/modules/voice/services/WebRTCVoiceClient.ts` | 21 | HIGH | Voice/WebRTC |
| 7 | `client/src/pages/components/VoiceOrderModal.tsx` | 18 | MEDIUM | Voice UI |
| 8 | `client/src/pages/ServerView.tsx` | 17 | MEDIUM | Server View |
| 9 | `server/src/routes/realtime.routes.ts` | 16 | HIGH | Voice API |
| 10 | `client/src/modules/voice/components/VoiceControlWebRTC.tsx` | 16 | HIGH | Voice UI |
| 11 | `client/src/components/kiosk/VoiceOrderingMode.tsx` | 16 | HIGH | Kiosk |
| 12 | `client/src/components/kiosk/KioskCheckoutPage.tsx` | 14 | HIGH | Kiosk/Payments |
| 13 | `CLAUDE.md` | 14 | LOW | Documentation |
| 14 | `client/src/components/auth/WorkspaceAuthModal.tsx` | 11 | HIGH | Auth UI |
| 15 | `client/src/pages/CheckoutPage.tsx` | 11 | HIGH | Checkout |
| 16 | `server/src/server.ts` | 10 | CRITICAL | Server Core |
| 17 | `client/src/services/websocket/WebSocketService.ts` | 9 | HIGH | Real-time |
| 18 | `server/src/services/orders.service.ts` | 9 | HIGH | Orders Core |
| 19 | `server/src/services/payment.service.ts` | 9 | CRITICAL | Payments Core |
| 20 | `client/src/services/http/httpClient.ts` | 7 | CRITICAL | HTTP Client |

### Directory-Level Churn Analysis

| Directory | Total Changes | Primary Concern |
|-----------|---------------|-----------------|
| `client/src/modules/voice/` | 100+ | Voice ordering active development |
| `server/src/middleware/` | 50+ | Auth, security, validation hardening |
| `server/src/routes/` | 80+ | API endpoint evolution |
| `client/src/components/kiosk/` | 40+ | Kiosk UX refinement |
| `supabase/migrations/` | 55 files | Database schema evolution |

---

## 2. Decision Timeline - Major Architectural Decisions

### Critical ADRs (Architecture Decision Records)

| Date | ADR | Decision | Commit Evidence |
|------|-----|----------|-----------------|
| 2025-10-12 | **ADR-001** | snake_case convention for ALL layers | `f84b2301` - Completed migration |
| 2025-10-17 | **ADR-006** | Dual auth pattern (Supabase + localStorage) | `b6180e0e` - Added localStorage fallback |
| 2025-10-31 | **ADR-010** | Remote-first database (Supabase is truth) | Multiple migration syncs |
| 2025-11-24 | **ADR-016** | CommonJS for shared package | `0dc0440f` - ESM/CJS fix |
| 2025-11-24 | **ADR-015** | Order state machine enforcement | `4b6bd36e` - Epic 2 phases 1-2 |

### Infrastructure Decisions

| Date | Decision | Commits | Impact |
|------|----------|---------|--------|
| 2025-11 | **Stripe Migration** | `c1af8b64`, `156cac38`, `7aa028c7` | Complete Square to Stripe migration |
| 2025-11 | **WebSocket First-Message Auth** | `366d0a75` | Security: tokens no longer in URL |
| 2025-11 | **WebSocket State Machine** | `14bb3f76` | Consolidated connection state |
| 2025-11 | **CSP + Security Headers** | `91a1fb6a` | Removed deprecated csurf, updated vite |
| 2025-12 | **Express v5 Types** | `b5c29e50` | Route handlers return void |

### AI/Voice System Evolution

| Date | Decision | Commits | Notes |
|------|----------|---------|-------|
| 2025-11 | Voice ordering WebRTC | Multiple in voice module | OpenAI Realtime API integration |
| 2025-11-22 | Voice remediation phases 1-4 | `07930fc2`, `4adf6917` | Multi-tenant voice ordering |
| 2025-11 | Server-side VAD | `aeb26b7d` | Kiosk mode reliability |
| 2025-11 | First-message auth for voice | `366d0a75` | Security hardening |

---

## 3. "Weird but Justified" Patterns

These patterns may look like bugs or anti-patterns but are **intentional**:

### 3.1 localStorage for Auth Tokens
**Location**: `client/src/services/http/httpClient.ts:109-148`
**Looks wrong**: Storing JWTs in localStorage (XSS risk)
**Why it's correct**:
- ADR-006 explicitly documents this
- Supports shared devices (kitchen displays, kiosks)
- Supabase auth is primary, localStorage is fallback
- Required for PIN auth and station auth workflows
**Evidence**: Commit `b6180e0e` - "fix(websocket): add localstorage jwt fallback for dual-auth pattern"

### 3.2 CSRF Disabled for REST APIs
**Location**: `server/src/server.ts` (csurf removed in `91a1fb6a`)
**Looks wrong**: No CSRF protection
**Why it's correct**:
- Using JWT + RBAC instead of cookies
- REST APIs don't need cookie-based CSRF
- Removing deprecated csurf middleware
**Evidence**: Commit `91a1fb6a` - "Remove csurf middleware entirely (deprecated, unused for REST APIs)"

### 3.3 Demo Mode Production Guard
**Location**: `server/src/server.ts`
**Looks wrong**: Server refuses to start if DEMO_LOGIN_ENABLED=true in production
**Why it's correct**:
- Security measure to prevent accidental demo mode in production
- Demo mode bypasses authentication
**Evidence**: Commit `91a1fb6a` - "Add demo mode production guard"

### 3.4 snake_case Everywhere (Not camelCase)
**Location**: Entire codebase
**Looks wrong**: JavaScript/TypeScript convention is camelCase
**Why it's correct**:
- ADR-001: PostgreSQL/Supabase native format
- Zero transformation overhead
- Stripe, Twitter, GitHub use snake_case
**Evidence**: Commits `f84b2301`, `81b280ac` - ADR-001 migration

### 3.5 CommonJS in Shared Package (Not ESM)
**Location**: `shared/package.json` (no `"type": "module"`)
**Looks wrong**: Modern Node.js prefers ESM
**Why it's correct**:
- ADR-016: Server uses CommonJS
- Render deployments fail with ESM
- Vite handles transformation for client
**Evidence**: Commit `0dc0440f` - 12 failed attempts to use ESM (see build commit history)

### 3.6 Backward-Compatible WebSocket Auth
**Location**: `server/src/utils/websocket.ts`
**Looks wrong**: Supports both URL-based and first-message auth
**Why it's correct**:
- Gradual migration to secure first-message auth
- URL-based auth logs deprecation warnings
- Prevents breaking existing clients
**Evidence**: Commit `366d0a75` - "Server maintains backward compatibility"

### 3.7 Orphaned responseTransform.ts Removal
**Location**: Was `server/src/middleware/responseTransform.ts`
**Looks wrong**: Why was transform middleware needed?
**Why it's correct**:
- Dead code from incomplete camelCase boundary attempt
- ADR-001 made it unnecessary
- Removed as tech debt cleanup
**Evidence**: Commit `f84b2301` - "Delete unused responseTransform.ts middleware (157 lines dead code)"

---

## 4. Safe Refactor Zones

Files with low churn (1-2 changes in 300 commits) and stable interfaces:

### 4.1 UI Components (Very Safe)
```
client/src/components/ui/tooltip.tsx           (1 change)
client/src/components/ui/slider.tsx            (1 change)
client/src/components/ui/popover.tsx           (1 change)
client/src/components/ui/label.tsx             (1 change)
client/src/components/ui/dropdown-menu.tsx     (1 change)
client/src/components/ui/card.tsx              (1 change)
client/src/components/ui/alert.tsx             (1 change)
```
**Rationale**: Radix-based primitives, minimal business logic

### 4.2 Error Boundaries (Safe)
```
client/src/components/errors/UnifiedErrorBoundary.tsx      (1 change)
client/src/components/errors/GlobalErrorBoundary.tsx       (1 change)
client/src/components/errors/KDSErrorBoundary.tsx          (1 change)
client/src/components/errors/KitchenErrorBoundary.tsx      (1 change)
client/src/components/errors/OrderStatusErrorBoundary.tsx  (1 change)
client/src/components/errors/WebSocketErrorBoundary.tsx    (1 change)
```
**Rationale**: Stable error handling patterns, rarely change

### 4.3 Server Utilities (Safe with Caution)
```
server/src/utils/case.ts                       (1 change)
server/src/utils/validation.ts                 (1 change)
server/src/middleware/slugResolver.ts          (1 change)
server/src/middleware/requestLogger.ts         (1 change)
server/src/config/services.ts                  (1 change)
server/src/config/sentry.ts                    (2 changes)
server/src/lib/ports.ts                        (2 changes)
```
**Rationale**: Infrastructure utilities, well-tested

### 4.4 AI Stubs (Safe)
```
server/src/ai/stubs/tts.stub.ts               (2 changes)
server/src/ai/stubs/transcriber.stub.ts       (2 changes)
server/src/ai/stubs/order-nlp.stub.ts         (2 changes)
```
**Rationale**: Test stubs, only change when interfaces change

### 4.5 Kitchen Display Tests (Relatively Safe)
```
client/src/components/kitchen/__tests__/ModifierList.test.tsx
client/src/components/kitchen/__tests__/FocusOverlay.test.tsx
client/src/components/kitchen/__tests__/ExpoTabContent.test.tsx
client/src/components/kitchen/__tests__/VirtualizedOrderGrid.test.tsx
```
**Rationale**: Test files with stable component interfaces

---

## 5. "Do-Not-Touch Casually" - Critical High-Risk Files

### 5.1 CRITICAL - Payment Processing
| File | Risk | Last Security Fix |
|------|------|-------------------|
| `server/src/services/payment.service.ts` | CRITICAL | `91a1fb6a` (Dec 2025) |
| `server/src/routes/payments.routes.ts` | CRITICAL | `b5c29e50` (Dec 2025) |
| `client/src/services/payments/PaymentStateMachine.ts` | HIGH | `e266efe1` |

**Why Critical**:
- Handles real money transactions
- Stripe integration with webhooks
- Idempotency key management
- Two-phase audit logging

**Before Modifying**:
1. Read commit `91a1fb6a` - P0 payment fixes
2. Understand idempotency key flow
3. Check webhook signature verification
4. Run `server/tests/security/payment-p0-fixes.proof.test.ts`

### 5.2 CRITICAL - Authentication
| File | Risk | Last Security Fix |
|------|------|-------------------|
| `server/src/middleware/auth.ts` | CRITICAL | `366d0a75` (Dec 2025) |
| `server/src/routes/auth.routes.ts` | CRITICAL | Recent |
| `client/src/services/http/httpClient.ts` | CRITICAL | `b6180e0e` |

**Why Critical**:
- Dual auth pattern (ADR-006)
- STRICT_AUTH enforcement
- WebSocket auth parity
- Token verification for all routes

**Before Modifying**:
1. Read ADR-006 (dual auth pattern)
2. Read CL-AUTH-001 (STRICT_AUTH drift)
3. Read CL-AUTH-002 (WebSocket dual auth)
4. Test with BOTH Supabase AND localStorage flows

### 5.3 CRITICAL - Server Core
| File | Risk | Last Significant Change |
|------|------|-------------------------|
| `server/src/server.ts` | CRITICAL | `91a1fb6a` |
| `server/src/utils/websocket.ts` | HIGH | `366d0a75` |

**Why Critical**:
- Server initialization sequence matters
- WebSocket auth timing is security-critical
- Demo mode guard is intentional
- Middleware order affects security

**Before Modifying**:
1. Check security headers
2. Verify middleware order
3. Test both HTTP and WebSocket paths

### 5.4 HIGH RISK - Database Migrations
| Location | Risk |
|----------|------|
| `supabase/migrations/` (55 files) | HIGH |
| `prisma/schema.prisma` | HIGH |

**Why High Risk**:
- ADR-010: Remote DB is source of truth
- Never modify Prisma schema manually
- Migrations document history, not current state
- RLS policies are security-critical

**Before Modifying**:
1. Read ADR-010 (remote-first database)
2. Read CL-DB-001 (migration sync)
3. Read CL-DB-002 (constraint drift)
4. Always run `npx prisma db pull` after migrations

### 5.5 HIGH RISK - Voice/WebRTC
| File | Risk | Churn Count |
|------|------|-------------|
| `client/src/modules/voice/services/VoiceSessionConfig.ts` | HIGH | 28 |
| `client/src/modules/voice/services/VoiceEventHandler.ts` | HIGH | 21 |
| `client/src/modules/voice/services/WebRTCVoiceClient.ts` | HIGH | 21 |
| `server/src/routes/realtime.routes.ts` | HIGH | 16 |

**Why High Risk**:
- OpenAI Realtime API integration
- Complex state machine
- Ephemeral token security
- Handler timing is critical (CL-WS-001)

**Before Modifying**:
1. Read CL-WS-001 (handler timing race)
2. Understand voice state machine
3. Check token expiry handling
4. Test with actual voice input

### 5.6 HIGH RISK - Shared Types
| File | Risk |
|------|------|
| `shared/types/order.types.ts` | HIGH |
| `shared/contracts/order.ts` | HIGH |
| `shared/contracts/payment.ts` | HIGH |

**Why High Risk**:
- Type changes affect entire codebase
- Order state machine enforcement (ADR-015)
- 8 order states must be handled
- Test mocks drift if types change (CL-TEST-001)

**Before Modifying**:
1. Read ADR-015 (order state machine)
2. Run `npm run typecheck` after changes
3. Update all test mocks
4. Check client AND server usage

---

## 6. Commit Pattern Analysis

### Commit Message Conventions
- `fix(scope): description` - Bug fixes
- `feat(scope): description` - New features
- `chore(scope): description` - Maintenance
- `docs(scope): description` - Documentation
- `refactor(scope): description` - Code restructuring
- `test(scope): description` - Test changes
- `P0/P1/P2/P3` - Priority indicators in many commits

### Security Fix Pattern
Security-related commits follow a pattern:
```
fix(security): resolve P0/P1 [specific issues]
```
Examples: `91a1fb6a`, `22069ec7`, `ec5785c2`, `470157d9`

### Co-Author Pattern
AI-assisted commits include:
```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
OR
```
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 7. Known Intentional Decisions Summary

| Decision | Evidence | ADR |
|----------|----------|-----|
| snake_case everywhere | `f84b2301`, CLAUDE.md | ADR-001 |
| Dual auth (Supabase + localStorage) | `b6180e0e`, httpClient.ts | ADR-006 |
| Remote-first database | migrations/, CLAUDE.md | ADR-010 |
| CommonJS for shared package | `0dc0440f`, 12 failed ESM attempts | ADR-016 |
| Order state machine | `4b6bd36e`, order.types.ts | ADR-015 |
| First-message WebSocket auth | `366d0a75` | P1-010 |
| CSRF disabled for REST | `91a1fb6a` | Using JWT instead |
| Demo mode production guard | `91a1fb6a` | Security measure |

---

## 8. Recommendations

### Before Making Changes
1. **Check the lessons index**: `.claude/lessons/README.md`
2. **Review relevant ADRs**: `docs/explanation/architecture-decisions/`
3. **Search commit history**: `git log --oneline --all | grep -i [keyword]`
4. **Run tests**: `npm test` (1,672 tests passing)
5. **Type check**: `npm run typecheck`

### For High-Risk Files
1. Create a backup branch
2. Review last 5-10 commits to the file
3. Check for related ADRs and lessons
4. Run both unit AND E2E tests
5. Test both authentication paths (Supabase + localStorage)

### When in Doubt
1. Ask: "Is this pattern documented in an ADR?"
2. Ask: "Is there a lesson for this scenario?"
3. Ask: "What does the git blame say about this line?"
4. Search: `grep -r "ADR" docs/`

---

## Appendix: Git Statistics

```
Total Commits: ~1,970
Primary Author: mikeyoung304 (1,970)
AI Collaborators: Devin AI (8), Claude (3)
Recent Activity: Very high (300 commits in ~2 months)
Test Coverage: 1,672 unit tests, 188 E2E tests
ADRs: 16 documented decisions
Codified Lessons: 15 incident prevention patterns
```

---

*Report generated by Agent A1 - Git Forensics & Intent Preservation*
