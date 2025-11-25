# TODO-023: Replace 13 `any` Types in Realtime Menu Tools

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 023
- **Tags**: typescript, type-safety, voice, server, code-quality, code-review
- **Dependencies**: None
- **Created**: 2025-11-24
- **Source**: Code Review - Type Safety Analysis

---

## Problem Statement

`realtime-menu-tools.ts` contains 13 instances of the `any` type, violating the project's TypeScript strict mode requirement. This eliminates type safety for OpenAI function tool parameters, creating runtime error risk and making it difficult to validate voice ordering inputs.

---

## Findings

### Evidence Location
- `server/src/ai/functions/realtime-menu-tools.ts` - 13 instances of `any`
- Project rule: "TypeScript strict: No `any`, no type assertions without reason" (CLAUDE.md)

### Current Code (Uses `any`)
```typescript
// Line 54: Tool definition with any parameters
{
  type: 'function' as const,
  name: 'get_menu',
  description: 'Get the restaurant menu with all available items',
  parameters: {
    type: 'object',
    properties: {},
  },
},

// Line 124: Handler with any parameters
{
  name: 'add_to_order',
  handler: async (_args: any, _context: any) => { // ❌ any, any
    try {
      const { item_name, quantity, modifiers } = _args; // ❌ No type checking
      // ...
    }
  }
}

// Line 92: Handler with any parameters
{
  name: 'get_menu',
  handler: async (_args: any, _context: any) => { // ❌ any, any
    const menu = await getMenuContext(_context.restaurantId); // ❌ No validation
    // ...
  }
}
```

### Impact of Missing Types
```typescript
// Without types:
_args.item_name // ❌ Could be undefined, number, object, anything
_args.quantity // ❌ Could be string "5" instead of number 5
_args.modifiers // ❌ Could be malformed, missing properties

// With types:
args.item_name // ✅ Known to be string
args.quantity // ✅ Known to be number
args.modifiers // ✅ Known to be Array<{type: string, value: string}>
```

### Affected Tool Handlers (13 instances)
```typescript
// Tools using any:
1. get_menu - handler: (_args: any, _context: any)
2. add_to_order - handler: (_args: any, _context: any)
3. remove_from_order - handler: (_args: any, _context: any)
4. clear_order - handler: (_args: any, _context: any)
5. checkout - handler: (_args: any, _context: any)
6. get_order_total - handler: (_args: any, _context: any)
7. ... and 7 more
```

---

## Proposed Solutions

### Option A: Create Typed Interfaces for All Tool Parameters (Recommended)
**Pros**: Full type safety, compile-time validation, autocomplete
**Cons**: Must document all tool parameter structures
**Effort**: Medium (3-4 hours)
**Risk**: Low - purely additive, no behavior change

**Implementation**:
```typescript
// Create: server/src/ai/functions/types/tool-parameters.ts

export interface ToolContext {
  restaurantId: string;
  sessionId?: string;
  userId?: string;
}

export interface GetMenuArgs {
  // No parameters for get_menu
}

export interface AddToOrderArgs {
  item_name: string;
  quantity: number;
  modifiers?: Array<{
    type: 'size' | 'temperature' | 'preparation' | 'addon';
    value: string;
  }>;
  special_instructions?: string;
}

export interface RemoveFromOrderArgs {
  item_id: string;
}

export interface ClearOrderArgs {
  // No parameters for clear_order
}

export interface CheckoutArgs {
  payment_method?: 'cash' | 'card' | 'mobile';
  table_number?: string;
}

export interface GetOrderTotalArgs {
  // No parameters for get_order_total
}

// Generic tool handler type
export type ToolHandler<T = unknown> = (
  args: T,
  context: ToolContext
) => Promise<{ success: boolean; data?: any; error?: string }>;
```

**Usage in realtime-menu-tools.ts**:
```typescript
import {
  ToolContext,
  GetMenuArgs,
  AddToOrderArgs,
  RemoveFromOrderArgs,
  CheckoutArgs,
  ToolHandler,
} from './types/tool-parameters';

// Line 92: Typed get_menu handler
{
  name: 'get_menu',
  handler: async (_args: GetMenuArgs, _context: ToolContext) => { // ✅ Typed
    const menu = await getMenuContext(_context.restaurantId);
    return {
      success: true,
      data: { menu },
    };
  },
},

// Line 124: Typed add_to_order handler
{
  name: 'add_to_order',
  handler: async (args: AddToOrderArgs, context: ToolContext) => { // ✅ Typed
    const { item_name, quantity, modifiers } = args; // ✅ Type-safe

    // Validate quantity
    if (quantity < 1 || quantity > 100) { // ✅ TypeScript knows it's a number
      return { success: false, error: 'Invalid quantity' };
    }

    // Validate modifiers
    if (modifiers) {
      for (const mod of modifiers) { // ✅ TypeScript knows structure
        if (!mod.type || !mod.value) {
          return { success: false, error: 'Invalid modifier' };
        }
      }
    }

    // ... rest of handler
  },
},
```

### Option B: Use Zod Schema Validation
**Pros**: Runtime validation + type inference, catches invalid inputs
**Cons**: Additional dependency, more verbose
**Effort**: Medium (4-5 hours)
**Risk**: Low - widely used library

