# Reality Audit Findings Report

**Date**: January 15, 2025
**Repository**: rebuild-6.0
**Auditor**: Repo Reality Auditor
**Commit**: 764d332 (fix/p0-restaurant-context branch)

## Executive Summary

The audit of 7 active documentation files against the codebase reveals **88 total claims**, with:
- **63 GREEN** (72%) - Documentation matches code reality
- **15 YELLOW** (17%) - Partially accurate or ambiguous
- **10 RED** (11%) - Critical mismatches requiring immediate attention

### Top 3 Critical Findings

1. **🔴 SECURITY GAP**: Customer voice orders can reach kitchen without payment verification
2. **🔴 API CONTRACT**: Client sends snake_case fields while server expects camelCase
3. **🔴 MISSING PROTECTION**: No CSRF protection despite documentation claims

## Document-by-Document Analysis

### 1. CRITICAL_WARNINGS.md
**Status**: Mostly Accurate (3 GREEN, 1 YELLOW, 1 RED)

The warnings are valid. The critical RED issue is that voice customer orders are **not** blocked from reaching the kitchen without payment, despite the documentation's strong assertion. The payment gate middleware exists (`requirePaymentIfCustomer`) but is not applied to voice order flows.

**What's True**:
- Documentation is indeed out of sync (self-aware)
- Only DOCS_INDEX.md files should be trusted
- Tests are partially broken (Vitest migration incomplete)

**What Needs Edits**:
- Line 15: Change "must not" to "currently do not block but should"

### 2. BASELINE_REALITY.md
**Status**: Largely Accurate (12 GREEN, 4 YELLOW, 2 RED)

Most technical stack details are correct. The architecture description accurately reflects the monorepo structure, framework versions, and port configurations.

**What's True**:
- Stack versions all match (React 19.1.0, Express 4.18.2, etc.)
- Authentication implementation with JWT + PIN
- Employee mode with visual-only feedback
- All 7 order statuses exist in code
- Development bypass exists at line 334 of auth.ts

**What Needs Edits**:
- Line 31: Add "WARNING: NOT CURRENTLY ENFORCED" after payment required
- Line 51: Clarify that payment states exist but middleware doesn't enforce

### 3. DOCS_INDEX.md
**Status**: Fully Accurate (7 GREEN, 0 YELLOW, 0 RED)

This index correctly lists all 7 active documents with accurate metadata. No changes needed.

### 4. ACTUAL_DEPLOYMENT.md
**Status**: Mostly Accurate (8 GREEN, 2 YELLOW, 1 RED)

Build and development configurations are correctly documented. The memory optimization from 12GB to 4GB is verified.

**What's True**:
- All build commands match package.json exactly
- Port configurations correct (5173 client, 3001 server)
- Environment variables list is complete
- Memory limits properly set to 4GB

**What Needs Edits**:
- Line 72: Remove "no more 3002/AI_GATEWAY" - there never was a 3002
- Line 24/31: Add actual production hosts (Vercel/Render) if known

### 5. AUTHENTICATION_MASTER.md
**Status**: Well Documented (15 GREEN, 3 YELLOW, 2 RED)

This comprehensive document is mostly accurate. The role hierarchy and authentication flows are correctly implemented.

**What's True**:
- Role hierarchy with inheritance works as documented
- All authentication methods (email, PIN, station, kiosk) exist
- Token verification is strict
- Security enhancements mostly in place

**What Needs Edits**:
- Line 233: Some env vars DO have defaults in code
- Line 489: CSRF protection is NOT implemented
- Line 492: Clarify JWT typically in Authorization header, not cookies

### 6. ORDER_FLOW.md
**Status**: Generally Accurate (10 GREEN, 3 YELLOW, 2 RED)

The order flow documentation correctly describes most of the implementation, including state transitions and WebSocket events.

**What's True**:
- All 7 order statuses handled
- State machine transitions valid
- API endpoints exist as documented
- WebSocket events properly broadcast
- Payment methods all supported

**What Needs Edits**:
- Add warning that voice orders currently bypass payment gate
- Verify virtual scrolling claim or mark as planned

### 7. VOICE_SYSTEM_CURRENT.md
**Status**: Implementation Accurate (8 GREEN, 2 YELLOW, 2 RED)

Voice system architecture is correctly documented, but the critical payment enforcement gap exists.

**What's True**:
- File locations all correct
- Employee mode configuration accurate
- WebRTC session flow properly described
- Events and mode decision points correct

**What Needs Edits**:
- Line 42: Change "TODO: Must add" to "CRITICAL: Not enforced"
- Line 17: Verify /voice-test route exists or mark as removed

## Top 10 Mismatches by Blast Radius

1. **Payment gate bypass for voice** - HIGH: Security vulnerability
2. **Field name mismatches** - HIGH: Orders may fail
3. **CSRF protection missing** - MEDIUM: Security concern
4. **Env var defaults exist** - MEDIUM: Deployment confusion
5. **Development bypass active** - MEDIUM: Risk if deployed
6. **Payment states not enforced** - MEDIUM: Incomplete tracking
7. **Production hosts ambiguous** - LOW: Deployment clarity
8. **Virtual scrolling unverified** - LOW: Performance claim
9. **Test migration incomplete** - LOW: Development friction
10. **3002 port never existed** - MINIMAL: Historical accuracy

## Critical Code-to-Doc Gaps

### Payment Gate Not Applied to Voice
The `requirePaymentIfCustomer` middleware exists but voice orders don't go through the standard order creation flow that includes this middleware. Voice orders need explicit payment verification added.

### Field Transformation Asymmetry
The server has transform logic to handle snake_case fields from the client, but the client should be updated to send camelCase to avoid confusion and potential issues.

### Missing CSRF Protection
Documentation claims CSRF protection exists, but no implementation found in middleware. This should either be implemented or removed from docs.

## Recommendations

### Immediate Actions (P0)
1. Add payment gate to voice order processing
2. Update client to use camelCase field names
3. Either implement CSRF or remove from docs

### Short-term (P1)
1. Complete Vitest migration with proper shims
2. Document actual production deployment targets
3. Add stricter env var validation (no defaults)

### Documentation Updates (P2)
1. Update CRITICAL_WARNINGS.md line 15
2. Update BASELINE_REALITY.md lines 31, 51
3. Update AUTHENTICATION_MASTER.md lines 233, 489, 492
4. Update VOICE_SYSTEM_CURRENT.md line 42
5. Remove historical inaccuracies

## Conclusion

The documentation is **72% accurate** with the codebase, which is reasonable for an active development project. However, the **11% RED items** include critical security gaps that must be addressed immediately, particularly the payment bypass for voice orders. The documentation reset effort has correctly identified most issues, but implementation has not caught up to the documented requirements.