---
status: closed
priority: p3
issue_id: "244"
tags: [code-review, code-quality, cleanup]
dependencies: []
closed_reason: "Dead code causes zero harm. Migration risk > benefit. Bcrypt works correctly."
---

# P3: Salt Column Stored But Never Used in PIN Auth

## Problem Statement

The PIN auth code generates and stores a `salt` column in the database, but bcrypt already embeds the salt in the hash itself. The stored salt is never read back or used.

**Why it matters:** Dead code/data increases confusion and maintenance burden. New developers might wonder why the salt is stored separately.

## Findings

**Location:** `server/src/services/auth/pinAuth.ts:106, 123-124, 143-144`

**Evidence:**
```typescript
// Salt is generated and stored...
salt: generateSalt(),

// But verifyPin uses bcrypt which has salt embedded in hash:
function verifyPin(pin: string, hash: string): boolean {
  const pepperedPin = pin + PIN_PEPPER;
  return bcrypt.compareSync(pepperedPin, hash);  // bcrypt extracts salt from hash
}
```

## Proposed Solutions

### Option A: Remove salt storage (Recommended)
**Pros:** Cleaner code, less confusion
**Cons:** Requires migration to drop column (can be additive)
**Effort:** Small
**Risk:** Low

### Option B: Document as legacy
**Pros:** No migration needed
**Cons:** Keeps dead code
**Effort:** None
**Risk:** Low

## Recommended Action
<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `server/src/services/auth/pinAuth.ts`
- Potentially database migration for column removal

**Components:** PIN auth service

## Acceptance Criteria

- [ ] Salt no longer stored on new PIN creation
- [ ] Existing data not affected (salt column can remain nullable)
- [ ] Code comments explain bcrypt salt handling

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-29 | Identified during simplicity review | bcrypt handles salt internally |

## Resources

- bcrypt documentation
