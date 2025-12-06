---
status: complete
priority: p2
issue_id: 120
tags: [code-review, type-safety, security, xss]
dependencies: [118]
resolved_at: 2025-12-02
---

# No Type Guard for Metadata Access in useTableGrouping

## Problem Statement

`client/src/hooks/useTableGrouping.ts:104-109` accesses `order.metadata.serverName` and `order.metadata.section` without type validation. Given that `OrderMetadata` uses `[key: string]: any` (see TODO 118), these fields could contain any type, leading to runtime errors or XSS vulnerabilities if rendered without sanitization.

## Findings

**Location**: `client/src/hooks/useTableGrouping.ts:104-109`

**Current Implementation**:
```typescript
// Lines 104-109 (approximate)
const serverName = order.metadata?.serverName; // Could be any type!
const section = order.metadata?.section;       // No validation

// Later used in grouping logic and potentially rendered
```

**Impact**:
- Runtime errors if metadata contains wrong types (e.g., object instead of string)
- XSS vulnerability if metadata contains malicious HTML and is rendered
- Silent bugs: code assumes string, gets number/object/function
- Type coercion issues in comparisons

**Risk Level**: P2 IMPORTANT - Type safety and security issue

**Related Issues**:
- TODO 118: OrderMetadata uses `[key: string]: any`
- Must be fixed together for complete type safety

## Proposed Solutions

### Solution 1: Add Type Guard (Immediate Fix)
```typescript
function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

// In useTableGrouping
const serverName = isValidString(order.metadata?.serverName)
  ? order.metadata.serverName
  : undefined;

const section = isValidString(order.metadata?.section)
  ? order.metadata.section
  : undefined;
```

**Pros**:
- Immediate protection against wrong types
- Works with current `any` type
- Clear validation logic
- Can be applied independently

**Cons**:
- Still requires manual checking
- Doesn't fix root cause (TODO 118)

### Solution 2: Create Metadata Accessor (Recommended)
```typescript
// In shared/utils/metadata.ts
export function getMetadataString(
  metadata: OrderMetadata | undefined,
  key: keyof OrderMetadata
): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

// In useTableGrouping
const serverName = getMetadataString(order.metadata, 'serverName');
const section = getMetadataString(order.metadata, 'section');
```

**Pros**:
- Centralized validation logic
- Reusable across codebase
- Type-safe accessor pattern
- Easy to add sanitization later

**Cons**:
- Requires creating new utility
- Should be combined with TODO 118 fix

### Solution 3: Zod Schema Validation
```typescript
import { z } from 'zod';

const OrderMetadataSchema = z.object({
  serverName: z.string().optional(),
  section: z.string().optional(),
  notes: z.string().optional(),
}).passthrough(); // Allow extra fields

// Validate before use
const validatedMetadata = OrderMetadataSchema.parse(order.metadata);
```

**Pros**:
- Runtime type validation
- Catches errors early
- Self-documenting schema

**Cons**:
- Adds dependency (if not already used)
- Performance overhead on every access
- May throw errors that need handling

## Technical Details

**Files to Modify**:
- `client/src/hooks/useTableGrouping.ts` - Add type guards
- `shared/utils/metadata.ts` (new) - Create metadata accessor utilities
- Search for other metadata accesses: `grep -r "metadata\\.serverName" client/`

**Security Considerations**:
If metadata values are rendered in UI:
```typescript
import DOMPurify from 'dompurify'; // If not already available

function sanitizeMetadataString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }); // Strip all HTML
}
```

**Testing Requirements**:
- Test with string values (current behavior)
- Test with wrong types (number, object, null, undefined)
- Test with empty strings
- Test with HTML/script tags (XSS attempt)
- Verify grouping logic handles undefined gracefully

**Dependencies**:
- Should be coordinated with TODO 118 (OrderMetadata type fix)
- Consider fixing both in same PR for atomic type safety improvement

## Acceptance Criteria

- [ ] Add type guard or accessor for metadata.serverName
- [ ] Add type guard or accessor for metadata.section
- [ ] Search for and fix other unsafe metadata accesses
- [ ] Add unit tests for type guard/accessor
- [ ] Test with malformed metadata (wrong types)
- [ ] Verify no regression in table grouping functionality
- [ ] Document metadata access pattern for future developers
- [ ] Consider XSS sanitization if values are rendered

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | From code review of commit a699c6c6 |
| 2025-12-02 | Resolved | Added isValidString type guard and updated metadata access on lines 111-116 |