**Implementation**:
```typescript
import { z } from 'zod';

// Define schemas
const AddToOrderSchema = z.object({
  item_name: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(100),
  modifiers: z.array(
    z.object({
      type: z.enum(['size', 'temperature', 'preparation', 'addon']),
      value: z.string().min(1).max(50),
    })
  ).optional(),
  special_instructions: z.string().max(500).optional(),
});

type AddToOrderArgs = z.infer<typeof AddToOrderSchema>;

// Use in handler
handler: async (_args: any, _context: any) => {
  const args = AddToOrderSchema.parse(_args); // ✅ Runtime validation
  // args is now typed and validated
}
```

### Option C: Use `unknown` Instead of `any`
**Pros**: Forces type guards, better than any
**Cons**: Verbose, lots of type narrowing required
**Effort**: Low (2-3 hours)
**Risk**: Medium - could miss edge cases

---

## Recommended Action

**Option A** - Create typed interfaces for all tool parameters:

1. Create `server/src/ai/functions/types/tool-parameters.ts`
2. Define `ToolContext` interface (restaurantId, sessionId, userId)
3. Define typed interfaces for all 7 tool argument types
4. Define `ToolHandler<T>` generic type
5. Update all tool handlers to use typed parameters
6. Replace all `any` types with specific types
7. Add runtime validation for critical parameters (quantity, modifiers)
8. Run TypeScript compiler to catch type errors
9. Update tests to use typed mock arguments
10. Verify autocomplete works in IDE

---

## Technical Details

### Affected Files
- `server/src/ai/functions/realtime-menu-tools.ts` (replace 13 any types)
- `server/src/ai/functions/types/tool-parameters.ts` (new file, ~150 lines)
- `server/src/ai/functions/__tests__/realtime-menu-tools.test.ts` (update mocks)

### Tool Parameter Interfaces to Define
```typescript
1. ToolContext (shared context)
2. GetMenuArgs
3. AddToOrderArgs
4. RemoveFromOrderArgs
5. ClearOrderArgs
6. CheckoutArgs
7. GetOrderTotalArgs
8. UpdateQuantityArgs (if exists)
9. ApplyDiscountArgs (if exists)
10. ToolHandler<T> (generic handler type)
```

### Type Safety Benefits
```typescript
// Before (any):
handler: async (_args: any, _context: any) => {
  const quantity = _args.quantity; // Could be "5" (string)
  const total = quantity * 10; // "5" * 10 = 50 (works but wrong)
}

// After (typed):
handler: async (args: AddToOrderArgs, context: ToolContext) => {
  const quantity = args.quantity; // ✅ Known to be number
  const total = quantity * 10; // ✅ Type-safe math
}
```

### Runtime Validation
```typescript
// Add validation for critical parameters
function validateAddToOrderArgs(args: AddToOrderArgs): void {
  if (args.quantity < 1 || args.quantity > 100) {
    throw new Error('Quantity must be between 1 and 100');
  }

  if (args.item_name.length < 1 || args.item_name.length > 100) {
    throw new Error('Item name invalid');
  }

  if (args.modifiers) {
    for (const mod of args.modifiers) {
      if (!['size', 'temperature', 'preparation', 'addon'].includes(mod.type)) {
        throw new Error(`Invalid modifier type: ${mod.type}`);
      }
    }
  }
}
```

### Generic Handler Type
```typescript
// Reusable handler signature
export type ToolHandler<TArgs = unknown, TData = any> = (
  args: TArgs,
  context: ToolContext
) => Promise<{
  success: boolean;
  data?: TData;
  error?: string;
}>;

// Usage:
const addToOrderHandler: ToolHandler<AddToOrderArgs, { orderId: string }> = async (
  args,
  context
) => {
  // Fully typed args and return value
};
```

---

## Acceptance Criteria

- [ ] `tool-parameters.ts` file created with all parameter type definitions
- [ ] All 13 `any` types replaced with specific types
- [ ] `ToolContext` interface defined (restaurantId, sessionId, userId)
- [ ] All 7+ tool argument interfaces defined
- [ ] `ToolHandler<T>` generic type defined
- [ ] All tool handlers use typed parameters
- [ ] Runtime validation added for quantity, modifiers, item_name
- [ ] TypeScript compilation succeeds with no errors
- [ ] IDE autocomplete works for tool parameters
- [ ] Unit tests updated to use typed mock arguments
- [ ] No remaining `any` types in realtime-menu-tools.ts

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From code review type safety analysis |

---

## Resources

- [TypeScript Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
- [TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Zod Schema Validation](https://zod.dev/) (if Option B chosen)
- Project Rule: CLAUDE.md "TypeScript strict: No `any`"

---

## Notes

This is a P1 issue because:
1. Violates explicit project rule (no `any` types)
2. Eliminates type safety for voice ordering tools
3. Makes input validation harder (no compile-time checks)
4. Medium effort with low risk (purely additive)
5. Prevents future runtime errors from invalid voice inputs
6. Pairs well with TODO-016 (modifier input validation)

Consider combining with Zod validation for strongest type safety (compile-time + runtime).
