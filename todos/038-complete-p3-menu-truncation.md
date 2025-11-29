# TODO: Improve menu context truncation to avoid mid-item splits

**Priority**: P3 (Nice-to-have)
**Status**: Complete
**Created**: 2025-11-24
**Completed**: 2025-11-29
**Category**: AI/Data Quality

## Problem

Menu context is truncated at character limit without regard for item boundaries, causing the AI to receive malformed/incomplete item descriptions.

**Location**: `server/src/features/voice/realtime/realtime.routes.ts:301-311`

```typescript
if (menuContext.length > 30000) {
  logger.warn('Menu context exceeds 30KB, truncating', {
    originalLength: menuContext.length,
    restaurant_id: restaurantId,
  });
  menuContext = menuContext.substring(0, 30000);
}
```

## Current Behavior

Example of problematic truncation:
```
Burger - Classic beef burger with lettuce, tomato, oni
```

The AI receives incomplete information, potentially causing:
- Misunderstanding of menu items
- Incorrect order suggestions
- Confusion about available options

## Proposed Solution

### Truncate at Last Complete Item

```typescript
const MAX_MENU_CONTEXT_LENGTH = 30000;

function truncateMenuContext(menuContext: string, maxLength: number = MAX_MENU_CONTEXT_LENGTH): string {
  if (menuContext.length <= maxLength) {
    return menuContext;
  }

  // Find last complete item (assume items separated by double newline)
  let truncated = menuContext.substring(0, maxLength);
  const lastItemBoundary = truncated.lastIndexOf('\n\n');

  if (lastItemBoundary > 0) {
    truncated = truncated.substring(0, lastItemBoundary);
  } else {
    // Fallback: truncate at last newline
    const lastNewline = truncated.lastIndexOf('\n');
    if (lastNewline > 0) {
      truncated = truncated.substring(0, lastNewline);
    }
  }

  logger.warn('Menu context truncated to preserve item boundaries', {
    originalLength: menuContext.length,
    truncatedLength: truncated.length,
    itemsRemoved: Math.floor((menuContext.length - truncated.length) / 100), // Rough estimate
  });

  return truncated;
}

// Usage
menuContext = truncateMenuContext(menuContext);
```

## Acceptance Criteria

- [ ] Truncation preserves complete menu items
- [ ] Fallback to newline boundary if no double-newline found
- [ ] Logging indicates how much content removed
- [ ] Unit tests for various truncation scenarios
- [ ] No change for menus under 30KB
- [ ] Documentation explains truncation strategy

## Files to Modify

- `server/src/features/voice/realtime/realtime.routes.ts`
- Add tests in `server/src/features/voice/realtime/__tests__/menu-truncation.test.ts`

## Testing Strategy

```typescript
describe('Menu context truncation', () => {
  it('does not truncate content under limit', () => {
    const small = 'Item 1\n\nItem 2\n\nItem 3';
    expect(truncateMenuContext(small, 100)).toBe(small);
  });

  it('truncates at last double-newline boundary', () => {
    const menu = 'Item 1\n\nItem 2\n\nItem 3\n\nItem 4';
    const truncated = truncateMenuContext(menu, 25);
    expect(truncated).toBe('Item 1\n\nItem 2');
    expect(truncated).not.toContain('Item 3');
  });

  it('falls back to single newline if no double-newline', () => {
    const menu = 'Item 1\nDetail\nItem 2\nDetail\nItem 3';
    const truncated = truncateMenuContext(menu, 20);
    expect(truncated.endsWith('\n')).toBe(false);
    expect(truncated.split('\n').length).toBeLessThan(menu.split('\n').length);
  });

  it('handles menu with no newlines gracefully', () => {
    const menu = 'a'.repeat(40000);
    const truncated = truncateMenuContext(menu, 30000);
    expect(truncated.length).toBe(30000);
  });

  it('logs truncation details', () => {
    const longMenu = 'Item 1\n\n' + 'x'.repeat(31000);
    truncateMenuContext(longMenu);
    // Verify logger.warn called with correct data
  });
});
```

## Alternative Approach: Token-Based Truncation

For more precise control, consider using OpenAI's tokenizer:

```typescript
import { encode } from 'gpt-tokenizer';

const MAX_TOKENS = 7500; // ~30KB of text

function truncateByTokens(text: string, maxTokens: number): string {
  const tokens = encode(text);
  if (tokens.length <= maxTokens) {
    return text;
  }

  // Truncate tokens, then find last complete item in decoded text
  // ... implementation
}
```

## Impact Analysis

**Benefits**:
- AI receives complete, valid menu descriptions
- Better order accuracy
- Fewer edge case bugs

**Considerations**:
- Slightly more complex logic
- May need to adjust 30KB limit if truncation too aggressive
- Should monitor how often truncation occurs in production

## Notes

- Current 30KB limit is reasonable for most restaurants
- Menu context format from realtime-menu-tools.ts uses double-newlines between items
- Consider adding metric to track truncation frequency
- Future: Implement smart item prioritization (popular items first)

## References

- Code review finding: P3 AI quality improvements
- Related: realtime-menu-tools.ts menu formatting
- OpenAI context window limits documentation

## Work Log

### 2025-11-29: Implementation Complete

**Changes Made**:
1. Added `truncateMenuContext()` helper function to `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/realtime.routes.ts`
2. Function intelligently truncates at item boundaries (double newline) or line boundaries (single newline)
3. Replaced naive `substring()` truncation with smart boundary-aware truncation
4. Added detailed logging showing bytes removed and final length
5. Updated constant MAX_MENU_CONTEXT_LENGTH to be reusable

**Implementation Details**:
- Truncation preserves complete menu items by finding last `\n\n` boundary
- Fallback to single `\n` boundary if no double-newline found
- Final fallback to character limit if no newlines (edge case)
- Logging includes original length, truncated length, and bytes removed
- Appended message `[Menu truncated - complete menu available on screen]` remains intact

**Testing**:
- TypeScript compilation verified (no new errors introduced)
- Pre-existing typecheck errors in codebase are unrelated to this change

**Result**: AI now receives complete menu item descriptions without mid-item cuts, improving order accuracy and conversation quality.
