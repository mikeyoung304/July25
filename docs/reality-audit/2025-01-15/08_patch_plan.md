# Documentation Patch Plan

**Generated**: 2025-01-15
**Purpose**: Non-binding suggestions to reconcile documentation with code reality
**Scope**: Documentation edits only (no code changes)

## Priority 1: Critical Security Warnings (Immediate)

### 1. CRITICAL_WARNINGS.md
**File**: docs/CRITICAL_WARNINGS.md
**Line**: 15

```diff
- - Voice Customer mode **must not** send orders to kitchen without payment.
+ - Voice Customer mode **currently allows** orders to kitchen without payment (SECURITY GAP - fix pending).
```

### 2. VOICE_SYSTEM_CURRENT.md
**File**: docs/VOICE_SYSTEM_CURRENT.md
**Line**: 40-42

```diff
- - **CRITICAL**: No payment gate enforcement found in code
- - Orders currently can reach kitchen without payment_token
- - TODO: Must add payment gate in Phase C
+ - **🔴 CRITICAL SECURITY GAP**: Payment gate NOT enforced for voice orders
+ - Orders currently reach kitchen without payment_token verification
+ - **IMMEDIATE FIX REQUIRED**: Add requirePaymentIfCustomer to voice flow
```

## Priority 2: Accuracy Corrections (High Impact)

### 3. BASELINE_REALITY.md
**File**: docs/BASELINE_REALITY.md
**Line**: 31

```diff
- - **Payment Required**: Orders should require payment_token (NOT ENFORCED server-side currently)
+ - **Payment Required**: Orders should require payment_token (**⚠️ NOT ENFORCED for voice orders**)
```

### 4. AUTHENTICATION_MASTER.md
**File**: docs/AUTHENTICATION_MASTER.md
**Line**: 233

```diff
- # Critical Security Configuration (NO DEFAULTS ALLOWED)
+ # Critical Security Configuration (DEFAULTS EXIST - must override in production)
```

**Line**: 489

```diff
- - [ ] CSRF protection enabled
+ - [ ] CSRF protection enabled (NOT IMPLEMENTED - add if required)
```

## Priority 3: Technical Clarifications (Medium Impact)

### 5. ACTUAL_DEPLOYMENT.md
**File**: docs/ACTUAL_DEPLOYMENT.md
**Line**: 72

```diff
- - **Backend**: 3001 (unified, no more 3002/AI_GATEWAY)
+ - **Backend**: 3001 (unified backend)
```

**Line**: 24 & 31

```diff
  ### Client (Frontend)
  - **Build Output**: `client/dist/`
  - **Dev Server**: http://localhost:5173
- - **Production Host**: Not specified (likely Vercel/Netlify based on Vite config)
+ - **Production Host**: Vercel (based on build scripts) - VERIFY WITH DEVOPS

  ### Server (Backend)
  - **Build Output**: `server/dist/`
  - **Dev Server**: http://localhost:3001
- - **Production Host**: Likely Render (build:render script present)
+ - **Production Host**: Render (build:render script) - VERIFY WITH DEVOPS
```

## Priority 4: Minor Updates (Low Impact)

### 6. ORDER_FLOW.md
**File**: docs/ORDER_FLOW.md
**Line**: After line 113 (Voice Order Submission section)

```diff
  // Automated submission after confirmation
  VoiceOrderingMode → submitOrderAndNavigate(cart.items)
  useKioskOrderSubmission → POST /api/v1/orders
  Navigate → /order-confirmation
+
+ **⚠️ WARNING**: Voice orders currently bypass payment verification middleware.
+ This is a known security gap pending resolution.
```

### 7. Field Name Documentation
**New Section**: Add to BASELINE_REALITY.md after line 67

```diff
+ ## API Field Contract Status
+
+ The server includes transform logic to handle legacy snake_case fields:
+ - Server expects: `tableNumber`, `customerName`, `type`
+ - Client sends: `table_number`, `customer_name`, `order_type`
+ - Transform layer: server/src/dto/order.dto.ts:56-73
+
+ **TODO**: Update client to use camelCase consistently.
```

## Priority 5: Metadata Updates

### All 7 Active Docs
Update front matter in all docs:

```diff
- last_verified_date: 2025-09-15
- last_verified_commit: 764d332991dd3a91ca870515b7f50cfa28208275
+ last_verified_date: 2025-01-15
+ last_verified_commit: [current commit hash from reality audit]
```

## Implementation Checklist

- [ ] Review and approve changes with Mike Young (owner)
- [ ] Apply P1 changes immediately (security warnings)
- [ ] Apply P2 changes within 24 hours (accuracy)
- [ ] Apply P3-P4 changes within 1 week
- [ ] Update all metadata after changes
- [ ] Run another audit after fixes to verify

## Notes

1. These are documentation-only changes to align docs with current code reality
2. Code changes (like implementing payment gate) are tracked separately
3. Some "problems" in docs are actually requirements not yet implemented
4. Consider adding a "Known Issues" section to track gaps between requirements and implementation

## Alternative Approach

Instead of editing inline, consider adding a "Reality Check" box at the top of each document:

```markdown
> **📊 Reality Check** (Last verified: 2025-01-15)
> - ✅ 85% accurate with codebase
> - 🔴 Payment gate not enforced for voice
> - 🟡 Field names use snake_case in client
> - See [Reality Audit](../reality-audit/2025-01-15/) for details
```

This preserves the original requirements while acknowledging current state.